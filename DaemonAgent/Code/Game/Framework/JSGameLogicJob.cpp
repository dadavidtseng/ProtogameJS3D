//----------------------------------------------------------------------------------------------------
// JSGameLogicJob.cpp
// Phase 1: Async Architecture - JavaScript Worker Thread Job Implementation
//----------------------------------------------------------------------------------------------------

#include "Game/Framework/JSGameLogicJob.hpp"

#include "Engine/Script/IJSGameLogicContext.hpp"
#include "Engine/Core/ErrorWarningAssert.hpp"
#include "Engine/Core/LogSubsystem.hpp"
#include "Engine/Core/EngineCommon.hpp"
#include "Engine/Script/ScriptSubsystem.hpp"
#include "Engine/Core/Clock.hpp"

// Suppress V8 header warnings (unreferenced formal parameters, etc.)
#pragma warning(push)
#pragma warning(disable: 4100)  // 'identifier': unreferenced formal parameter
#pragma warning(disable: 4127)  // conditional expression is constant
#pragma warning(disable: 4324)  // 'structname': structure was padded due to alignment specifier
#include <v8.h>
#pragma warning(pop)

#include <thread>
#include <chrono>

//----------------------------------------------------------------------------------------------------
// Constructor
//
// Initializes synchronization primitives and dependencies.
//----------------------------------------------------------------------------------------------------
JSGameLogicJob::JSGameLogicJob(IJSGameLogicContext* context,
                               EntityStateBuffer*   entityBuffer,
                               CallbackQueue*       callbackQueue)
    : m_context(context),
      m_entityBuffer(entityBuffer),
      m_callbackQueue(callbackQueue),
      m_frameRequested(false),
      m_frameComplete(true),   // Initially complete (ready for first frame)
      m_shutdownRequested(false),
      m_shutdownComplete(false),
      m_totalFrames(0),
      m_isolate(nullptr)
{
    // Validate dependencies
    if (!m_context)
    {
        ERROR_AND_DIE("JSGameLogicJob: IJSGameLogicContext pointer cannot be null");
    }
    if (!m_entityBuffer)
    {
        ERROR_AND_DIE("JSGameLogicJob: EntityStateBuffer pointer cannot be null");
    }
    if (!m_callbackQueue)
    {
        ERROR_AND_DIE("JSGameLogicJob: CallbackQueue pointer cannot be null");
    }

    DAEMON_LOG(LogScript, eLogVerbosity::Log, "JSGameLogicJob: Initialized (ready for worker thread execution)");
}

//----------------------------------------------------------------------------------------------------
// Destructor
//
// Ensures clean shutdown warning if not properly shut down.
//----------------------------------------------------------------------------------------------------
JSGameLogicJob::~JSGameLogicJob()
{
    // Warn if shutdown was not requested
    if (!m_shutdownComplete.load(std::memory_order_relaxed))
    {
        DAEMON_LOG(LogScript, eLogVerbosity::Warning,
                   "JSGameLogicJob: Destroyed without proper shutdown (call RequestShutdown() and wait for completion)");
    }

    DAEMON_LOG(LogScript, eLogVerbosity::Log,
               Stringf("JSGameLogicJob: Destroyed - Total frames executed: %llu",
                   m_totalFrames.load(std::memory_order_relaxed)));
}

//----------------------------------------------------------------------------------------------------
// Execute (Job Interface Override)
//
// Main worker thread execution loop.
// Runs continuously until shutdown requested.
//
// Algorithm:
//   1. Initialize V8 thread-local data
//   2. Loop:
//      a. Wait for frame trigger (conditional variable)
//      b. Execute JavaScript frame
//      c. Signal frame completion
//      d. Check shutdown flag
//   3. Clean up and exit
//
// Thread Safety:
//   - Executed by JobSystem worker thread
//   - All V8 API calls protected by v8::Locker
//   - Synchronization via std::mutex + std::condition_variable
//----------------------------------------------------------------------------------------------------
void JSGameLogicJob::Execute()
{
    DAEMON_LOG(LogScript, eLogVerbosity::Display, "JSGameLogicJob: Worker thread started");

    // Initialize V8 thread-local state
    InitializeWorkerThreadV8();

    // Main worker loop
    while (!m_shutdownRequested.load(std::memory_order_relaxed))
    {
        // Wait for frame trigger from main thread
        {
            std::unique_lock lock(m_mutex);
            m_frameStartCV.wait(lock, [this]()
            {
                return m_frameRequested.load(std::memory_order_relaxed) ||
                    m_shutdownRequested.load(std::memory_order_relaxed);
            });

            // Exit if shutdown requested
            if (m_shutdownRequested.load(std::memory_order_relaxed))
            {
                break;
            }

            // Clear frame request flag
            m_frameRequested.store(false, std::memory_order_relaxed);
            m_frameComplete.store(false, std::memory_order_relaxed);
        }

        // Execute JavaScript frame (outside lock to avoid blocking main thread)
        ExecuteJavaScriptFrame();

        // Signal frame completion
        {
            std::lock_guard lock(m_mutex);
            m_frameComplete.store(true, std::memory_order_release);
            m_frameCompleteCV.notify_one();
        }

        // Increment frame counter
        m_totalFrames.fetch_add(1, std::memory_order_relaxed);
    }

    // Signal shutdown complete
    m_shutdownComplete.store(true, std::memory_order_release);

    DAEMON_LOG(LogScript, eLogVerbosity::Display,
               Stringf("JSGameLogicJob: Worker thread exited - Total frames: %llu",
                   m_totalFrames.load(std::memory_order_relaxed)));
}

