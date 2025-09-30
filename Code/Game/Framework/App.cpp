//----------------------------------------------------------------------------------------------------
// App.cpp
//----------------------------------------------------------------------------------------------------

//----------------------------------------------------------------------------------------------------
#include "Game/Framework/App.hpp"

#include <chrono>

#include "Engine/Audio/AudioSystem.hpp"
#include "Engine/Audio/AudioScriptInterface.hpp"
#include "Engine/Core/Clock.hpp"
#include "Engine/Core/DevConsole.hpp"
#include "Engine/Core/EngineCommon.hpp"
#include "Engine/Core/ErrorWarningAssert.hpp"
#include "Engine/Core/LogSubsystem.hpp"
#include "Engine/Input/InputSystem.hpp"
#include "Engine/Math/RandomNumberGenerator.hpp"
#include "Engine/Platform/Window.hpp"
#include "Engine/Renderer/BitmapFont.hpp"
#include "Engine/Renderer/DebugRenderSystem.hpp"
#include "Engine/Renderer/Renderer.hpp"
#include "Engine/Resource/ResourceSubsystem.hpp"
#include "Engine/Scripting/ScriptSubsystem.hpp"
#include "Game/Game.hpp"
#include "Game/Framework/GameCommon.hpp"

//----------------------------------------------------------------------------------------------------
App*                   g_app               = nullptr;       // Created and owned by Main_Windows.cpp
AudioSystem*           g_audio             = nullptr;       // Created and owned by the App
BitmapFont*            g_bitmapFont        = nullptr;       // Created and owned by the App
Game*                  g_game              = nullptr;       // Created and owned by the App
Renderer*              g_renderer          = nullptr;       // Created and owned by the App
RandomNumberGenerator* g_rng               = nullptr;       // Created and owned by the App
Window*                g_window            = nullptr;       // Created and owned by the App
ResourceSubsystem*     g_resourceSubsystem = nullptr;       // Created and owned by the App
ScriptSubsystem*       g_scriptSubsystem   = nullptr;       // Created and owned by the App

//----------------------------------------------------------------------------------------------------
STATIC bool App::m_isQuitting = false;

