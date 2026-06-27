# daemon-agent
> DaemonAgent — dual-language game engine bridging a C++ DaemonEngine foundation with embedded V8 JavaScript game logic

Overview
--------
DaemonAgent (formerly "daemon-agent") is a research-grade C++ game application that embeds the Google V8 JavaScript engine to enable a dual-language architecture: performance-critical systems (rendering, audio, entity management) live in C++ (DaemonEngine) while game logic and rapid prototyping are written in JavaScript and executed in V8. The project emphasizes hot-reloadable JavaScript logic, crash isolation between language runtimes, and a frame-based double-buffered communication pattern (EntityStateBuffer / CameraStateBuffer) to achieve stable rendering and lock-free parallelism.

Quick Start
-----------
Prerequisites
- Microsoft Visual Studio 2022 with the C++ development workload
- Windows 10/11 (x64)
- NuGet for package dependencies

Build & run
1. Open the solution:
   - Open `DaemonAgent.sln` in Visual Studio 2022.
2. Choose a configuration:
   - Select `Debug|x64` or `Release|x64`.
3. Build the solution:
   - Build → Build Solution (Ctrl+Shift+B).
4. Run the application:
   - From the IDE: Start Debugging / Start Without Debugging.
   - Or from the Run folder:
     - cd Run
     - Run the produced binary (e.g., `DaemonAgent_Debug_x64.exe` or `DaemonAgent_Release_x64.exe`).

If you are working on the JavaScript side:
- Edit scripts under `Run/Data/Scripts/` — hot-reload is supported by the engine.
- Use Chrome DevTools integration for JS debugging when running the application.
- Primary JS entry point: `Run/Data/Scripts/main.js` (ES6 module). The JS framework exposes a JSEngine and uses a CommandQueue facade (see `Run/Data/Scripts/Interface/CommandQueue.js`). Note: `main.js` creates the `CommandQueue` instance and sets `globalThis.CommandQueueAPI` before the game systems are initialized (CommandQueue MUST be available to JS systems such as `JSGame`).

Tools
-----
| Tool / Subsystem | Description |
|------------------|-------------|
| V8 Subsystem (embedded) | Embedded JavaScript runtime for game logic and hot-reloadable systems. Integrated with Chrome DevTools for debugging. |
| DaemonEngine (Engine/) | C++ game engine foundation providing Core, Entity, Camera, Rendering, Audio, and Resource management subsystems. |
| Entity API / EntityScriptInterface | C++ ↔ JS bindings for entity management. Includes `EntityStateBuffer` double-buffering for lock-free state exchange. |
| Camera API / CameraScriptInterface | C++ ↔ JS bindings for camera control with `CameraStateBuffer`. |
| Rendering (DirectX) | DirectX-based renderer implemented in the engine (Engine/Renderer/). |
| Audio (FMOD) / AudioStateBuffer | FMOD integration for audio playback and mixing. Audio can be conditionally disabled at build-time via `Code/Game/EngineBuildPreferences.hpp` (`ENGINE_DISABLE_AUDIO`). `AudioStateBuffer` is used alongside `EntityStateBuffer` for audio state exchange. |
| Hot-Reload System (JSEngine) | `JSEngine` (JS-side, `Run/Data/Scripts/JSEngine.js`) manages JS systems, their priorities, and hot-reload replacement. Uses an internal event bus (`Event/EventBus.js`) and priority-based execution (0-100, lower = earlier). `main.js` is the ES6 entry module loaded by the C++ host. |
| DevTools Integration | Chrome DevTools connection for JavaScript inspection and breakpointing at runtime. |
| Command/Callback Queues | JS-visible `CommandQueue` facade and C++ lock-free/queued mechanisms for submitting render and engine commands. Callback processing uses a queued/lock-free design (see `CallbackQueue` / `CallbackQueueScriptInterface`). |

Configuration
-------------
Primary runtime configuration now lives under the Run/Data tree and engine/project files:

- `Run/Data/GameConfig.xml` — primary runtime configuration for the application (game-specific settings).
- `Run/Data/Scripts/` — JavaScript game logic and hot-reloadable modules; entry point `main.js`.
- `Run/Data/` — assets (models, shaders, textures, audio) and other data files.
- `Code/Game/EngineBuildPreferences.hpp` — per-game engine build flags. The current game header defines `ENGINE_DEBUG_RENDER`, `CONSOLE_HANDLER`, and `ENGINE_SCRIPTING_ENABLED` by default. Note: `ENGINE_SCRIPTING_ENABLED` is used in Phase 2 to enable async audio support via the AudioCommandQueue. `ENGINE_DISABLE_AUDIO` remains available (commented-out by default) to disable FMOD/audio code and linkage if needed.
- `DaemonAgent.sln` — Visual Studio solution and build configuration.
- `Code/Game/` — C++ game application sources that reference the external `Engine/` repository.

Common runtime settings are configured in `Run/Data/GameConfig.xml` and per-script configuration may be present inside `Run/Data/Scripts/`. Hot-reload and debugging behavior are controlled by runtime flags and `GameConfig.xml`.