//----------------------------------------------------------------------------------------------------
// TriggerNextFrame (Main Thread API)
//
// Wakes worker thread to start next JavaScript frame execution.
//
// Precondition: Previous frame must be complete (check IsFrameComplete())
// Thread Safety: Call from main thread only
//----------------------------------------------------------------------------------------------------
void JSGameLogicJob::TriggerNextFrame()
{
    std::lock_guard lock(m_mutex);

    // Warn if triggering before previous frame complete (indicates timing issue)
    if (!m_frameComplete.load(std::memory_order_relaxed))
    {
        DAEMON_LOG(LogScript, eLogVerbosity::Warning,
                   "JSGameLogicJob: TriggerNextFrame() called before previous frame complete (frame skip)");
    }

    // Set frame request flag and wake worker thread
    m_frameRequested.store(true, std::memory_order_relaxed);
    m_frameStartCV.notify_one();
}

//----------------------------------------------------------------------------------------------------
// IsFrameComplete (Main Thread API)
//
// Checks if worker thread has completed current frame execution.
//
// Returns:
//   true  - JavaScript finished, safe to swap buffers
//   false - JavaScript still executing, continue with last state
//
// Thread Safety: Safe to call from main thread
//----------------------------------------------------------------------------------------------------
bool JSGameLogicJob::IsFrameComplete() const
{
    return m_frameComplete.load(std::memory_order_acquire);
}

//----------------------------------------------------------------------------------------------------
// RequestShutdown (Main Thread API)
//
// Signals worker thread to exit gracefully after completing current frame.
//
// Thread Safety: Safe to call from main thread
//----------------------------------------------------------------------------------------------------
void JSGameLogicJob::RequestShutdown()
{
    DAEMON_LOG(LogScript, eLogVerbosity::Log, "JSGameLogicJob: Shutdown requested");

    {
        std::lock_guard lock(m_mutex);
        m_shutdownRequested.store(true, std::memory_order_relaxed);
        m_frameStartCV.notify_one();  // Wake worker if waiting
    }
}

//----------------------------------------------------------------------------------------------------
// IsShutdownComplete (Main Thread API)
//
// Checks if worker thread has completed shutdown.
//
// Returns:
//   true  - Worker thread exited, safe to delete job
//   false - Worker still running, wait before deletion
//
// Thread Safety: Safe to call from main thread
//----------------------------------------------------------------------------------------------------
bool JSGameLogicJob::IsShutdownComplete() const
{
    return m_shutdownComplete.load(std::memory_order_acquire);
}