//----------------------------------------------------------------------------------------------------
void App::Startup()
{
    //-Start-of-EventSystem---------------------------------------------------------------------------

    sEventSystemConfig constexpr sEventSystemConfig;
    g_eventSystem = new EventSystem(sEventSystemConfig);
    g_eventSystem->SubscribeEventCallbackFunction("OnCloseButtonClicked", OnCloseButtonClicked);
    g_eventSystem->SubscribeEventCallbackFunction("quit", OnCloseButtonClicked);

    //-End-of-EventSystem-----------------------------------------------------------------------------
    //------------------------------------------------------------------------------------------------
    //-Start-of-InputSystem---------------------------------------------------------------------------

    sInputSystemConfig constexpr sInputSystemConfig;
    g_input = new InputSystem(sInputSystemConfig);

    //-End-of-InputSystem-----------------------------------------------------------------------------
    //------------------------------------------------------------------------------------------------
    //-Start-of-Window--------------------------------------------------------------------------------

    sWindowConfig sWindowConfig;
    sWindowConfig.m_windowType  = eWindowType::WINDOWED;
    sWindowConfig.m_aspectRatio = 2.f;
    sWindowConfig.m_inputSystem = g_input;
    sWindowConfig.m_windowTitle = "FirstV8";
    g_window                    = new Window(sWindowConfig);

    //-End-of-Window----------------------------------------------------------------------------------
    //------------------------------------------------------------------------------------------------
    //-Start-of-Renderer------------------------------------------------------------------------------

    sRendererConfig sRendererConfig;
    sRendererConfig.m_window = g_window;
    // ResourceSubsystem is now accessed globally - no dependency injection needed
    g_renderer = new Renderer(sRendererConfig);

    //-End-of-Renderer--------------------------------------------------------------------------------
    //------------------------------------------------------------------------------------------------
    //-Start-of-DebugRender---------------------------------------------------------------------------

    sDebugRenderConfig sDebugRenderConfig;
    sDebugRenderConfig.m_renderer = g_renderer;
    sDebugRenderConfig.m_fontName = "DaemonFont";

    //-End-of-DebugRender-----------------------------------------------------------------------------
    //------------------------------------------------------------------------------------------------
    //-Start-of-DevConsole----------------------------------------------------------------------------

    sDevConsoleConfig devConsoleConfig;
    devConsoleConfig.m_defaultRenderer = g_renderer;
    devConsoleConfig.m_defaultFontName = "DaemonFont";
    m_devConsoleCamera                 = new Camera();
    devConsoleConfig.m_defaultCamera   = m_devConsoleCamera;
    g_devConsole                       = new DevConsole(devConsoleConfig);

    g_devConsole->AddLine(DevConsole::INFO_MAJOR, "Controls");
    g_devConsole->AddLine(DevConsole::INFO_MINOR, "(Mouse) Aim");
    g_devConsole->AddLine(DevConsole::INFO_MINOR, "(W/A)   Move");
    g_devConsole->AddLine(DevConsole::INFO_MINOR, "(S/D)   Strafe");
    g_devConsole->AddLine(DevConsole::INFO_MINOR, "(Q/E)   Roll");
    g_devConsole->AddLine(DevConsole::INFO_MINOR, "(Z/C)   Elevate");
    g_devConsole->AddLine(DevConsole::INFO_MINOR, "(Shift) Sprint");
    g_devConsole->AddLine(DevConsole::INFO_MINOR, "(H)     Set Camera to Origin");
    g_devConsole->AddLine(DevConsole::INFO_MINOR, "(1)     Spawn Line");
    g_devConsole->AddLine(DevConsole::INFO_MINOR, "(2)     Spawn Point");
    g_devConsole->AddLine(DevConsole::INFO_MINOR, "(3)     Spawn Wireframe Sphere");
    g_devConsole->AddLine(DevConsole::INFO_MINOR, "(4)     Spawn Basis");
    g_devConsole->AddLine(DevConsole::INFO_MINOR, "(5)     Spawn Billboard Text");
    g_devConsole->AddLine(DevConsole::INFO_MINOR, "(6)     Spawn Wireframe Cylinder");
    g_devConsole->AddLine(DevConsole::INFO_MINOR, "(7)     Add Message");
    g_devConsole->AddLine(DevConsole::INFO_MINOR, "(~)     Toggle Dev Console");
    g_devConsole->AddLine(DevConsole::INFO_MINOR, "(ESC)   Exit Game");
    g_devConsole->AddLine(DevConsole::INFO_MINOR, "(SPACE) Start Game");

    //-End-of-DevConsole------------------------------------------------------------------------------
    //------------------------------------------------------------------------------------------------
    //-Start-of-LogSubsystem--------------------------------------------------------------------------

    sLogSubsystemConfig config;
    config.logFilePath      = "Logs/FirstV8.log";        // 日誌檔案路徑
    config.enableConsole    = true;                   // 啟用控制台輸出
    config.enableFile       = true;                      // 啟用檔案輸出
    config.enableDebugOut   = true;                  // 啟用 Visual Studio 輸出
    config.enableOnScreen   = true;                  // 啟用螢幕輸出
    config.enableDevConsole = true;                // 啟用開發者控制台輸出
    config.asyncLogging     = true;                    // 啟用非同步日誌
    config.maxLogEntries    = 50000;                  // 記憶體中最大日誌條目數
    config.timestampEnabled = true;               // 啟用時間戳記
    config.threadIdEnabled  = true;                 // 啟用執行緒 ID
    config.autoFlush        = false;                      // 不自動重新整理（效能考量）

    // Enhanced smart rotation settings
    config.enableSmartRotation = true;               // 啟用智能日誌輪轉 (Minecraft-style)
    config.rotationConfigPath  = "Data/Config/LogRotation.json"; // 輪轉配置檔案路徑

    // Configure Minecraft-style rotation settings
    config.smartRotationConfig.maxFileSizeBytes = 100 * 1024 * 1024;  // 100MB per file
    config.smartRotationConfig.maxTimeInterval  = std::chrono::hours(2); // 2 hours max per segment
    config.smartRotationConfig.logDirectory     = "Logs";                   // Log directory
    config.smartRotationConfig.currentLogName   = "latest.log";           // Current session log
    config.smartRotationConfig.sessionPrefix    = "session";               // Archive prefix

    g_logSubsystem = new LogSubsystem(config);

    //------------------------------------------------------------------------------------------------
    //-Start-of-AudioSystem---------------------------------------------------------------------------

    sAudioSystemConfig constexpr sAudioSystemConfig;
    g_audio = new AudioSystem(sAudioSystemConfig);

    //-End-of-AudioSystem-----------------------------------------------------------------------------
    //------------------------------------------------------------------------------------------------
    //-Start-of-ResourceSubsystem---------------------------------------------------------------------

    sResourceSubsystemConfig resourceSubsystemConfig;
    resourceSubsystemConfig.m_threadCount = 4;

    g_resourceSubsystem = new ResourceSubsystem(resourceSubsystemConfig);

    //-End-of-ResourceSubsystem-----------------------------------------------------------------------
    //------------------------------------------------------------------------------------------------
    //-Start-of-ScriptSubsystem-----------------------------------------------------------------------

    sScriptSubsystemConfig scriptConfig;
    scriptConfig.enableDebugging     = true;
    scriptConfig.heapSizeLimit       = 256;
    scriptConfig.enableConsoleOutput = true;
    scriptConfig.enableHotReload     = true;
    // Chrome DevTools Inspector Configuration
    scriptConfig.enableInspector = true;  // Enable Chrome DevTools integration
    scriptConfig.inspectorPort   = 9229;  // Chrome DevTools connection port
    scriptConfig.inspectorHost   = "127.0.0.1"; // Inspector server bind address
    scriptConfig.waitForDebugger = false; // Don't pause execution waiting for debugger
    g_scriptSubsystem            = new ScriptSubsystem(scriptConfig);

    //-End-of-ScriptSubsystem-------------------------------------------------------------------------
    //------------------------------------------------------------------------------------------------

    g_logSubsystem->Startup();
    g_eventSystem->Startup();
    g_window->Startup();

    g_renderer->Startup();
    ResourceSubsystem::Initialize(g_renderer);
    DebugRenderSystemStartup(sDebugRenderConfig);
    g_devConsole->StartUp();
    g_input->Startup();
    g_audio->Startup();
    g_resourceSubsystem->Startup();  // Keep the old instance for backward compatibility
    g_scriptSubsystem->Startup();

    g_logSubsystem->RegisterCategory("LogApp", eLogVerbosity::Log, eLogVerbosity::All);
    g_logSubsystem->RegisterCategory("LogGame", eLogVerbosity::Log, eLogVerbosity::All);

    // g_bitmapFont = g_renderer->CreateOrGetBitmapFontFromFile("Data/Fonts/DaemonFont"); // DO NOT SPECIFY FILE .EXTENSION!!  (Important later on.)
    g_bitmapFont = ResourceSubsystem::CreateOrGetBitmapFontFromFile("Data/Fonts/DaemonFont"); // DO NOT SPECIFY FILE .EXTENSION!!  (Important later on.)
    g_rng        = new RandomNumberGenerator();
    g_game       = new Game();
    SetupScriptingBindings();
    g_game->PostInit();
}

