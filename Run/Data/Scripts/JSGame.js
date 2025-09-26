//----------------------------------------------------------------------------------------------------
// JSGame.js
//----------------------------------------------------------------------------------------------------

//----------------------------------------------------------------------------------------------------
class JSGame {
    constructor(engine) {
        console.log('(JSGame::constructor)(start)');
        this.engine = engine;
        this.frameCount = 0;

        // Create InputSystem instance for delegation
        this.inputSystem = new InputSystem();

        // Register individual game systems
        this.registerGameSystems();

        console.log('(JSGame::constructor)(end)');
    }

    /**
     * Register all game systems with the engine
     */
    registerGameSystems() {
        if (this.engine == null || this.engine.registerSystem == null) {
            console.log('JSGame: Engine does not support system registration, using legacy mode');
            return;
        }

        console.log('(JSGame::registerGameSystems)(start)');

        // Register C++ Bridge System (highest priority - must run first)
        this.engine.registerSystem('cppBridge', {
            update: (gameDeltaSeconds, systemDeltaSeconds) => this.updateCppBridge(gameDeltaSeconds, systemDeltaSeconds),
            render: () => this.renderCppBridge(),
            priority: 0,
            data: {description: 'C++ engine bridge system'}
        });

        // Register Input System (delegated to InputSystem.js for AI Agent separation)
        this.engine.registerSystem('inputHandler', {
            update: (gameDeltaSeconds, systemDeltaSeconds) => this.updateInputHandler(gameDeltaSeconds, systemDeltaSeconds),
            priority: 10,
            enabled: true,
            data: {
                description: 'F1 key handler delegated to InputSystem for AI Agent editing',
                lastF1State: false
            }
        });
        // Register Cube Spawner System

        this.engine.registerSystem('cubeSpawner', {
            update: (gameDeltaSeconds, systemDeltaSeconds) => this.updateCubeSpawner(gameDeltaSeconds, systemDeltaSeconds),
            priority: 20,
            data: {
                description: 'Spawns cubes every 4 seconds',
                lastSpawnFrame: 0,
                interval: 240
            }
        });
        // Register Prop Mover System

        this.engine.registerSystem('propMover', {
            update: (gameDeltaSeconds, systemDeltaSeconds) => this.updatePropMover(gameDeltaSeconds, systemDeltaSeconds),
            priority: 30,
            data: {
                description: 'Moves props every 2 seconds',
                lastMoveFrame: 0,
                interval: 120
            }
        });

        // Register Camera Shaker System
        this.engine.registerSystem('cameraShaker', {
            update: (gameDeltaSeconds, systemDeltaSeconds) => this.updateCameraShaker(gameDeltaSeconds, systemDeltaSeconds),
            priority: 40,
            data: {
                description: 'Shakes camera every 6 seconds',
                lastShakeFrame: 0,
                interval: 360
            }
        });

        console.log('(JSGame::registerGameSystems)(end)');
    }

    // ============================================================================
    // AI AGENT API - For runtime system control
    // ============================================================================

    /**
     * Enable input system - F1 key will work
     */
    enableInput() {
        return this.engine.setSystemEnabled('inputHandler', true);
    }

    /**
     * Disable input system - F1 key will NOT work
     */
    disableInput() {
        return this.engine.setSystemEnabled('inputHandler', false);
    }

    /**
     * Check if input system is enabled
     */
    isInputEnabled() {
        const system = this.engine.getSystem('inputHandler');
        return system ? system.enabled : false;
    }

    /**
     * Register new system at runtime (for AI agents)
     */
    registerSystem(id, config) {
        return this.engine.registerSystem(id, config);
    }

    /**
     * Unregister system at runtime (for AI agents)
     */
    unregisterSystem(id) {
        return this.engine.unregisterSystem(id);
    }

    // ============================================================================
    // SYSTEM IMPLEMENTATIONS
    // ============================================================================

    /**
     * C++ Bridge System - maintains original functionality
     */
    updateCppBridge(gameDeltaSeconds, systemDeltaSeconds) {
        this.frameCount++;

        // Call C++ engine update through JSEngine with proper clock separation
        if (this.engine) {
            this.engine.updateCppEngine(gameDeltaSeconds, systemDeltaSeconds);
        }
    }

    renderCppBridge() {
        // Check shouldRender flag for F1 toggle functionality
        let shouldRenderValue = true;

        if (typeof shouldRender !== 'undefined') {
            shouldRenderValue = shouldRender;
        } else if (typeof globalThis.shouldRender !== 'undefined') {
            shouldRenderValue = globalThis.shouldRender;
        }

        // Call C++ engine render through JSEngine (preserve original logic)
        if (shouldRenderValue && this.engine) {
            this.engine.renderCppEngine();
        }
    }

