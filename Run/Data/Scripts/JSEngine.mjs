//----------------------------------------------------------------------------------------------------
// JSEngine.mjs - Core JavaScript Engine Framework
//----------------------------------------------------------------------------------------------------

/**
 * JSEngine - Core JavaScript engine with system registration framework
 *
 * Responsibilities:
 * - Register and manage game systems
 * - Execute systems in priority order
 * - Bridge C++ engine methods to JavaScript
 * - Handle hot-reload system integration
 *
 * Design Philosophy:
 * - This file is CORE INFRASTRUCTURE - rarely edited
 * - Systems register with JSEngine and execute every frame
 * - Priority-based execution (0-100, lower = earlier)
 * - Dual pattern support: legacy config objects + SystemComponent instances
 */

export class JSEngine {
    constructor() {
        this.game = null;
        this.isInitialized = true;
        this.frameCount = 0;

        // System Registration
        this.registeredSystems = new Map();
        this.updateSystems = [];
        this.renderSystems = [];
        this.pendingOperations = [];

        // C++ Hot-Reload System (handled by C++ FileWatcher + ScriptReloader)
        this.hotReloadEnabled = true; // C++ hot-reload system availability flag

        console.log('JSEngine: Created with system registration support');
    }

    /**
     * Set the game instance
     */
    setGame(gameInstance) {
        this.game = gameInstance;
        console.log('JSEngine: Game instance set');
    }

    // ============================================================================
    // SYSTEM REGISTRATION API (for AI agents and runtime modifications)
    // ============================================================================

    /**
     * Register a system for runtime execution
     * DUAL PATTERN SUPPORT (Phase 3.5 ECS modernization):
     * - LEGACY: registerSystem('systemId', {update, render, priority, enabled, data})
     * - NEW: registerSystem(null, systemComponentInstance) where instance.id is used
     *
     * @param {string|null} id - Unique system identifier (legacy) or null (new SystemComponent pattern)
     * @param {Object|SystemComponent} configOrComponent - Config object (legacy) or SystemComponent instance (new)
     */
    registerSystem(id, configOrComponent = {}) {
        let system;

        // NEW PATTERN: SystemComponent instance (Phase 3.5)
        // Detect by checking for id, priority properties and update/render methods
        const isComponentInstance = configOrComponent &&
                                   typeof configOrComponent === 'object' &&
                                   configOrComponent.id &&
                                   typeof configOrComponent.priority === 'number' &&
                                   typeof configOrComponent.update === 'function';

        if (isComponentInstance) {
            // SystemComponent instance pattern
            const component = configOrComponent;
            system = {
                id: component.id,
                update: component.update ? component.update.bind(component) : null,
                render: component.render ? component.render.bind(component) : null,
                priority: component.priority,
                enabled: component.enabled !== false,
                data: component.data || {},
                componentInstance: component // Keep reference for hot-reload detection
            };

            console.log(`JSEngine: Registered SystemComponent '${component.id}' (priority: ${component.priority}, ECS pattern)`);
        } else {
            // LEGACY PATTERN: Config object (backward compatibility)
            if (!id || typeof id !== 'string') {
                console.log('JSEngine: System ID must be a non-empty string (legacy pattern)');
                return false;
            }

            system = {
                id: id,
                update: configOrComponent.update || null,
                render: configOrComponent.render || null,
                priority: configOrComponent.priority || 0,
                enabled: configOrComponent.enabled !== false,
                data: configOrComponent.data || {}
            };

            console.log(`JSEngine: Registered system '${id}' (priority: ${system.priority}, legacy pattern)`);
        }

        this.registeredSystems.set(system.id, system);
        this.queueOperation({type: 'register', system});

        return true;
    }

    /**
     * Unregister a system
     */
    unregisterSystem(id) {
        if (!this.registeredSystems.has(id)) {
            console.warn(`JSEngine: System '${id}' not found`);
            return false;
        }

        this.queueOperation({type: 'unregister', id});
        console.log(`JSEngine: Queued unregistration for system '${id}'`);
        return true;
    }

    /**
     * Enable or disable a system
     */
    setSystemEnabled(id, enabled) {
        const system = this.registeredSystems.get(id);
        if (!system) {
            console.warn(`JSEngine: System '${id}' not found`);
            return false;
        }

        system.enabled = enabled;
        console.log(`JSEngine: System '${id}' ${enabled ? 'enabled' : 'disabled'}`);
        return true;
    }

    /**
     * Get system information
     */
    getSystem(id) {
        return this.registeredSystems.get(id) || null;
    }

    /**
     * List all registered systems
     */
    listSystems() {
        return Array.from(this.registeredSystems.keys()).map(id => {
            const sys = this.registeredSystems.get(id);
            return {
                id: sys.id,
                enabled: sys.enabled,
                priority: sys.priority,
                hasUpdate: sys.update !== null,
                hasRender: sys.render !== null
            };
        });
    }


