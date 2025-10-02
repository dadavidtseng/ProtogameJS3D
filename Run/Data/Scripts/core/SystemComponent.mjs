//----------------------------------------------------------------------------------------------------
// SystemComponent.mjs - Abstract base class for all game systems
//----------------------------------------------------------------------------------------------------

/**
 * SystemComponent - Abstract base class for all game systems
 * Following Starship ECS pattern (like InputComponent base class)
 *
 * All systems must extend this class and implement:
 * - update(gameDelta, systemDelta) method
 * - render() method (optional)
 *
 * Design Philosophy:
 * - Each system = separate file (AI agent can edit independently)
 * - JSGame.mjs coordinates systems, doesn't contain system logic
 * - JSEngine.mjs executes registered systems
 */
export class SystemComponent {
    /**
     * @param {string} id - Unique system identifier
     * @param {number} priority - Execution priority (0-100, lower = earlier)
     * @param {Object} config - Optional configuration
     */
    constructor(id, priority = 50, config = {}) {
        // Prevent direct instantiation of abstract base class
        if (new.target === SystemComponent) {
            throw new Error('SystemComponent is abstract and cannot be instantiated directly. Extend it instead.');
        }

        // Validate required parameters
        if (!id || typeof id !== 'string') {
            throw new Error('SystemComponent requires a valid string id');
        }

        if (typeof priority !== 'number') {
            throw new Error('SystemComponent priority must be a number');
        }

        // Core properties
        this.id = id;
        this.priority = priority;
        this.enabled = config.enabled !== false; // Default: true
        this.data = config.data || {}; // System-specific data storage

        // Logging
        console.log(`SystemComponent: '${this.id}' created (priority: ${this.priority})`);
    }

    /**
     * Update method - called every frame with delta time
     * @param {number} gameDelta - Game time delta (pauses when game paused)
     * @param {number} systemDelta - System time delta (never pauses)
     */
    update(gameDelta, systemDelta) {
        // Override in subclass
        // Example:
        // update(gameDelta, systemDelta) {
        //     console.log(`${this.id} update called`);
        // }
    }

    /**
     * Render method - called every frame for rendering operations
     * Optional - only implement if system needs rendering
     */
    render() {
        // Override in subclass if needed
        // Example:
        // render() {
        //     console.log(`${this.id} render called`);
        // }
    }

    /**
     * Enable/disable this system
     * @param {boolean} enabled - True to enable, false to disable
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        console.log(`SystemComponent: '${this.id}' ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Get system status information
     * @returns {Object} Status object with id, priority, enabled, hasUpdate, hasRender
     */
    getStatus() {
        return {
            id: this.id,
            priority: this.priority,
            enabled: this.enabled,
            hasUpdate: this.update !== SystemComponent.prototype.update,
            hasRender: this.render !== SystemComponent.prototype.render,
            dataKeys: Object.keys(this.data)
        };
    }

    /**
     * Static version for hot-reload detection
     * Each component file should override this with Date.now()
     * Example in subclass:
     * static get version() { return Date.now(); }
     */
    static get version() {
        return 0;
    }

    /**
     * Get component instance version
     * Useful for hot-reload detection
     */
    getVersion() {
        return this.constructor.version;
    }
}

// Make SystemComponent available for import
// No globalThis registration - clean ES6 module pattern
console.log('SystemComponent: Base class loaded (ECS architecture)');
