[Root Directory](../../CLAUDE.md) > [Code](../) > **Game**

# Game Module - Main Application Architecture

## Module Responsibilities

The Game module serves as the **main executable application** implementing the dual-language architecture that bridges C++ engine performance with JavaScript flexibility. This module contains the core application lifecycle and the critical V8 JavaScript integration layer. Entity and Camera management systems have been moved to the Engine repository for better reusability.

## Entry and Startup

### Primary Entry Points
- **`Framework/Main_Windows.cpp`** - Windows application entry point and platform initialization
- **`Framework/App.hpp/.cpp`** - Application lifecycle management and main loop coordination
- **`Gameplay/Game.hpp/.cpp`** - Core game state management and dual-language coordination

### Startup Sequence
1. Windows application initialization
2. DaemonEngine subsystem startup
3. V8 JavaScript engine initialization
4. EntityAPI and CameraAPI initialization (from Engine)
5. Script interface binding setup (EntityScriptInterface, CameraScriptInterface)
6. Hot-reload system activation
7. Main game loop execution

## External Interfaces

### JavaScript Integration Layer
- **`Framework/GameScriptInterface.hpp/.cpp`** - Game-specific C++ ↔ JavaScript bridge
  - Implements `IScriptableObject` interface for V8Subsystem
  - Provides game-specific method exposure to JavaScript runtime
  - Handles type conversion and error isolation
  - Manages bidirectional communication protocols

### Script Interfaces (from Engine)
- **`Engine/Entity/EntityScriptInterface`** - Entity management JavaScript API
- **`Engine/Renderer/CameraScriptInterface`** - Camera control JavaScript API
- Both follow `IScriptableObject` pattern with method registry

### Hot-Reload System
- **`Framework/FileWatcher.hpp/.cpp`** - File system monitoring for development
- **`Framework/ScriptReloader.hpp/.cpp`** - JavaScript hot-reload implementation
- **Thread-safe event processing** for main thread integration

### Entity System Integration (Engine-based)
- **`Engine/Entity/EntityAPI`** - Engine-level entity management
- **`Engine/Entity/EntityState`** - Entity state definition
- **`Engine/Entity/EntityStateBuffer`** - Async state management
- App directly uses EntityAPI (removed HighLevelEntityAPI facade)

### Camera System Integration (Engine-based)
- **`Engine/Renderer/CameraAPI`** - Engine-level camera control
- **`Engine/Renderer/CameraState`** - Camera state definition
- **`Engine/Renderer/CameraStateBuffer`** - Async camera state management

## Key Dependencies and Configuration

### External Dependencies
```cpp
// Engine Foundation
#include "Engine/Core/StringUtils.hpp"
#include "Engine/Core/StateBuffer.hpp"
#include "Engine/Renderer/VertexUtils.hpp"
#include "Engine/Resource/ResourceHandle.hpp"
#include "Engine/Input/InputScriptInterface.hpp"

// Entity and Camera Systems (Engine)
#include "Engine/Entity/EntityAPI.hpp"
#include "Engine/Entity/EntityScriptInterface.hpp"
#include "Engine/Renderer/CameraAPI.hpp"
#include "Engine/Renderer/CameraScriptInterface.hpp"

// V8 JavaScript Integration
#include "Engine/Script/IScriptableObject.hpp"
```

### Build Configuration
- **`Game.vcxproj`** - MSBuild project configuration
  - V8 package path management: `v8-v143-x64.13.0.245.25`
  - Platform targets: Win32, x64 (Debug/Release)
  - Engine dependency linking
  - NuGet package integration

### Engine Preferences
- **`EngineBuildPreferences.hpp`** - Engine compilation configuration
- Centralized build system configuration
- Subsystem enabling/disabling flags

## Data Models

### Game State Management
```cpp
enum class eGameState : uint8_t {
    ATTRACT,  // Attraction/menu mode
    GAME      // Active gameplay mode
};
```

### Application Architecture
```cpp
class App {
    // Direct engine API usage (SOLID: Dependency Inversion)
    EntityAPI* m_entityAPI;     // Engine-level entity management
    CameraAPI* m_cameraAPI;     // Engine-level camera control

    // Script interfaces for JavaScript
    std::shared_ptr<EntityScriptInterface> m_entityScriptInterface;
    std::shared_ptr<CameraScriptInterface> m_cameraScriptInterface;
};
```

### JavaScript State Tracking
```cpp
class Game {
    bool m_hasInitializedJS;    // JavaScript initialization status
    bool m_hasRunJSTests;       // Test execution tracking
    Vec3 m_originalPlayerPosition; // Camera/position restoration
    bool m_cameraShakeActive;   // Effect state tracking
};
```

## Architecture Changes (M4-T8 Refactoring)

