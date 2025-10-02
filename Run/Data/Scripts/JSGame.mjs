//----------------------------------------------------------------------------------------------------
// JSGame.mjs - Game System Coordinator (Phase 4 ES6 Module Architecture)
//----------------------------------------------------------------------------------------------------

import { JSEngine } from './JSEngine.mjs';
import { CppBridgeSystem } from './components/CppBridgeSystem.mjs';
import { InputSystem } from './components/InputSystem.mjs';
import { AudioSystem } from './components/AudioSystem.mjs';
import { CubeSpawner } from './components/CubeSpawner.mjs';
import { PropMover } from './components/PropMover.mjs';
import { CameraShaker } from './components/CameraShaker.mjs';

/**
 * JSGame - Game system coordinator
 *
 * Responsibilities:
 * - Create all game system instances
 * - Register systems with JSEngine
 * - Coordinate system lifecycle
 * - Handle hot-reload for InputSystem/AudioSystem (legacy)
 *
 * Design Philosophy:
 * - This file is rarely edited (system coordinator)
 * - AI agents edit component files (separate systems)
 * - Each system = separate file (no conflicts)
 */

export class JSGame {
    constructor(engine) {
        console.log('(JSGame::constructor)(start) - Phase 4 ES6 Module pattern');
        this.engine = engine;

        // Phase 3.5: Create component instances
        this.createComponentInstances();

        // Register all component systems with JSEngine
        this.registerGameSystems();

        console.log('(JSGame::constructor)(end) - All components registered');
    }

    /**
     * Create all component system instances
     * Phase 4: Pure ES6 Module imports with SystemComponent pattern
     */
    createComponentInstances() {
        console.log('JSGame: Creating component instances...');

        // Core C++ bridge (priority: 0)
        this.cppBridge = new CppBridgeSystem(this.engine);

        // Audio system (priority: 5) - must create before InputSystem
        this.audioSystem = new AudioSystem();

        // Input system (priority: 10)
        this.inputSystem = new InputSystem();
        this.inputSystem.setAudioSystem(this.audioSystem);

        // Game logic systems (priorities: 20, 30, 40)
        this.cubeSpawner = new CubeSpawner(this.engine);
        this.propMover = new PropMover(this.engine);
        this.cameraShaker = new CameraShaker(this.engine);

        console.log('JSGame: All component instances created (Phase 4 ES6)');
    }

    /**
     * Register all game systems with the engine
     * Phase 4: Pure SystemComponent pattern (no legacy delegation)
     */
    registerGameSystems() {
        if (this.engine == null || this.engine.registerSystem == null) {
            console.log('JSGame: Engine does not support system registration, using legacy mode');
            return;
        }

        console.log('(JSGame::registerGameSystems)(start) - Phase 4 Pure ES6 Module pattern');

        // Register all systems using SystemComponent pattern (null, componentInstance)
        this.engine.registerSystem(null, this.cppBridge);       // Priority: 0
        this.engine.registerSystem(null, this.audioSystem);     // Priority: 5
        this.engine.registerSystem(null, this.inputSystem);     // Priority: 10
        this.engine.registerSystem(null, this.cubeSpawner);     // Priority: 20
        this.engine.registerSystem(null, this.propMover);       // Priority: 30
        this.engine.registerSystem(null, this.cameraShaker);    // Priority: 40

        console.log('(JSGame::registerGameSystems)(end) - All systems registered with SystemComponent pattern');
    }

    // ============================================================================
    // AI AGENT API - For runtime system control
    // ============================================================================

    /**
     * Enable input system
     */
    enableInput() {
        return this.engine.setSystemEnabled('inputSystem', true);
    }

    /**
     * Disable input system
     */
    disableInput() {
        return this.engine.setSystemEnabled('inputSystem', false);
    }

    /**
     * Check if input system is enabled
     */
    isInputEnabled() {
        const system = this.engine.getSystem('inputSystem');
        return system ? system.enabled : false;
    }

    /**
     * Enable audio system
     */
    enableAudio() {
        return this.engine.setSystemEnabled('audioSystem', true);
    }

    /**
     * Disable audio system
     */
    disableAudio() {
        return this.engine.setSystemEnabled('audioSystem', false);
    }

    /**
     * Check if audio system is enabled
     */
    isAudioEnabled() {
        const system = this.engine.getSystem('audioSystem');
        return system ? system.enabled : false;
    }

    /**
     * Get audio system status
     */
    getAudioStatus() {
        return this.audioSystem ? this.audioSystem.getSystemStatus() : null;
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
}

console.log('JSGame: Module loaded (Phase 4 ES6)');