//----------------------------------------------------------------------------------------------------
// All Destroy and ShutDown process should be reverse order of the StartUp
//
void App::Shutdown()
{
    // Shutdown hot-reload system first
    if (g_scriptSubsystem)
    {
        g_scriptSubsystem->Shutdown();
        delete g_scriptSubsystem;
        g_scriptSubsystem = nullptr;
    }

    // 在其他清理程式碼之前新增：
    if (m_gameScriptInterface)
    {
        // if (g_v8Subsystem)
        // {
        //     g_v8Subsystem->UnregisterScriptableObject("game");
        // }
        m_gameScriptInterface.reset();
    }

    // Destroy all Engine Subsystem in reverse order
    GAME_SAFE_RELEASE(g_game);
    GAME_SAFE_RELEASE(g_rng);

    // Shutdown subsystems in reverse order of initialization
    g_audio->Shutdown();
    g_input->Shutdown();
    g_devConsole->Shutdown();

    GAME_SAFE_RELEASE(m_devConsoleCamera);

    DebugRenderSystemShutdown();

    // CRITICAL: Delete g_bitmapFont BEFORE ResourceSubsystem and Renderer shutdown
    // BitmapFont references Texture owned by Renderer, must be deleted while Renderer is still valid
    GAME_SAFE_RELEASE(g_bitmapFont);

    // Shutdown and delete ResourceSubsystem before Renderer
    if (g_resourceSubsystem)
    {
        g_resourceSubsystem->Shutdown();
        delete g_resourceSubsystem;
        g_resourceSubsystem = nullptr;
    }

    // Now shutdown Renderer which will release all textures including the BitmapFont texture
    g_renderer->Shutdown();
    g_window->Shutdown();
    g_eventSystem->Shutdown();

    GAME_SAFE_RELEASE(g_audio);
    GAME_SAFE_RELEASE(g_renderer);
    GAME_SAFE_RELEASE(g_window);
    GAME_SAFE_RELEASE(g_input);
    GAME_SAFE_RELEASE(g_devConsole);
    GAME_SAFE_RELEASE(g_eventSystem);

    // Shutdown and delete LogSubsystem last
    if (g_logSubsystem)
    {
        g_logSubsystem->Shutdown();
        delete g_logSubsystem;
        g_logSubsystem = nullptr;
    }
}

