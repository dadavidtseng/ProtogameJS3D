//----------------------------------------------------------------------------------------------------
// JSGameLogicJob.hpp
// Phase 1: Async Architecture - JavaScript Worker Thread Job
//
// Purpose:
//   Executes JavaScript game logic on a dedicated worker thread, isolated from main render thread.
//   Enables fault-tolerant async architecture where JavaScript failures don't impact 60 FPS rendering.
//
// Design Rationale:
//   - Continuous worker thread (Solution A): Maintains V8 isolate state across frames
//   - Frame-based execution: Main thread triggers worker, worker signals completion
//   - Conditional variable synchronization: Efficient wake-up, no busy polling
//   - Graceful shutdown: Clean V8 isolate termination, thread join
//
// Thread Safety Model:
//   - Worker Thread: Executes JavaScript, writes to back entity buffer, submits render commands
//   - Main Thread: Triggers frame execution, waits for completion, swaps buffers
//   - Synchronization: std::mutex + std::condition_variable for frame events
//   - V8 Thread Safety: v8::Locker protects all V8 API calls
//
// Performance Characteristics:
//   - Worker execution: 0-30ms (variable, JavaScript-dependent)
//   - Main thread: Stable 60 FPS (16.67ms ± 2ms)
//   - Frame skip tolerance: Main thread continues with last state if worker slow
//
// Error Isolation (Phase 3 Target):
//   - JavaScript crash: Worker thread exits, main thread continues rendering
//   - Hot-reload failure: Graceful rollback, no engine crash
//   - Timeout detection: Main thread detects hung worker, renders last known state
//
// Author: Phase 1 - Async Architecture Implementation
// Date: 2025-10-17
//----------------------------------------------------------------------------------------------------

#pragma once

//----------------------------------------------------------------------------------------------------
#include "Engine/Core/JobSystem.hpp"
#include "Engine/Entity/EntityStateBuffer.hpp"

#include <atomic>
#include <condition_variable>
#include <mutex>

//----------------------------------------------------------------------------------------------------
// Forward Declarations
//----------------------------------------------------------------------------------------------------
class IJSGameLogicContext;  // Abstract interface for JavaScript execution context
class CallbackQueue;        // Phase 2.3: Lock-free callback queue for async callback processing

namespace v8 {
class Isolate;
class TryCatch;
template<class T> class Local;
class Context;
}

//----------------------------------------------------------------------------------------------------
// JSGameLogicJob
//
// Worker thread job for asynchronous JavaScript game logic execution.
// Integrates with JobSystem for cross-platform threading.
//
// Lifecycle:
//   1. Construction: Initialize synchronization primitives
//   2. Submission: Submit to JobSystem worker thread
//   3. Execution Loop:
//      a. Wait for main thread trigger (frame start)
//      b. Execute JavaScript game logic (update/render)
//      c. Signal frame completion
//      d. Repeat until shutdown requested
//   4. Shutdown: Exit loop, clean up V8 resources
//
// Usage Pattern:
//
// Initialization (Main Thread):
//   JSGameLogicJob* job = new JSGameLogicJob(gameContext, entityBuffer, callbackQueue);
//   g_jobSystem->QueueJob(job);  // Submit to worker thread
//
// Frame Execution (Main Thread):
//   if (job->IsFrameComplete()) {
//       entityBuffer->SwapBuffers();  // Swap to new game state
//       job->TriggerNextFrame();      // Start next JavaScript frame
//   }
//   // Continue rendering with current front buffer (60 FPS maintained)
//
// Shutdown (Main Thread):
//   job->RequestShutdown();           // Signal worker to exit
//   while (!job->IsShutdownComplete()) {
//       std::this_thread::sleep_for(10ms);  // Wait for clean exit
//   }
//   delete job;
//
// Thread Safety:
//   - All public methods are thread-safe (protected by m_mutex)
//   - V8 API calls protected by v8::Locker
//   - Synchronization via std::condition_variable (no busy polling)
//----------------------------------------------------------------------------------------------------
class JSGameLogicJob : public Job
{
public:
	//------------------------------------------------------------------------------------------------
	// Construction / Destruction
	//------------------------------------------------------------------------------------------------

