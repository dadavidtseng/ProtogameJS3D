//----------------------------------------------------------------------------------------------------
// Subsystem.js - Abstract base class for all game systems
//----------------------------------------------------------------------------------------------------

/**
 * Subsystem - Abstract base class for all game systems
 * Following Starship ECS pattern (like InputComponent base class)
 *
 * All systems must extend this class and implement:
 * - update(gameDelta, systemDelta) method
 * - render() method (optional)
 *
 * Design Philosophy:
 * - Each system = separate file (AI agent can edit independently)
 * - JSGame.js coordinates systems, doesn't contain system logic
 * - JSEngine.js executes registered systems
 *
 * Hot-Reload Support:
 * - Static version property for change detection
 * - Lifecycle hooks: onBeforeReload() / onAfterReload()
 * - Automatic state preservation and restoration
 */
export class Subsystem
{
    id;
    priority;
    enabled;
    data;
    /**
     * @param {string} id - Unique system identifier
     * @param {number} priority - Execution priority (0-100, lower = earlier)
     * @param {Object} config - Optional configuration
     */
    constructor(id, priority = 50, config = {}) {
        // Prevent direct instantiation of abstract base class
        if (new.target === Subsystem) {
            throw new Error('Subsystem is abstract and cannot be instantiated directly. Extend it instead.');
        }

        // Validate required parameters
        if (!id || typeof id !== 'string') {
            throw new Error('Subsystem requires a valid string id');
        }

        if (typeof priority !== 'number') {
            throw new Error('Subsystem priority must be a number');
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
            hasUpdate: this.update !== Subsystem.prototype.update,
            hasRender: this.render !== Subsystem.prototype.render,
            dataKeys: Object.keys(this.data)
        };
    }

    /**
     * Static version for hot-reload detection
     * Automatically updated by hot-reload system when file changes
     * Override with static version = 1; in subclass
     */
    static version = 0;

    /**
     * Get component class version
     * Useful for hot-reload detection
     */
    getVersion() {
        return this.constructor.version;
    }

    // ============================================================================
    // HOT-RELOAD LIFECYCLE HOOKS (Override in subclass)
    // ============================================================================

    /**
     * Called BEFORE hot-reload destroys this instance
     * Override to preserve custom state
     * @returns {Object} State object to preserve during hot-reload
     */
    onBeforeReload() {
        // Default implementation: preserve basic state
        return {
            id: this.id,
            priority: this.priority,
            enabled: this.enabled,
            data: this.data
        };
    }

    /**
     * Called AFTER hot-reload creates new instance
     * Override to restore custom state
     * @param {Object} preservedState - State returned from onBeforeReload()
     */
    onAfterReload(preservedState) {
        // Default implementation: restore basic state
        if (preservedState) {
            this.enabled = preservedState.enabled;
            this.data = preservedState.data || this.data;
        }
    }

    /**
     * Helper method to check if hot-reload is needed
     * @param {number} currentVersion - Current tracked version
     * @returns {boolean} True if reload is needed
     */
    static needsReload(currentVersion) {
        return this.version > currentVersion;
    }
}

// Make Subsystem available for import
// No globalThis registration - clean ES6 module pattern
console.log('Subsystem: Base class loaded (ECS architecture with hot-reload support)');
