[Root Directory](../../../CLAUDE.md) > [Run](../../) > [Data](../) > **Scripts**

# JavaScript Game Logic Module

## Module Responsibilities

The JavaScript Game Logic module implements the **game-side logic layer** of the dual-language architecture, providing a flexible and hot-reloadable system for game mechanics, input handling, and runtime system management. This module bridges high-level game logic with the underlying C++ engine through the V8 JavaScript runtime.

## Entry and Startup

### Primary Entry Points
- **`JSEngine.js`** - Core JavaScript engine framework with system registration
- **`JSGame.js`** - Main game logic coordinator and system manager
- **`InputSystem.js`** - Dedicated input handling system (AI Agent separation)

### Initialization Sequence
```javascript
// Global initialization in JSGame.js
const jsEngineInstance = new JSEngine();
const jsGameInstance = new JSGame(jsEngineInstance);
jsEngineInstance.setGame(jsGameInstance);

// System registration and hot-reload setup
jsGameInstance.registerGameSystems();
```

## External Interfaces

### C++ Engine Bridge Interface
```javascript
// JSEngine methods for C++ communication
engine.updateCppEngine(gameDeltaSeconds, systemDeltaSeconds);
engine.renderCppEngine(gameDeltaSeconds, systemDeltaSeconds);
engine.createCube(x, y, z);
engine.moveProp(index, x, y, z);
engine.moveCamera(x, y, z);
```

### System Registration API
```javascript
// Runtime system management for AI Agents
engine.registerSystem(id, {
    update: (deltaTime) => { /* system logic */ },
    render: () => { /* rendering logic */ },
    priority: 0,
    enabled: true,
    data: { /* system state */ }
});

engine.unregisterSystem(id);
engine.setSystemEnabled(id, enabled);
```

### Global Script Interface
- **`globalThis.JSEngine`** - Global engine instance access
- **`globalThis.jsGameInstance`** - Global game instance for hot-reload
- **`globalThis.shouldRender`** - F1 toggle functionality for debugging

## Key Dependencies and Configuration

### Runtime Dependencies
- **Google V8 JavaScript Engine** - JavaScript execution environment
- **Chrome DevTools Protocol** - Debugging and development tools
- **C++ GameScriptInterface** - Bidirectional communication bridge

### Hot-Reload System
```javascript
// Hot-reload detection and handling
if (InputSystem.version > this.inputSystemVersion) {
    console.log('JSGame: InputSystem hot-reloaded, creating new instance');
    this.inputSystem = new InputSystem();
    this.inputSystemVersion = InputSystem.version;
}
```

### System Configuration
- **Priority-based execution** - Systems execute in priority order
- **Enable/disable flags** - Runtime system control
- **Thread-safe operation queuing** - Safe system registration during execution

## Data Models

### JSEngine System Registry
```javascript
class JSEngine {
    registeredSystems: Map<string, SystemData>;
    updateSystems: Array<SystemData>;
    renderSystems: Array<SystemData>;
    pendingOperations: Array<OperationData>;
}

interface SystemData {
    id: string;
    update: (deltaTime: number) => void;
    render: () => void;
    priority: number;
    enabled: boolean;
    data: object;
}
```

### Game Systems Architecture
```javascript
// Registered core systems in JSGame
systems = {
    'cppBridge': { priority: 0, description: 'C++ engine bridge' },
    'inputHandler': { priority: 10, description: 'F1 key handler (AI Agent)' },
    'cubeSpawner': { priority: 20, description: 'Spawns cubes every 4 seconds' },
    'propMover': { priority: 30, description: 'Moves props every 2 seconds' },
    'cameraShaker': { priority: 40, description: 'Camera effects system' }
};
```

### Input System State
```javascript
class InputSystem {
    lastF1State: boolean;
    logTimer: number;
    static version: number; // Hot-reload detection
}
```

## Testing and Quality

### Interactive Testing Features
- **F1 Key Toggle** - Runtime rendering enable/disable for debugging
- **System Status Logging** - Console output for system state monitoring
- **Hot-Reload Verification** - Automatic system reloading on file changes

### Test Files and Scripts
- **`test_scripts.js`** - JavaScript functionality testing and development scripts
- **Console Integration** - Chrome DevTools debugging and runtime inspection
- **Performance Monitoring** - Frame count tracking and system execution profiling

### Error Handling
```javascript
// Safe system execution with error isolation
for (const system of this.updateSystems) {
    if (system.enabled && system.update) {
        try {
            system.update(deltaTime);
        } catch (error) {
            console.log(`JSEngine: Error in system '${system.id}' update:`, error);
        }
    }
}
```

## FAQ

### Q: How does hot-reload work for JavaScript files?
**A**: The C++ FileWatcher monitors JavaScript files and triggers ScriptReloader when changes are detected. The JavaScript systems detect version changes and recreate instances automatically. Global objects maintain state across reloads.

### Q: How do I add new game systems at runtime?
**A**: Use the system registration API:
```javascript
jsGameInstance.registerSystem('mySystem', {
    update: (deltaTime) => { /* logic */ },
    priority: 50,
    enabled: true
});
```

### Q: Why is InputSystem in a separate file?
**A**: AI Agent separation - InputSystem.js can be modified independently by AI agents without affecting core JSGame.js functionality. JSGame delegates input handling to this system.

### Q: How do I debug JavaScript code?
**A**: Connect Chrome DevTools to the running application (port 9222). The V8 integration provides full debugging support including breakpoints, console access, and variable inspection.

### Q: What's the execution order of systems?
**A**: Systems execute in priority order (lower numbers first):
1. cppBridge (0) - C++ engine update/render
2. inputHandler (10) - Input processing
3. cubeSpawner (20) - Object creation
4. propMover (30) - Object manipulation
5. cameraShaker (40) - Effects systems

## Related File List

### Core Framework Files
- **`JSEngine.js`** - System registration framework and C++ bridge
- **`JSGame.js`** - Game logic coordinator and system manager
- **`InputSystem.js`** - Input handling system (AI Agent separation)

### Development and Testing
- **`test_scripts.js`** - Development testing and verification scripts
- **`F1_KeyHandler.js`** - Legacy F1 key handling (superseded by InputSystem)

### Configuration and Integration
- Global scope variables for hot-reload state management
- Chrome DevTools integration for professional debugging
- V8 engine runtime configuration through C++ bridge

## AI Agent Integration Points

### Recommended Modification Patterns
1. **New System Creation** - Add systems through registration API
2. **Input System Extension** - Modify InputSystem.js for new input handling
3. **Game Logic Addition** - Create new systems with update/render methods
4. **Runtime Configuration** - Use enable/disable system controls

### Safe Modification Guidelines
- Always use try/catch blocks in system methods
- Respect priority ordering for system dependencies
- Use hot-reload compatible patterns (avoid global state corruption)
- Test changes through Chrome DevTools before finalizing

## Changelog
- **2025-09-20**: Initial module documentation created with comprehensive JavaScript architecture analysis