	// Constructor
	// Parameters:
	//   - context: Interface to game-specific JavaScript execution context
	//   - entityBuffer: Double-buffered entity state for rendering isolation
	//   - callbackQueue: Callback queue for async JavaScript callback processing (Phase 2.3)
	//
	// Thread Safety: Call from main thread only
	JSGameLogicJob(IJSGameLogicContext* context, EntityStateBuffer* entityBuffer, CallbackQueue* callbackQueue);

	// Destructor
	// Ensures clean shutdown if not already performed
	// Warning: Should call RequestShutdown() and wait for completion before destruction
	~JSGameLogicJob() override;

	// Non-copyable, non-movable (contains mutex and condition variables)
	JSGameLogicJob(JSGameLogicJob const&)            = delete;
	JSGameLogicJob& operator=(JSGameLogicJob const&) = delete;
	JSGameLogicJob(JSGameLogicJob&&)                 = delete;
	JSGameLogicJob& operator=(JSGameLogicJob&&)      = delete;

	//------------------------------------------------------------------------------------------------
	// Job Interface Override
	//------------------------------------------------------------------------------------------------

	// Main worker thread execution entry point
	// Runs continuous frame loop until shutdown requested
	// Thread Safety: Executed by JobSystem worker thread
	void Execute() override;

	//------------------------------------------------------------------------------------------------
	// Main Thread API (Frame Synchronization)
	//------------------------------------------------------------------------------------------------

	// Trigger next frame execution on worker thread
	// Wakes worker thread from conditional wait, starts JavaScript update
	//
	// Precondition: Previous frame must be complete (check IsFrameComplete())
	// Thread Safety: Call from main thread only
	void TriggerNextFrame();

	// Check if current frame execution is complete
	// Returns:
	//   true  - JavaScript finished, safe to swap buffers
	//   false - JavaScript still executing, continue with last state
	//
	// Thread Safety: Safe to call from main thread
	bool IsFrameComplete() const;

	// Request graceful worker thread shutdown
	// Worker will exit after completing current frame
	//
	// Thread Safety: Safe to call from main thread
	void RequestShutdown();

	// Check if worker thread has completed shutdown
	// Returns:
	//   true  - Worker thread exited, safe to delete job
	//   false - Worker still running, wait before deletion
	//
	// Thread Safety: Safe to call from main thread
	bool IsShutdownComplete() const;

	//------------------------------------------------------------------------------------------------
	// Monitoring / Debugging
	//------------------------------------------------------------------------------------------------

	// Get total frames executed by worker thread
	uint64_t GetTotalFrames() const { return m_totalFrames.load(std::memory_order_relaxed); }

	// Get worker thread execution state (for debugging)
	bool IsWorkerIdle() const { return !m_frameRequested.load(std::memory_order_relaxed); }

private:
	//------------------------------------------------------------------------------------------------
	// Worker Thread Implementation
	//------------------------------------------------------------------------------------------------

	// Execute single JavaScript frame (called from worker thread)
	// Calls into JavaScript update/render systems
	//
	// Thread Safety: Protected by v8::Locker
	void ExecuteJavaScriptFrame();

	// Initialize V8 thread-local data (called once at worker thread startup)
	// Thread Safety: Worker thread only, no locking needed
	void InitializeWorkerThreadV8();

	// Phase 3.2: Handle V8 exception during JavaScript execution
	// Extracts error message and stack trace, forwards to Game::HandleJSException()
	// Thread Safety: Worker thread only, v8::Locker must be held
	void HandleV8Exception(v8::TryCatch& tryCatch, v8::Local<v8::Context> context, char const* phase);

	//------------------------------------------------------------------------------------------------
	// Dependencies (Injected via Constructor)
	//------------------------------------------------------------------------------------------------
	IJSGameLogicContext* m_context;         // Interface to JavaScript execution context
	EntityStateBuffer*   m_entityBuffer;    // Entity state output buffer
	CallbackQueue*       m_callbackQueue;    // Callback queue for async callback processing (Phase 2.3)

	//------------------------------------------------------------------------------------------------
	// Frame Synchronization (Main ↔ Worker Communication)
	//------------------------------------------------------------------------------------------------
	mutable std::mutex              m_mutex;              // Protects all state variables
	std::condition_variable         m_frameStartCV;       // Worker waits for frame trigger
	std::condition_variable         m_frameCompleteCV;    // Main waits for frame completion (future)