Files and important paths
-------------------------
- `DaemonAgent.sln` — Visual Studio solution (entry point for development).
- `Code/Game/` — main application sources (C++). Look for `App.cpp` / `App` entry points that drive the main loop. Notable files:
  - `Code/Game/EngineBuildPreferences.hpp` — game-specific engine build preference flags (defines `ENGINE_DEBUG_RENDER`, `CONSOLE_HANDLER`, and `ENGINE_SCRIPTING_ENABLED` by default; `ENGINE_DISABLE_AUDIO` may be uncommented to disable audio).
  - `Code/Game/Framework/App.hpp` — application lifecycle methods: `Startup()`, `Shutdown()`, `RunFrame()`, and `RunMainLoop()`. Uses `EntityStateBuffer` and `AudioStateBuffer`. The `App` class declares per-process quitting state (`static bool m_isQuitting`) and exposes frame-phase methods (`BeginFrame()`, `Update()`, `Render()`, `EndFrame()`). It also declares static callbacks used with the engine's `EventSystem`, including `static std::any OnPrint(std::vector<std::any> const& args)`, `static bool OnCloseButtonClicked(EventArgs& args)`, and `static void RequestQuit()`. 
  - `Code/Game/Framework/GameScriptInterface.hpp` — scriptable bridge derived from `IScriptableObject` that registers and exposes methods to JS. Current callable methods include:
    - ExecuteAppRequestQuit
    - ExecuteJavaScriptCommand
    - ExecuteJavaScriptFile
    - ExecuteCreateScriptFile / ExecuteReadScriptFile / ExecuteDeleteScriptFile (KADI file operations)
    - ExecuteInjectKeyPress / ExecuteInjectKeyHold / ExecuteKeyHoldSequence (key-hold sequence accepts a JSON string) / ExecuteGetKeyHoldStatus / ExecuteCancelKeyHold / ExecuteListActiveKeyHolds (input injection and key-hold management)
    - ExecuteAddWatchedFile / ExecuteRemoveWatchedFile (file-watcher management)
  - `Code/Game/Framework/JSGameLogicJob.hpp` — worker-thread job for JavaScript execution (uses `JobSystem` primitives and thread synchronization). The JS worker is implemented around an abstract `IJSGameLogicContext` and coordinates with callback/command queues. The header documents a continuous worker-thread design using `std::mutex` + `std::condition_variable` for frame coordination and mentions V8 thread-safety via `v8::Locker`.
  - `Code/Game/Framework/GameCommon.hpp` — common helpers and globals (`g_app`, `g_game`) and utilities such as the `GAME_SAFE_RELEASE` macro.
- `Engine/` — external engine library containing:
  - `Engine/Entity/` — `EntityAPI`, `EntityScriptInterface`, `EntityStateBuffer`
  - `Engine/Renderer/` — `CameraAPI`, `CameraScriptInterface`, `CameraStateBuffer`
  - `Engine/Audio/` — `AudioStateBuffer` and audio subsystem (FMOD integration unless disabled)
  - `Engine/Core/` — shared `StateBuffer` template and core utilities, `JobSystem.hpp`
- `Run/Data/Scripts/` — JavaScript game logic, including:
  - `main.js` — ES6 entry point (creates `CommandQueue`, sets `globalThis.CommandQueueAPI`, initializes `JSEngine`/`JSGame`); contains hot-reload cleanup logic for prior JS game instances (destroys old prop/player/camera game objects on the C++ side before re-creating).
  - `JSEngine.js` — core JS framework for system registration, priority execution, hot-reload handling, and event-bus integration (`Event/EventBus.js`).
  - `JSGame.js` — JS-side game orchestration (imported by `main.js`) that wires up subsystems such as input and audio.
  - `Interface/CommandQueue.js` — CommandQueue facade exposed to JS for engine interactions. `main.js` creates an instance and exposes it as `globalThis.CommandQueueAPI` (the CommandQueue provides runtime availability checks such as `isAvailable()`).
  - `InputSystemCommon.js` — shared key code constants used by input-related systems.
  - `InputSystem.js`, `AudioSystem.js` — concrete JS subsystems imported/used by `JSGame.js`.
  - Utility / gameplay systems imported by `JSGame`/`main.js`: `CppBridgeSystem.js`, `CubeSpawner.js`, `PropMover.js`, `CameraShaker.js` (examples of JS subsystems that interact with the C++ engine via the CommandQueue/Script interfaces).
  - `Event/EventBus.js` — JS event bus used by `JSEngine` and subsystems for decoupled communication.

Input, audio, and other systems are registered with `JSEngine` and execute each frame in priority order. Hot-reload replaces modified subsystem instances and `main.js` performs safe cleanup of previously-created C++ side objects on reload.

Notes, tips & internals
-----------------------
- Hot-reload behavior:
  - `main.js` implements a hot-reload cleanup sequence that attempts to call `.destroy()` on previously-created prop/player/camera game objects (these `.destroy()` calls are bridged to the C++ side).
  - The JS framework (`JSEngine