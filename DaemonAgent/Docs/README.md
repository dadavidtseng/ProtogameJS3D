<a id="readme-top"></a>

<!-- PROJECT SHIELDS -->
[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![Apache 2.0 License][license-shield]][license-url]
[![LinkedIn][linkedin-shield]][linkedin-url]

<!-- PROJECT TITLE -->
<div align="center">
  <h1>DaemonAgent</h1>
  <p>Dual-language game engine bridging C++ performance with JavaScript flexibility through V8 integration</p>
</div>

<!-- TECH STACK BADGES -->
![C++](https://img.shields.io/badge/C%2B%2B-20-00599C?style=for-the-badge&logo=cplusplus&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![DirectX](https://img.shields.io/badge/DirectX-11-107C10?style=for-the-badge&logo=xbox&logoColor=white)
![V8](https://img.shields.io/badge/V8-13.0-4285F4?style=for-the-badge&logo=v8&logoColor=white)

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [How to Install](#how-to-install)
- [How to Use](#how-to-use)
- [Project Structure](#project-structure)
- [Future Roadmap](#future-roadmap)
- [Acknowledgements](#acknowledgements)
- [License](#license)
- [Contact](#contact)

---

## Overview

DaemonAgent (originally ProtogameJS3D / FirstV8) is a research project exploring dual-language game engine architecture. It embeds the Google V8 JavaScript engine into a C++ game engine foundation ([DaemonEngine](https://github.com/dadavidtseng/Engine)), allowing game logic to be written in JavaScript while performance-critical systems — rendering, audio, entity management — remain in C++.

The key architectural challenge is thread isolation: JavaScript game logic runs on a dedicated worker thread via `JSGameLogicJob`, while C++ rendering maintains a stable 60 FPS on the main thread. Communication between the two happens through double-buffered state buffers (`EntityStateBuffer`, `CameraStateBuffer`, `AudioStateBuffer`) with dirty tracking for O(d) swap optimization. JavaScript errors are fully isolated — a crash in the scripting layer never takes down the engine.

The project also integrates the KĀDI protocol for AI agent communication, enabling external agents (Python, TypeScript) to interact with the running game through WebSocket-based tool invocation. This supports automated testing, AI-driven gameplay, and development tooling workflows.

## Features

- [Async Dual-Thread Architecture](#async-dual-thread-architecture)
- [V8 JavaScript Integration with Hot Reload](#v8-javascript-integration-with-hot-reload)
- [GenericCommand Pipeline](#genericcommand-pipeline)
- [KĀDI Agent Protocol](#kādi-agent-protocol)

---

### Async Dual-Thread Architecture

The engine separates C++ rendering (main thread) from JavaScript game logic (worker thread) through `JSGameLogicJob`, a continuous worker that integrates with the engine's `JobSystem`. Each frame, the main thread checks if the worker has completed its JavaScript execution. If so, it swaps the double-buffered state and triggers the next frame. If the worker is still running, the main thread skips and continues rendering with the last known state — maintaining 60 FPS regardless of JavaScript performance.

```cpp
// App::Update() — async frame synchronization
if (m_jsGameLogicJob && m_jsGameLogicJob->IsFrameComplete())
{
    // Swap state buffers (copy back buffer to front buffer)
    if (m_entityStateBuffer) m_entityStateBuffer->SwapBuffers();
    if (m_cameraStateBuffer) m_cameraStateBuffer->SwapBuffers();
    if (m_audioStateBuffer)  m_audioStateBuffer->SwapBuffers();

    m_jsGameLogicJob->TriggerNextFrame();
}
// else: frame skip — worker still executing, render last state
```

State buffers use dirty tracking so `SwapBuffers()` only copies changed entries — O(d) instead of O(n). Three buffer types cover the full game state: entities (transforms, meshes, colors), cameras (projection, position), and audio (playback commands).

### V8 JavaScript Integration with Hot Reload

Game logic lives in JavaScript files executed by V8 v13.0. The `JSEngine` class provides a system registration framework where subsystems register with priority-based execution order. `JSGame` coordinates gameplay systems — input, physics, audio, debug rendering, and KĀDI control — all written in ES6+ modules.

The C++ `ScriptSubsystem` monitors script files via `FileWatcher`. When a `.js` file changes on disk, the engine hot-reloads it without restarting — the `HotReloadRegistry` tracks module instances and replaces them in-place. V8 Inspector support (port 9229) enables Chrome DevTools debugging of the JavaScript layer while the engine runs.

Script interfaces (`GameScriptInterface`, `IScriptableObject`) expose C++ methods to JavaScript through a reflection-like registry. Each scriptable object declares its available methods and properties, which V8 binds at initialization.

### GenericCommand Pipeline

The `GenericCommand` system provides a rate-limited, auditable command queue for JavaScript-to-C++ operations that require main-thread execution (e.g., mesh creation, resource loading). JavaScript submits commands via `CommandQueue.submit()`, which are queued in a lock-free SPSC ring buffer. The main thread's `GenericCommandExecutor` processes them each frame, dispatching to registered handlers.

```javascript
// JavaScript: create a mesh via GenericCommand pipeline
const entityId = await CommandQueue.submit('create_mesh', {
    meshType: 'cube',
    position: [0, 2, 0],
    scale: 1.5,
    color: { r: 255, g: 128, b: 0, a: 255 }
});
```

Each command type has a registered handler on the C++ side. The pipeline supports per-agent rate limiting (configurable via `GenericCommand.json`), audit logging, and async callbacks that return results to JavaScript through the `CallbackQueue`.

### KĀDI Agent Protocol

KĀDI (Knowledge-Augmented Development Interface) enables external AI agents to interact with the running game over WebSocket. The `KADIScriptInterface` on the C++ side manages authentication and connection lifecycle. On the JavaScript side, `KADIGameControl` registers two tool categories:

- **GameControlTools** — game state queries and manipulation (spawn entities, change states, read game data)
- **DevelopmentTools** — file operations and input injection for automated testing (create/read/delete script files, simulate key presses)

Agents connect, authenticate, and invoke tools through a JSON-RPC-like protocol. This architecture supports use cases like AI playtesting, automated QA, and live development assistance.

---

## How to Install

### Prerequisites

- Visual Studio 2022 (v143 toolset, C++20)
- Windows SDK 10.0+
- [DaemonEngine](https://github.com/dadavidtseng/Engine) cloned as a sibling directory (`../Engine/`)
- V8 v13.0 (prebuilt binaries included in `ThirdParty/`)
- FMOD Core SDK 2.x (included in Engine `ThirdParty/`)

### Installation

```bash
git clone https://github.com/dadavidtseng/DaemonAgent.git
git clone https://github.com/dadavidtseng/Engine.git

# Open the Visual Studio solution
# DaemonAgent.sln references Engine as a sibling project
# Build configuration: x64 Debug or Release
```

## How to Use

Launch the built executable from the `Run/` directory. The engine loads `GameConfig.xml` for window settings and `EngineSubsystems.json` for subsystem configuration.

```
Run/
├── DaemonAgent.exe            # Built executable
├── Data/
│   ├── GameConfig.xml         # Window size, screen settings
│   ├── Config/
│   │   ├── EngineSubsystems.json   # Enable/disable subsystems
│   │   ├── GenericCommand.json     # Command pipeline config
│   │   └── LogRotation.json        # Logging settings
│   └── Scripts/
│       ├── main.js            # V8 entry point
│       ├── JSEngine.js        # System registration framework
│       └── JSGame.js          # Game coordinator
```

JavaScript game logic is edited in `Run/Data/Scripts/`. With hot-reload enabled, saving a `.js` file automatically reloads it in the running engine. V8 Inspector is available at `chrome://inspect` (port 9229) when `enableInspector` is set in `EngineSubsystems.json`.

## Project Structure

```
DaemonAgent/
├── Code/Game/
│   └── Framework/
│       ├── App.hpp / App.cpp          # Application entry, frame loop, subsystem wiring
│       ├── GameScriptInterface.hpp    # C++ ↔ JS reflection registry
│       └── JSGameLogicJob.hpp         # Worker thread for V8 execution
├── Run/Data/
│   ├── Config/                        # Runtime configuration (JSON/XML)
│   ├── Scripts/
│   │   ├── core/                      # Subsystem, Component, GameObject, HotReloadRegistry
│   │   ├── component/                 # InputSystem, AudioSystem, PhysicsSystem, etc.
│   │   ├── event/                     # EventBus, typed events
│   │   ├── Interface/                 # API bridges (Entity, Camera, Audio, Resource, DebugRender)
│   │   ├── kadi/                      # KĀDI protocol (GameControl, DevelopmentTools)
│   │   ├── object/                    # Player, Prop game objects
│   │   ├── JSEngine.js                # System registration framework
│   │   ├── JSGame.js                  # Game coordinator
│   │   └── main.js                    # V8 entry point
│   ├── Models/                        # OBJ/FBX 3D assets
│   ├── Shaders/                       # HLSL (Default, BlinnPhong, Bloom)
│   └── Audio/                         # FMOD audio assets
└── ThirdParty/                        # V8, FMOD prebuilt binaries
```

## Future Roadmap

- [ ] Phase 2: JavaScript on dedicated worker thread with async C++→JS callbacks via `CallbackQueue`
- [ ] Phase 3: Error recovery and exception handling for fault isolation
- [ ] Phase 4: Dirty tracking optimization — reduce `SwapBuffers()` cost from O(n) to O(d)
- [ ] Network subsystem integration (`NetworkTCPSubsystem`)
- [ ] Extended KĀDI tool coverage for full game state introspection

## Acknowledgements

- Built on [DaemonEngine](https://github.com/dadavidtseng/Engine) — custom C++ engine with DirectX 11, FMOD, and JobSystem
- [Google V8](https://v8.dev/) — JavaScript engine for dual-language architecture
- [FMOD](https://www.fmod.com/) — professional audio middleware
- Developed at SMU Guildhall

## License

Distributed under the Apache 2.0 License. See `LICENSE` for more information.

## Contact

Yu-Wei Tseng — [dadavidtseng.info](https://dadavidtseng.info)

Project Link: [https://github.com/dadavidtseng/DaemonAgent](https://github.com/dadavidtseng/DaemonAgent)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->
[contributors-shield]: https://img.shields.io/github/contributors/dadavidtseng/DaemonAgent.svg?style=for-the-badge
[contributors-url]: https://github.com/dadavidtseng/DaemonAgent/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/dadavidtseng/DaemonAgent.svg?style=for-the-badge
[forks-url]: https://github.com/dadavidtseng/DaemonAgent/network/members
[stars-shield]: https://img.shields.io/github/stars/dadavidtseng/DaemonAgent.svg?style=for-the-badge
[stars-url]: https://github.com/dadavidtseng/DaemonAgent/stargazers
[issues-shield]: https://img.shields.io/github/issues/dadavidtseng/DaemonAgent.svg?style=for-the-badge
[issues-url]: https://github.com/dadavidtseng/DaemonAgent/issues
[license-shield]: https://img.shields.io/github/license/dadavidtseng/DaemonAgent.svg?style=for-the-badge
[license-url]: https://github.com/dadavidtseng/DaemonAgent/blob/main/LICENSE
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555
[linkedin-url]: https://linkedin.com/in/dadavidtseng