### Removed Components
- **HighLevelEntityAPI** - Facade pattern eliminated for direct API access
- **EntityAPI, EntityScriptInterface, EntityStateBuffer** - Moved to Engine/Entity/
- **CameraAPI, CameraScriptInterface, CameraStateBuffer** - Moved to Engine/Renderer/
- **StateBuffer template** - Moved to Engine/Core/

### Benefits of Refactoring
- **SOLID Principles**: App depends on abstractions (EntityAPI, CameraAPI) not implementations
- **Code Reusability**: Entity and Camera systems now reusable across projects
- **Separation of Concerns**: Clear boundaries between game and engine code
- **Simplified Dependencies**: Removed unnecessary facade layer

## Testing and Quality

### Current Testing Strategy
- **Integration Testing** - Manual verification of C++/JavaScript interoperability
- **Hot-Reload Testing** - Development workflow validation
- **Interactive Testing** - F1 key toggle functionality for runtime debugging

### Quality Assurance
- **C++20 Standards Compliance** - Modern C++ features with strict conformance
- **RAII Memory Management** - Automatic resource cleanup
- **Error Isolation** - JavaScript errors do not crash C++ engine
- **Type Safety** - Careful std::any conversions in script interface

### Development Tools Integration
- **Visual Studio 2022** - Full C++ debugging support
- **Chrome DevTools** - JavaScript debugging through V8 integration
- **MSBuild** - Professional build pipeline
- **NuGet** - Automated dependency management

## FAQ

### Q: How does the dual-language architecture work?
**A**: The C++ App class maintains the main loop and calls into JavaScript through V8Subsystem. JavaScript systems register with JSEngine and execute during C++ update/render cycles. EntityScriptInterface and CameraScriptInterface provide type-safe bidirectional communication for entity and camera operations.

### Q: How is hot-reload implemented?
**A**: FileWatcher monitors JavaScript files, ScriptReloader handles V8 script recompilation, and the system queues reload events for main thread processing. This allows JavaScript changes without C++ recompilation.

### Q: What's the performance impact of JavaScript integration?
**A**: Performance-critical systems (Entity, Camera) remain in C++ Engine code. JavaScript handles game logic, input processing, and system coordination. The V8 engine provides production-level JavaScript performance with minimal overhead.

### Q: How do I add new C++ methods for JavaScript?
**A**: Extend GameScriptInterface by:
1. Adding method to `GetAvailableMethods()`
2. Registering in `InitializeMethodRegistry()`
3. Creating dedicated `Execute[MethodName]()` method
4. Following type conversion patterns for safety

### Q: Where did EntityAPI and CameraAPI go?
**A**: They've been moved to the Engine repository for better reusability:
- EntityAPI: `Engine/Entity/EntityAPI.hpp`
- CameraAPI: `Engine/Renderer/CameraAPI.hpp`
- App now directly uses these APIs without a facade layer

## Related File List

### Core Application Files
- `Gameplay/Game.hpp/.cpp` - Main game class and state management
- `Framework/App.hpp/.cpp` - Application lifecycle and main loop
- `Framework/Main_Windows.cpp` - Platform entry point

### JavaScript Integration
- `Framework/GameScriptInterface.hpp/.cpp` - Game-specific C++/JavaScript bridge
- `Framework/FileWatcher.hpp/.cpp` - Hot-reload file monitoring
- `Framework/ScriptReloader.hpp/.cpp` - Script reloading system
- `Framework/GameCommon.hpp` - Shared definitions

### Build and Configuration
- `Game.vcxproj` - MSBuild project configuration
- `Game.vcxproj.filters` - Visual Studio file organization
- `EngineBuildPreferences.hpp` - Engine build configuration

### Subsystems
- `Subsystem/Light/LightSubsystem.hpp/.cpp` - Lighting subsystem example

### JSGameLogic Job (Async JavaScript Execution)
- `Framework/JSGameLogicJob.hpp/.cpp` - Asynchronous JavaScript execution job
  - Manages JavaScript game logic execution on separate thread
  - Integrates with JobSystem for multi-threaded processing
  - Handles state synchronization between main and worker threads

## Changelog
- **2025-10-27**: M4-T8 async architecture refactoring completed
  - Removed HighLevelEntityAPI facade (SOLID: Dependency Inversion)
  - Moved EntityAPI, EntityScriptInterface, EntityStateBuffer to Engine/Entity/
  - Moved CameraAPI, CameraScriptInterface, CameraStateBuffer to Engine/Renderer/
  - App now directly uses EntityAPI and CameraAPI from Engine
  - Improved cross-repository code reusability
  - Applied SOLID principles throughout architecture
- **2025-09-20**: Initial module documentation created with comprehensive architecture analysis