//----------------------------------------------------------------------------------------------------
// ExecuteJavaScriptFrame (Worker Thread Implementation)
//
// Executes single JavaScript frame (update + render logic).
// Calls into Game::UpdateJS() and Game::RenderJS() methods.
//
// Thread Safety:
//   - Protected by v8::Locker (CRITICAL for multi-threaded V8 access)
//   - Writes to back entity buffer (safe, main thread reads front buffer)
//   - Submits render commands to queue (lock-free SPSC queue)
//
// Error Handling (Phase 3.2):
//   - v8::TryCatch wraps JavaScript execution for exception handling
//   - Error isolation: JavaScript errors don't crash C++ worker thread
//   - Stack trace extraction for debugging
//   - Recovery: Signal frame complete, allow next frame to proceed
//----------------------------------------------------------------------------------------------------
void JSGameLogicJob::ExecuteJavaScriptFrame()
{
    // CRITICAL: Acquire V8 lock before ANY V8 API calls
    // Without this lock, multi-threaded V8 access will crash
    v8::Locker         locker(m_isolate);
    v8::Isolate::Scope isolateScope(m_isolate);

    // Phase 3.2: Get context for V8 exception handling
    v8::HandleScope    handleScope(m_isolate);
    v8::Local<v8::Context> context = m_isolate->GetCurrentContext();

    // Phase 3.2: Set up v8::TryCatch for JavaScript exception handling
    // This catches any V8 exceptions thrown during JavaScript execution
    v8::TryCatch tryCatch(m_isolate);

    // Execute JavaScript update logic
    // Phase 2.3: Call Game::UpdateJSWorkerThread() on worker thread to execute JavaScript
    // This calls JSEngine.update() which submits render commands
    if (m_context)
    {
        // Calculate deltaTime from system clock (matching UpdateJS() pattern)
        float const deltaTime = static_cast<float>(Clock::GetSystemClock().GetDeltaSeconds());

        // Execute JavaScript update on worker thread with proper parameters
        m_context->UpdateJSWorkerThread(deltaTime);

        // Phase 3.2: Check for JavaScript exceptions after update
        if (tryCatch.HasCaught())
        {
            HandleV8Exception(tryCatch, context, "UpdateJSWorkerThread");
            tryCatch.Reset();  // Clear exception state for render phase
        }

        // Execute JavaScript render logic on worker thread
        // This calls JSEngine.render() which submits render commands
        m_context->RenderJSWorkerThread(deltaTime);

        // Phase 3.2: Check for JavaScript exceptions after render
        if (tryCatch.HasCaught())
        {
            HandleV8Exception(tryCatch, context, "RenderJSWorkerThread");
            // No need to reset - we're done with this frame
        }
    }

    // Phase 3.2: Frame continues even if exceptions occurred
    // Main thread will receive frame complete signal and can continue
    // Next frame will retry JavaScript execution (hot-reload may fix issues)
}

//----------------------------------------------------------------------------------------------------
// InitializeWorkerThreadV8 (Worker Thread Implementation)
//
// Initializes V8 thread-local data structures.
// Called once at worker thread startup.
//
// Thread Safety: Worker thread only, no locking needed
//----------------------------------------------------------------------------------------------------
void JSGameLogicJob::InitializeWorkerThreadV8()
{
    // Get V8 isolate from ScriptSubsystem (created on main thread)
    // In multi-threaded V8, the same isolate can be accessed from multiple threads
    // with proper v8::Locker protection
    m_isolate = g_scriptSubsystem->GetIsolate();

    if (!m_isolate)
    {
        ERROR_AND_DIE("JSGameLogicJob: Failed to get V8 isolate from ScriptSubsystem");
    }

    DAEMON_LOG(LogScript, eLogVerbosity::Log,
               "JSGameLogicJob: V8 isolate initialized for worker thread");
}

//----------------------------------------------------------------------------------------------------
// HandleV8Exception (Phase 3.2 - Worker Thread)
//
// Extract JavaScript exception details from v8::TryCatch and forward to Game::HandleJSException().
//
// Parameters:
//   - tryCatch: V8 exception handler with caught exception
//   - context: V8 context for message extraction
//   - phase: String identifier for where exception occurred ("UpdateJSWorkerThread" or "RenderJSWorkerThread")
//
// Thread Safety:
//   - Called from worker thread with v8::Locker held
//   - Extracts exception message and stack trace from V8
//   - Forwards to Game::HandleJSException() for logging and recovery
//
// Recovery Behavior:
//   - Does NOT rethrow exception (fault isolation)
//   - Worker thread continues to next phase or frame
//   - Main thread continues rendering with last valid state
//----------------------------------------------------------------------------------------------------
void JSGameLogicJob::HandleV8Exception(v8::TryCatch& tryCatch,
                                       v8::Local<v8::Context> context,
                                       char const* phase)
{
    v8::HandleScope handleScope(m_isolate);

    // Extract exception message
    std::string errorMessage = "Unknown JavaScript error";
    v8::Local<v8::Value> exception = tryCatch.Exception();
    if (!exception.IsEmpty())
    {
        v8::String::Utf8Value exceptionUtf8(m_isolate, exception);
        if (*exceptionUtf8)
        {
            errorMessage = *exceptionUtf8;
        }
    }

    // Extract detailed error information from v8::Message
    std::string detailedMessage;
    v8::Local<v8::Message> message = tryCatch.Message();
    if (!message.IsEmpty())
    {
        // Get filename and line number
        v8::String::Utf8Value filename(m_isolate, message->GetScriptResourceName());
        int lineNum = message->GetLineNumber(context).FromMaybe(-1);
        int colNum = message->GetStartColumn(context).FromMaybe(-1);

        detailedMessage = StringFormat("[{}] {}:{}:{}: {}",
                                       phase,
                                       *filename ? *filename : "<unknown>",
                                       lineNum,
                                       colNum,
                                       errorMessage);

        // Get source line if available
        v8::MaybeLocal<v8::String> sourceLine = message->GetSourceLine(context);
        if (!sourceLine.IsEmpty())
        {
            v8::String::Utf8Value sourceLineUtf8(m_isolate, sourceLine.ToLocalChecked());
            if (*sourceLineUtf8)
            {
                detailedMessage += StringFormat("\n  Source: {}", *sourceLineUtf8);
            }
        }
    }
    else
    {
        detailedMessage = StringFormat("[{}] {}", phase, errorMessage);
    }

    // Extract stack trace
    std::string stackTrace;
    v8::MaybeLocal<v8::Value> maybeStackTrace = tryCatch.StackTrace(context);
    if (!maybeStackTrace.IsEmpty())
    {
        v8::Local<v8::Value> stackTraceValue = maybeStackTrace.ToLocalChecked();
        v8::String::Utf8Value stackTraceUtf8(m_isolate, stackTraceValue);
        if (*stackTraceUtf8)
        {
            stackTrace = *stackTraceUtf8;
        }
    }

    // Forward to Game::HandleJSException() for logging and recovery
    if (m_context)
    {
        m_context->HandleJSException(detailedMessage.c_str(), stackTrace.c_str());
    }
    else
    {
        // Fallback logging if context is not available
        DAEMON_LOG(LogScript, eLogVerbosity::Error,
                   StringFormat("JSGameLogicJob::HandleV8Exception - No context available\n{}\n{}",
                                detailedMessage, stackTrace));
    }
}