    // ============================================================================
    // INTERNAL SYSTEM MANAGEMENT
    // ============================================================================

    queueOperation(operation) {
        this.pendingOperations.push(operation);
    }

    processOperations() {
        for (const op of this.pendingOperations) {
            if (op.type === 'register') {
                this.addSystemToLists(op.system);
            } else if (op.type === 'unregister') {
                this.removeSystemFromLists(op.id);
            }
        }
        this.pendingOperations = [];
    }

    addSystemToLists(system) {
        if (system.update && typeof system.update === 'function') {
            this.updateSystems.push(system);
            this.updateSystems.sort((a, b) => a.priority - b.priority);
        }

        if (system.render && typeof system.render === 'function') {
            this.renderSystems.push(system);
            this.renderSystems.sort((a, b) => a.priority - b.priority);
        }

        console.log(`JSEngine: System '${system.id}' added to execution lists`);
    }

    removeSystemFromLists(id) {
        this.updateSystems = this.updateSystems.filter(sys => sys.id !== id);
        this.renderSystems = this.renderSystems.filter(sys => sys.id !== id);
        this.registeredSystems.delete(id);

        console.log(`JSEngine: System '${id}' removed from all lists`);
    }

    /**
     * Update method - called by C++ engine
     * Now processes both game and registered systems
     */
    update(gameDeltaSeconds, systemDeltaSeconds) {
        if (!this.isInitialized) {
            return;
        }

        this.frameCount++;
        this.processOperations();

        // Execute all registered update systems
        for (const system of this.updateSystems) {
            if (system.enabled && system.update) {
                try {
                    // Pass both gameDeltaSeconds and systemDeltaSeconds to allow systems to choose
                    system.update(gameDeltaSeconds, systemDeltaSeconds);
                } catch (error) {
                    console.log(`JSEngine: Error in system '${system.id}' update:`, error);
                }
            }
        }
    }

    /**
     * Render method - called by C++ engine
     * Now processes both game and registered systems
     */
    render() {
        if (!this.isInitialized) {
            return;
        }

        // Execute all registered render systems
        for (const system of this.renderSystems) {
            if (system.enabled && system.render) {
                try {
                    system.render();
                } catch (error) {
                    console.log(`JSEngine: Error in system '${system.id}' render:`, error);
                }
            }
        }
    }

    /**
     * C++ Engine interface methods - called by JSGame
     * These bridge to the actual C++ engine functions
     */
    updateCppEngine(gameDeltaSeconds, systemDeltaSeconds) {
        if (typeof game !== 'undefined' && game.update) {
            game.update(gameDeltaSeconds || 0.0, systemDeltaSeconds || 0.0);
            return true;
        }
        console.warn('JSEngine: C++ game.update not available');
        return false;
    }

    renderCppEngine() {
        if (typeof game !== 'undefined' && game.render) {
            game.render();
            return true;
        }
        console.warn('JSEngine: C++ game.render not available');
        return false;
    }

    /**
     * Helper methods for game to use C++ engine functions
     */
    createCube(x, y, z) {
        if (typeof game !== 'undefined' && game.createCube) {
            game.createCube(x, y, z);
            console.log(`JSEngine: Created cube at (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`);
            return true;
        }
        console.warn('JSEngine: createCube not available');
        return false;
    }

    moveProp(index, x, y, z) {
        if (typeof game !== 'undefined' && game.moveProp) {
            game.moveProp(index, x, y, z);
            console.log(`JSEngine: Moved prop ${index} to (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`);
            return true;
        }
        console.warn('JSEngine: moveProp not available');
        return false;
    }

    getPlayerPosition() {
        if (typeof game !== 'undefined' && game.getPlayerPos) {
            return game.getPlayerPos();
        }
        console.warn('JSEngine: getPlayerPos not available');
        return {x: 0, y: 0, z: 0};
    }

    moveCamera(x, y, z) {
        if (typeof game !== 'undefined' && game.movePlayerCamera) {
            game.movePlayerCamera(x, y, z);
            return true;
        }
        console.warn('JSEngine: movePlayerCamera not available');
        return false;
    }

    /**
     * Get engine status
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            hasGame: this.game !== null,
            frameCount: this.frameCount,
            systemCount: this.registeredSystems.size,
            updateSystemCount: this.updateSystems.length,
            renderSystemCount: this.renderSystems.length,
            pendingOperations: this.pendingOperations.length,
            hotReloadEnabled: this.hotReloadEnabled // C++ hot-reload system status
        };
    }
}

console.log('JSEngine: Module loaded (Phase 4 ES6)');