//----------------------------------------------------------------------------------------------------
// One "frame" of the game.  Generally: Input, Update, Render.  We call this 60+ times per second.
//
void App::RunFrame()
{
    BeginFrame();   // Engine pre-frame stuff
    Update();       // Game updates / moves / spawns / hurts / kills stuff
    Render();       // Game draws current state of things
    EndFrame();     // Engine post-frame stuff
}

//----------------------------------------------------------------------------------------------------
void App::RunMainLoop()
{
    // Program main loop; keep running frames until it's time to quit
    while (!m_isQuitting)
    {
        // Sleep(16); // Temporary code to "slow down" our app to ~60Hz until we have proper frame timing in
        RunFrame();
    }
}

//----------------------------------------------------------------------------------------------------
STATIC bool App::OnCloseButtonClicked(EventArgs& args)
{
    UNUSED(args)

    RequestQuit();

    return true;
}

//----------------------------------------------------------------------------------------------------
STATIC void App::RequestQuit()
{
    m_isQuitting = true;
}

//----------------------------------------------------------------------------------------------------
void App::BeginFrame() const
{
    g_eventSystem->BeginFrame();
    g_window->BeginFrame();
    g_renderer->BeginFrame();
    DebugRenderBeginFrame();
    g_devConsole->BeginFrame();
    g_input->BeginFrame();
    g_audio->BeginFrame();
}

//----------------------------------------------------------------------------------------------------
void App::Update()
{
    Clock::TickSystemClock();
    UpdateCursorMode();

    // Process pending hot-reload events on main thread (V8-safe)
    if (g_scriptSubsystem)
    {
        g_scriptSubsystem->Update();
    }

    g_game->UpdateJS();
}

//----------------------------------------------------------------------------------------------------
// Some simple OpenGL example drawing code.
// This is the graphical equivalent of printing "Hello, world."
//
// Ultimately this function (App::Render) will only call methods on Renderer (like Renderer::DrawVertexArray)
//	to draw things, never calling OpenGL (nor DirectX) functions directly.
//
void App::Render() const
{
    Rgba8 const clearColor = Rgba8::GREY;

    g_renderer->ClearScreen(clearColor, Rgba8::BLACK);
    g_game->RenderJS();

    AABB2 const box = AABB2(Vec2::ZERO, Vec2(1600.f, 30.f));

    g_devConsole->Render(box);
}

//----------------------------------------------------------------------------------------------------
void App::EndFrame() const
{
    g_eventSystem->EndFrame();
    g_window->EndFrame();
    g_renderer->EndFrame();
    DebugRenderEndFrame();
    g_devConsole->EndFrame();
    g_input->EndFrame();
    g_audio->EndFrame();
}

