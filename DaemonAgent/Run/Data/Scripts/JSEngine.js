//----------------------------------------------------------------------------------------------------
// JSEngine.js - Core JavaScript Engine Framework
//----------------------------------------------------------------------------------------------------

// === Global Setup ===
import { EventBus } from './Event/EventBus.js';  // Event system for dependency inversion

/**
 * JSEngine - Core JavaScript engine with system registration framework
 *
 * Responsibilities:
 * - Register and manage game systems
 * - Execute systems in priority order
 * - Bridge C++ engine methods to JavaScript
 * - Handle automatic hot-reload detection and system replacement
 *
 * Design Philosophy:
 * - This file is CORE INFRASTRUCTURE - rarely edited
 * - Systems register with JSEngine and execute every frame
 * - Priority-based execution (0-100, lower = earlier)
 * - Dual pattern support: legacy config objects + Subsystem instances
 * - Automatic hot-reload for modified Subsystem instances
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

        // Event System (Phase 4.5: Dependency Inversion Principle)
        this.eventBus = new EventBus();
        console.log('JSEngine: EventBus created (global event system)');

        // Make EventBus globally accessible for subsystems
        globalThis.eventBus = this.eventBus;

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
     * @param {string|null} id - Unique system identifier (legacy) or null (new Subsystem pattern)
     * @param {Object|Subsystem} configOrComponent - Config object (legacy) or Subsystem instance (new)
     */
    registerSystem(id, configOrComponent = {}) {
        let system;

        // NEW PATTERN: Subsystem instance (Phase 3.5)
        // Detect by checking for id, priority properties and update/render methods
        const isComponentInstance = configOrComponent &&
            typeof configOrComponent === 'object' &&
            configOrComponent.id &&
            typeof configOrComponent.priority === 'number' &&
            typeof configOrComponent.update === 'function';

        if (isComponentInstance) {
            // Subsystem instance pattern
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
        }
        else {
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
        this.queueOperation({ type: 'register', system });

        return true;
    }

    /**
     * Unregister a system
     */
    unregisterSystem(id) {
        if (!this.registeredSystems.has(id)) {
            console.log(`JSEngine: System '${id}' not found`);
            return false;
        }

        this.queueOperation({ type: 'unregister', id });
        console.log(`JSEngine: Queued unregistration for system '${id}'`);
        return true;
    }

    /**
     * Enable or disable a system
     */
    setSystemEnabled(id, enabled) {
        const system = this.registeredSystems.get(id);
        if (!system) {
            console.log(`setSystemEnabled JSEngine: System '${id}' not found`);
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
            }
            else if (op.type === 'unregister') {
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

    // ============================================================================
    // HOT-RELOAD SYSTEM (Method Replacement)
    // ============================================================================

    /**
     * Check for hot-reloads and upgrade system instances automatically
     * Called every frame to detect when C++ has reloaded module files
     */
    checkForHotReloads() {
        for (const [id, system] of this.registeredSystems) {
            const instance = system.componentInstance;
            if (!instance) continue; // Skip legacy systems

            try {
                // Get the class name and try to find it in global scope
                const className = instance.constructor.name;
                const GlobalClass = globalThis[className];

                if (!GlobalClass) continue; // Class not in global scope

                // Check if constructor function changed (class was reloaded)
                if (instance.constructor !== GlobalClass) {
                    console.log(`JSEngine: Hot-reload detected for '${id}', upgrading instance methods`);
                    this.upgradeInstanceMethods(instance, GlobalClass);

                    // Update prototype chain to point to new class
                    Object.setPrototypeOf(instance, GlobalClass.prototype);

                    // Rebind methods in system registry
                    system.update = instance.update ? instance.update.bind(instance) : null;
                    system.render = instance.render ? instance.render.bind(instance) : null;

                    console.log(`JSEngine: Hot-reload complete for '${id}'`);
                }
            } catch (e) {
                // Silently ignore errors (class might not be in global scope)
            }
        }
    }

    /**
     * Upgrade instance methods with new class definition
     * Replaces all methods from old class with methods from new class
     *
     * @param {Object} instance - Existing instance to upgrade
     * @param {Function} NewClass - New class definition with updated methods
     */
    upgradeInstanceMethods(instance, NewClass) {
        const proto = NewClass.prototype;
        const methodNames = Object.getOwnPropertyNames(proto);

        let upgradedCount = 0;

        for (const methodName of methodNames) {
            if (methodName === 'constructor') continue;

            const descriptor = Object.getOwnPropertyDescriptor(proto, methodName);
            if (descriptor && typeof descriptor.value === 'function') {
                // Replace method with new version (bound to instance)
                instance[methodName] = descriptor.value.bind(instance);
                upgradedCount++;
            }
        }

        console.log(`JSEngine: Upgraded ${upgradedCount} methods for '${instance.id}'`);
    }

    // ============================================================================
    // CALLBACK PROCESSING (Phase 2.4)
    // ============================================================================

    /**
     * Process callbacks from C++ CallbackQueue
     * Dequeues all available callbacks and executes them
     * Called at start of update() to ensure callbacks processed early in frame
     */
    processCallbacks() {
        // Check if callbackQueue is available (exposed by CallbackQueueScriptInterface)
        if (typeof globalThis.callbackQueue === 'undefined' || !globalThis.callbackQueue) {
            // CallbackQueue not yet registered - skip processing
            // This is expected during early initialization
            return;
        }

        try {
            // Dequeue all callbacks from C++ queue
            // Phase 2.4 Type Safety: V8 auto-parses JSON string to JavaScript array
            // C++ returns JSON string via ScriptMethodResult::Success(jsonString)
            // V8 automatically deserializes it to JavaScript objects
            const callbacks = globalThis.callbackQueue.dequeueAll();

            // Skip diagnostic logging - callbacks are working correctly now

            // Skip if no callbacks (null, undefined, or empty array)
            // Phase 2.4: V8 returns already-parsed array, not JSON string
            if (!callbacks || !Array.isArray(callbacks) || callbacks.length === 0) {
                return;
            }

            // Process each callback
            for (const cb of callbacks) {
                this.executeCallback(cb);
            }

        } catch (error) {
            // Phase 2.4: Suppress JSON parse errors for empty callback queues
            // This is expected behavior when no callbacks are pending
            if (error.message && error.message.includes('JSON')) {
                // Silent skip - this is normal when queue is empty
                return;
            }

            // Log other unexpected errors
            console.log(`JSEngine: Error processing callbacks: ${error.message}`);
            if (error.stack) {
                console.log(`Stack: ${error.stack}`);
            }
        }
    }

    /**
     * Execute a single callback from C++
     * Looks up callback handler in game/systems and invokes it
     *
     * @param {Object} callbackData - Callback data from C++
     *   {callbackId, resultId, errorMessage, type}
     */
    executeCallback(callbackData) {
        try {
            const {callbackId, resultId, errorMessage, resultJson, type} = callbackData;

            // Callback execution - routing to appropriate API handler
            // Task 8.5: All async operations now route through GENERIC → CommandQueueAPI.
            // Per-type routing (ENTITY_CREATED, CAMERA_CREATED, RESOURCE_LOADED) removed
            // after migration to GenericCommand pipeline (Tasks 8.1–8.4).

            // Route callback to appropriate handler based on type
            switch (type) {
                case 'GENERIC':
                    // Unified callback path for all GenericCommand operations
                    if (globalThis.CommandQueueAPI && globalThis.CommandQueueAPI.handleCallback) {
                        globalThis.CommandQueueAPI.handleCallback(callbackId, resultId, errorMessage, resultJson);
                    } else {
                        console.log(`JSEngine: CommandQueueAPI callback handler not available for callback ${callbackId}`);
                    }
                    break;

                default:
                    // Legacy callback types (ENTITY_CREATED, CAMERA_CREATED, RESOURCE_LOADED)
                    // have been migrated to GENERIC via GenericCommand pipeline.
                    // If you see this warning, old ScriptInterface async methods are still in use.
                    console.log(`JSEngine: Deprecated callback type '${type}' for callback ${callbackId} — use GenericCommand methods instead`);
                    break;
            }

        } catch (error) {
            console.log(`JSEngine: Error executing callback: ${error.message}`);
            if (error.stack) {
                console.log(`Stack: ${error.stack}`);
            }
        }
    }


    /**
     * Update method - called by C++ engine
     * Now processes both game and registered systems
     */
    update(systemDeltaSeconds) {
        if (!this.isInitialized) {
            return;
        }

        this.frameCount++;
        this.processOperations();

        // Phase 2.4: Process callbacks from C++ BEFORE system updates
        // This ensures callbacks are handled early in the frame
        this.processCallbacks();

        // AUTOMATIC HOT-RELOAD: Check for module reloads every frame
        if (this.hotReloadEnabled) {
            this.checkForHotReloads();
        }

        // Advance the JS game clock with the system delta from C++
        if (jsGameInstance && jsGameInstance.gameClock) {
            jsGameInstance.gameClock.advance(systemDeltaSeconds);
        }

        // Execute all registered update systems
        for (const system of this.updateSystems) {
            if (system.enabled && system.update) {
                try {
                    // Pass both gameDeltaSeconds and systemDeltaSeconds to allow systems to choose
                    system.update(jsGameInstance.gameClock.getDeltaSeconds(), systemDeltaSeconds);

                } catch (error) {
                    // Enhanced error logging with multiple fallbacks
                    if (error instanceof Error) {
                        console.log(`JSEngine: Error in system '${system.id}' update: ${error.message}`);
                        console.log(`Stack: ${error.stack}`);
                    }
                    else {
                        console.log(`JSEngine: Error in system '${system.id}' update: ${JSON.stringify(error)}`);
                    }
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
                    // Enhanced error logging with multiple fallbacks
                    if (error instanceof Error) {
                        console.log(`JSEngine: Error in system '${system.id}' render: ${error.message}`);
                        console.log(`Stack: ${error.stack}`);
                    }
                    else {
                        console.log(`JSEngine: Error in system '${system.id}' render: ${JSON.stringify(error)}`);
                    }
                }
            }
        }
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