	std::atomic<bool>               m_frameRequested;     // Main → Worker: Start frame
	std::atomic<bool>               m_frameComplete;      // Worker → Main: Frame finished
	std::atomic<bool>               m_shutdownRequested;  // Main → Worker: Exit loop
	std::atomic<bool>               m_shutdownComplete;   // Worker → Main: Thread exited

	//------------------------------------------------------------------------------------------------
	// Statistics
	//------------------------------------------------------------------------------------------------
	std::atomic<uint64_t>           m_totalFrames;        // Total frames executed (profiling)

	//------------------------------------------------------------------------------------------------
	// V8 Thread-Local State
	//------------------------------------------------------------------------------------------------
	v8::Isolate*                    m_isolate;            // V8 isolate handle (set in Execute())
};

//----------------------------------------------------------------------------------------------------
// Design Notes
//
// Continuous Worker Thread (Solution A) vs Frame-Based Job Submission (Solution B):
//
//   Solution A (Chosen):
//     Pros:
//       - Maintains V8 isolate state across frames (no reinitialization)
//       - Lower overhead (no thread creation/destruction per frame)
//       - Simpler error recovery (isolate state persists)
//
//     Cons:
//       - Worker thread always allocated (memory overhead)
//       - Requires explicit shutdown mechanism
//
//   Solution B (Rejected):
//     Pros:
//       - Worker thread released when idle (memory efficiency)
//       - No shutdown complexity
//
//     Cons:
//       - V8 isolate reinitialization overhead per frame
//       - Complex state management across frames
//       - Higher latency for frame start
//
// Frame Synchronization Strategy:
//
//   Phase 1 (Current):
//     - Main thread: Fire-and-forget trigger, no blocking
//     - Worker thread: Signal completion, main polls IsFrameComplete()
//     - Benefit: Main thread never blocks, stable 60 FPS
//
//   Phase 3 (Future - Timeout Detection):
//     - Main thread: Detect hung worker (IsFrameComplete() false for > 500ms)
//     - Fallback: Continue rendering with last known state
//     - Recovery: Kill worker, restart with fresh isolate
//
// V8 Thread Safety Requirements:
//
//   Critical: ALL V8 API calls must be protected by v8::Locker
//
//   Worker Thread (JSGameLogicJob::Execute()):
//     - v8::Locker locker(m_isolate);  // Acquire V8 lock
//     - v8::Isolate::Scope isolateScope(m_isolate);
//     - ... V8 API calls (safe within locker scope) ...
//
//   Main Thread (ScriptSubsystem methods):
//     - v8::Locker locker(g_scriptSubsystem->GetIsolate());
//     - v8::Isolate::Scope isolateScope(isolate);
//     - ... V8 API calls (safe within locker scope) ...
//
//   Failure Mode:
//     - Missing v8::Locker → Crash with "V8 isolate accessed from wrong thread"
//     - Detection: Thread Sanitizer (TSan) or V8 debug builds
//
// Performance Validation (Phase 1 Acceptance Criteria):
//
//   - Main thread: Stable 60 FPS (16.67ms ± 2ms) regardless of JavaScript execution time
//   - Worker thread: Variable 0-30ms per frame (JavaScript-dependent)
//   - Frame skip tolerance: Main continues rendering if worker > 16.67ms
//   - No frame drops during typical gameplay
//
// Error Isolation Strategy (Phase 3):
//
//   JavaScript Exception:
//     - Worker catches exception, logs error, signals frame complete
//     - Main thread: Renders last known good state
//     - Recovery: Next frame attempts execution (hot-reload may fix)
//
//   JavaScript Hang:
//     - Main thread: Detect timeout (IsFrameComplete() false for > 500ms)
//     - Action: Log error, continue rendering last state
//     - Recovery: Kill worker thread, restart with fresh isolate
//
//   Hot-Reload Failure:
//     - Worker catches reload exception, rolls back to previous script
//     - Main thread: Unaffected, continues rendering
//     - User notification: Console error, visual indicator
//----------------------------------------------------------------------------------------------------