//----------------------------------------------------------------------------------------------------
STATIC std::any App::OnPrint(std::vector<std::any> const& args)
{
    if (!args.empty())
    {
        try
        {
            std::string message = std::any_cast<std::string>(args[0]);
            DebuggerPrintf("JS: %s\n", message.c_str());

            if (g_devConsole)
            {
                g_devConsole->AddLine(DevConsole::INFO_MINOR, "JS: " + message);
            }
        }
        catch (std::bad_any_cast const&)
        {
            DebuggerPrintf("JS: [無法轉換的物件]\n");
        }
    }
    return std::any{};
}

std::any App::OnDebug(std::vector<std::any> const& args)
{
    if (!args.empty())
    {
        try
        {
            std::string message = std::any_cast<std::string>(args[0]);
            DebuggerPrintf("JS DEBUG: %s\n", message.c_str());
        }
        catch (std::bad_any_cast const&)
        {
            DebuggerPrintf("JS DEBUG: [無法轉換的物件]\n");
        }
    }
    return std::any{};
}

std::any App::OnGarbageCollection(std::vector<std::any> const& args)
{
    UNUSED(args)
    if (g_scriptSubsystem)
    {
        g_scriptSubsystem->ForceGarbageCollection();
        DebuggerPrintf("JS: 垃圾回收已執行\n");
    }
    return std::any{};
}

//----------------------------------------------------------------------------------------------------
void App::UpdateCursorMode()
{
    bool const doesWindowHasFocus   = GetActiveWindow() == g_window->GetWindowHandle();
    bool const shouldUsePointerMode = !doesWindowHasFocus || g_devConsole->IsOpen() || g_game->IsAttractMode();

    if (shouldUsePointerMode == true)
    {
        g_input->SetCursorMode(eCursorMode::POINTER);
    }
    else
    {
        g_input->SetCursorMode(eCursorMode::FPS);
    }
}

void App::SetupScriptingBindings()
{
    if (g_scriptSubsystem == nullptr)ERROR_AND_DIE(StringFormat("(App::SetupScriptingBindings)(g_scriptSubsystem is nullptr!"))
    if (!g_scriptSubsystem->IsInitialized())ERROR_AND_DIE(StringFormat("(App::SetupScriptingBindings)(g_scriptSubsystem is not initialized!"))
    if (g_game == nullptr)ERROR_AND_DIE(StringFormat("(App::SetupScriptingBindings)(g_game is nullptr"))

    DAEMON_LOG(LogScript, eLogVerbosity::Log, StringFormat("(App::SetupScriptingBindings)(start)"));

    // Initialize hot-reload system (now integrated into ScriptSubsystem)
    std::string projectRoot = "C:/p4/Personal/SD/ProtogameJS3D/";
    if (g_scriptSubsystem->InitializeHotReload(projectRoot))
    {
        DAEMON_LOG(LogScript, eLogVerbosity::Log, StringFormat("(App::SetupScriptingBindings) Hot-reload system initialized successfully"));
    }
    else
    {
        DAEMON_LOG(LogScript, eLogVerbosity::Warning, StringFormat("(App::SetupScriptingBindings) Hot-reload system initialization failed"));
    }

    m_gameScriptInterface = std::make_shared<GameScriptInterface>(g_game);
    g_scriptSubsystem->RegisterScriptableObject("game", m_gameScriptInterface);

    m_inputScriptInterface = std::make_shared<InputScriptInterface>(g_input);
    g_scriptSubsystem->RegisterScriptableObject("input", m_inputScriptInterface);

    m_audioScriptInterface = std::make_shared<AudioScriptInterface>(g_audio);
    g_scriptSubsystem->RegisterScriptableObject("audio", m_audioScriptInterface);

    g_scriptSubsystem->RegisterGlobalFunction("print", OnPrint);
    g_scriptSubsystem->RegisterGlobalFunction("debug", OnDebug);
    g_scriptSubsystem->RegisterGlobalFunction("gc", OnGarbageCollection);

    DAEMON_LOG(LogScript, eLogVerbosity::Log, StringFormat("(App::SetupScriptingBindings)(end)"));
}