//----------------------------------------------------------------------------------------------------
// Implementation Notes
//
// V8 Thread Safety (CRITICAL):
//
//   v8::Locker Requirement:
//     - V8 isolates are single-threaded by default
//     - Multi-threaded access requires v8::Locker
//     - EVERY ExecuteJavaScriptFrame() call MUST acquire v8::Locker
//
//   Locking Pattern:
//     v8::Locker locker(isolate);              // Acquire V8 lock
//     v8::Isolate::Scope isolateScope(isolate);  // Enter isolate
//     // ... V8 API calls here (safe) ...
//
//   Failure Mode:
//     - Missing v8::Locker → Crash with "V8 isolate accessed from wrong thread"
//     - Detection: Thread Sanitizer (TSan) or V8 debug builds
//
// Frame Synchronization:
//
//   Main Thread Flow:
//     1. Check IsFrameComplete()
//     2. If complete: SwapBuffers(), TriggerNextFrame()
//     3. If not complete: Continue rendering with last state (frame skip tolerance)
//
//   Worker Thread Flow:
//     1. Wait for frame trigger (conditional variable)
//     2. Execute JavaScript frame
//     3. Signal frame completion
//     4. Repeat until shutdown
//
//   Benefits:
//     - Main thread never blocks (stable 60 FPS)
//     - Worker runs at variable speed (0-30ms)
//     - Frame skip tolerance (main uses last state if worker slow)
//
// Error Recovery Strategy (Phase 3):
//
//   JavaScript Exception:
//     - Catch in ExecuteJavaScriptFrame()
//     - Log error to console
//     - Signal frame complete (allow main thread to continue)
//     - Next frame: Retry execution (hot-reload may fix)
//
//   JavaScript Hang:
//     - Main thread: Detect timeout (IsFrameComplete() false for > 500ms)
//     - Action: Log error, continue rendering last state
//     - Recovery: Kill worker thread, restart with fresh isolate (Phase 3)
//
// Performance Profiling:
//
//   Metrics to Monitor:
//     - m_totalFrames: Frame execution count
//     - Frame duration: Time between TriggerNextFrame() and IsFrameComplete()
//     - Frame skip rate: Frames where IsFrameComplete() still false at next trigger
//
//   Optimization Targets (Phase 4):
//     - JavaScript frame duration: < 16.67ms for 60 FPS
//     - Frame skip rate: < 5% (acceptable for async architecture)
//     - Worker idle time: < 10% (efficient CPU utilization)
//
// Memory Safety:
//
//   Lifetimes:
//     - JSGameLogicJob: Created in App::Startup(), destroyed in App::Shutdown()
//     - m_game: Outlives JSGameLogicJob (guaranteed by App lifecycle)
//     - m_entityBuffer: Outlives JSGameLogicJob (created before, destroyed after)
//
//   Dangling Pointer Prevention:
//     - Main thread: Calls RequestShutdown(), waits for IsShutdownComplete()
//     - Worker thread: Exits gracefully, no resource access after shutdown
//     - Destruction: Only after worker thread exited
//----------------------------------------------------------------------------------------------------