    /**
     * Input Handler System - delegated to InputSystem.js for AI Agent file separation
     * Uses systemDeltaSeconds so input continues working when game is paused
     */
    updateInputHandler(gameDeltaSeconds, systemDeltaSeconds) {
        const system = this.engine.getSystem('inputHandler');
        if (!system) return;

        // Check if InputSystem has been reloaded (hot-reload support)
        // Compare static class version instead of creating test instances
        if (!this.inputSystemVersion || InputSystem.version > this.inputSystemVersion) {
            console.log('JSGame: InputSystem hot-reloaded, creating new instance');
            this.inputSystem = new InputSystem();
            this.inputSystemVersion = InputSystem.version;
        }

        // Delegate input handling to InputSystem (AI Agent separation)
        // Use systemDeltaSeconds so input works even when game clock is paused
        this.inputSystem.handleInput(systemDeltaSeconds * 1000.0); // Convert back to milliseconds for InputSystem

        // Update system data from InputSystem for consistency
        system.data.lastF1State = this.inputSystem.getLastF1State();
    }

    /**
     * Cube Spawner System
     * Uses gameDeltaSeconds so it pauses when game clock is paused
     */
    updateCubeSpawner(gameDeltaSeconds, systemDeltaSeconds) {
        const system = this.engine.getSystem('cubeSpawner');
        if (!system) return;

        if (this.frameCount - system.data.lastSpawnFrame >= system.data.interval) {
            this.testCreateCube();
            system.data.lastSpawnFrame = this.frameCount;
        }
    }

    /**
     * Prop Mover System
     * Uses gameDeltaSeconds so it pauses when game clock is paused
     */
    updatePropMover(gameDeltaSeconds, systemDeltaSeconds) {
        const system = this.engine.getSystem('propMover');
        if (!system) return;

        if (this.frameCount - system.data.lastMoveFrame >= system.data.interval && this.frameCount > 240) {
            this.testMoveProp();
            system.data.lastMoveFrame = this.frameCount;
        }
    }

    /**
     * Camera Shaker System
     * Uses systemDeltaSeconds so camera shake continues even when game is paused
     */
    updateCameraShaker(gameDeltaSeconds, systemDeltaSeconds) {
        const system = this.engine.getSystem('cameraShaker');
        if (!system) return;

        if (this.frameCount - system.data.lastShakeFrame >= system.data.interval) {
            this.testCameraShake();
            system.data.lastShakeFrame = this.frameCount;
        }
    }

    /**
     * Test methods to demonstrate the framework
     */
    testCreateCube() {
        if (this.engine) {
            const x = (Math.random() - 0.5) * 10;
            const y = (Math.random() - 0.5) * 10;
            const z = Math.random() * 3;

            this.engine.createCube(x, y, z);
            console.log('JSGame: Test - Created random cube');
        }
    }

    testMoveProp() {
        if (this.engine) {
            const propIndex = 0; // Move the first prop
            const x = (Math.random() - 0.5) * 8;
            const y = (Math.random() - 0.5) * 8;
            const z = Math.random() * 2;

            this.engine.moveProp(propIndex, x, y, z);
            console.log('JSGame: Test - Moved prop');
        }
    }

    testCameraShake() {
        if (this.engine) {
            const shakeX = (Math.random() - 0.5) * 0.2;
            const shakeY = (Math.random() - 0.5) * 0.2;
            const shakeZ = (Math.random() - 0.5) * 0.1;

            this.engine.moveCamera(shakeX, shakeY, shakeZ);
            console.log('JSGame: Test - Camera shake');
        }
    }
}

// Make it globally available
if (typeof globalThis !== 'undefined') {
    globalThis.JSGame = JSGame;
} else if (typeof window !== 'undefined') {
    window.JSGame = JSGame;
}

const jsEngineInstance = new JSEngine();
const jsGameInstance = new JSGame(jsEngineInstance);
// jsEngineInstance.initialize();
jsEngineInstance.setGame(jsGameInstance);
globalThis.JSEngine = jsEngineInstance;

// Make jsGameInstance globally accessible for hot-reload
globalThis.jsGameInstance = jsGameInstance;

// Initialize shouldRender flag for F1 toggle functionality
if (typeof globalThis.shouldRender === 'undefined') {
    globalThis.shouldRender = true;
}

console.log('JSGame: System registration framework initialized');
console.log('Available API: globalThis.GameAPI for system management');
console.log('Input system status:', jsGameInstance.isInputEnabled() ? 'ENABLED' : 'DISABLED');
console.log('Hot-reload system status:', jsEngineInstance.hotReloadEnabled ? 'AVAILABLE (C++)' : 'NOT AVAILABLE');