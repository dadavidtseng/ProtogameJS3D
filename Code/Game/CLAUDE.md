[Root Directory](../../CLAUDE.md) > [Code](../) > **Game**

# Game Module - Main Application Architecture

## Module Responsibilities

The Game module serves as the **main executable application** implementing the dual-language architecture that bridges C++ engine performance with JavaScript flexibility. This module contains the core application lifecycle, entity management systems, and the critical V8 JavaScript integration layer.

## Entry and Startup

### Primary Entry Points
- **`Framework/Main_Windows.cpp`** - Windows application entry point and platform initialization
- **`Framework/App.hpp/.cpp`** - Application lifecycle management and main loop coordination
- **`Game.hpp/.cpp`** - Core game state management and dual-language coordination

### Startup Sequence
1. Windows application initialization
2. DaemonEngine subsystem startup
3. V8 JavaScript engine initialization
4. GameScriptInterface binding setup
5. Hot-reload system activation
6. Main game loop execution

## External Interfaces

### JavaScript Integration Layer
- **`Framework/GameScriptInterface.hpp/.cpp`** - Primary C++ ↔ JavaScript bridge
  - Implements `IScriptableObject` interface for V8Subsystem
  - Provides C++ method exposure to JavaScript runtime
  - Handles type conversion and error isolation
  - Manages bidirectional communication protocols

### Hot-Reload System
- **`Framework/FileWatcher.hpp/.cpp`** - File system monitoring for development
- **`Framework/ScriptReloader.hpp/.cpp`** - JavaScript hot-reload implementation
- **Thread-safe event processing** for main thread integration

### Entity System Interfaces
- **`Entity.hpp/.cpp`** - Base entity system for game objects
- **`Player.hpp/.cpp`** - Player entity with input handling
- **`Prop.hpp/.cpp`** - Interactive game objects and props

## Key Dependencies and Configuration

### External Dependencies
```cpp
// Engine Foundation
#include "Engine/Core/StringUtils.hpp"
#include "Engine/Renderer/VertexUtils.hpp"
#include "Engine/Resource/ResourceHandle.hpp"
#include "Engine/Input/InputScriptInterface.hpp"

// V8 JavaScript Integration
#include "Engine/Scripting/IScriptableObject.hpp"
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

### Entity Management
```cpp
class Game {
    // Core entities
    Player* m_player;           // Primary player character
    Prop* m_firstCube;          // Interactive objects
    Prop* m_secondCube;
    Prop* m_sphere;
    Prop* m_grid;
    
    // Dynamic object management
    std::vector<Prop*> m_props; // JavaScript-managed objects
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
**A**: The C++ Game class maintains the main loop and calls into JavaScript through V8Subsystem. JavaScript systems register with JSEngine and execute during C++ update/render cycles. The GameScriptInterface provides type-safe bidirectional communication.

### Q: How is hot-reload implemented?
**A**: FileWatcher monitors JavaScript files, ScriptReloader handles V8 script recompilation, and the system queues reload events for main thread processing. This allows JavaScript changes without C++ recompilation.

### Q: What's the performance impact of JavaScript integration?
**A**: Performance-critical systems remain in C++. JavaScript handles game logic, input processing, and system coordination. The V8 engine provides production-level JavaScript performance with minimal overhead.

### Q: How do I add new C++ methods for JavaScript?
**A**: Extend GameScriptInterface by:
1. Adding method to `GetAvailableMethods()`
2. Implementing handler in `CallMethod()`
3. Creating dedicated `Execute[MethodName]()` method
4. Following type conversion patterns for safety

## Related File List

### Core Application Files
- `Game.hpp/.cpp` - Main game class and state management
- `Framework/App.hpp/.cpp` - Application lifecycle and main loop
- `Framework/Main_Windows.cpp` - Platform entry point

### JavaScript Integration
- `Framework/GameScriptInterface.hpp/.cpp` - C++/JavaScript bridge
- `Framework/FileWatcher.hpp/.cpp` - Hot-reload file monitoring
- `Framework/ScriptReloader.hpp/.cpp` - Script reloading system
- `Framework/GameCommon.hpp` - Shared definitions

### Entity Systems
- `Entity.hpp/.cpp` - Base entity system
- `Player.hpp/.cpp` - Player character implementation
- `Prop.hpp/.cpp` - Interactive game objects

### Build and Configuration
- `Game.vcxproj` - MSBuild project configuration
- `Game.vcxproj.filters` - Visual Studio file organization
- `EngineBuildPreferences.hpp` - Engine build configuration

### Subsystems
- `Subsystem/Light/LightSubsystem.hpp/.cpp` - Lighting subsystem example

## Changelog
- **2025-09-20**: Initial module documentation created with comprehensive architecture analysis