//----------------------------------------------------------------------------------------------------
// HotReloadRegistry.js
// Centralized hot-reload tracking WITHOUT polluting globalThis
//----------------------------------------------------------------------------------------------------

/**
 * HotReloadRegistry - Manages hot-reload state without global namespace pollution
 *
 * Instead of:
 *   globalThis.Player = Player;
 *   globalThis.Prop = Prop;
 *   globalThis.InputSystem = InputSystem;
 *
 * Use:
 *   HotReloadRegistry.register('Player', Player);
 *   HotReloadRegistry.register('Prop', Prop);
 *
 * Benefits:
 * - Single global object: globalThis.__hotReload
 * - No naming collisions
 * - Automatic version tracking
 * - Memory leak prevention
 * - Debugging utilities
 */
class HotReloadRegistry {
    constructor() {
        // Initialize registry namespace
        if (!globalThis.__hotReload) {
            globalThis.__hotReload = {
                version: 1,
                classes: new Map(),      // className → {class, version, timestamp}
                instances: new WeakMap(), // instance → metadata
                modules: new Map(),      // modulePath → {exports, version, timestamp}
                stats: {
                    registrations: 0,
                    reloads: 0,
                    failures: 0
                }
            };
        }

        this.registry = globalThis.__hotReload;
    }

    /**
     * Register a class for hot-reload tracking
     * @param {string} className - Unique class name
     * @param {Function} classConstructor - Class constructor
     * @param {Object} options - Optional metadata
     */
    register(className, classConstructor, options = {}) {
        const existing = this.registry.classes.get(className);
        const version = existing ? existing.version + 1 : 1;

        this.registry.classes.set(className, {
            class: classConstructor,
            version,
            timestamp: Date.now(),
            modulePath: options.modulePath || 'unknown',
            parentClass: options.parentClass || null
        });

        this.registry.stats.registrations++;

        console.log(`HotReloadRegistry: Registered '${className}' (v${version})`);
    }

    /**
     * Get registered class
     * @param {string} className - Class name
     * @returns {Function|null} Class constructor or null
     */
    getClass(className) {
        const entry = this.registry.classes.get(className);
        return entry ? entry.class : null;
    }

    /**
     * Check if class has been updated (for hot-reload detection)
     * @param {string} className - Class name
     * @param {number} currentVersion - Current tracked version
     * @returns {boolean} True if class was updated
     */
    hasUpdated(className, currentVersion) {
        const entry = this.registry.classes.get(className);
        return entry && entry.version > currentVersion;
    }

    /**
     * Get current version of class
     * @param {string} className - Class name
     * @returns {number} Current version number
     */
    getVersion(className) {
        const entry = this.registry.classes.get(className);
        return entry ? entry.version : 0;
    }

    /**
     * Track live instance (for hot-reload method replacement)
     * @param {Object} instance - Live instance
     * @param {string} className - Class name
     */
    trackInstance(instance, className) {
        this.registry.instances.set(instance, {
            className,
            createdAt: Date.now(),
            version: this.getVersion(className)
        });
    }

    /**
     * Get all registered classes
     * @returns {Array<string>} Array of class names
     */
    listClasses() {
        return Array.from(this.registry.classes.keys());
    }

    /**
     * Get registry statistics
     * @returns {Object} Statistics object
     */
    getStats() {
        return {
            ...this.registry.stats,
            classCount: this.registry.classes.size,
            moduleCount: this.registry.modules.size
        };
    }

    /**
     * Clear registry (for testing/debugging)
     */
    clear() {
        this.registry.classes.clear();
        this.registry.modules.clear();
        this.registry.stats = {
            registrations: 0,
            reloads: 0,
            failures: 0
        };
        console.log('HotReloadRegistry: Cleared all registrations');
    }

    /**
     * Debug: Print all registered classes
     */
    debug() {
        console.log('=== HotReloadRegistry Debug ===');
        console.log('Total classes:', this.registry.classes.size);
        console.log('Total modules:', this.registry.modules.size);
        console.log('Statistics:', this.registry.stats);
        console.log('\nRegistered Classes:');
        for (const [name, data] of this.registry.classes.entries()) {
            console.log(`  - ${name} (v${data.version}) from ${data.modulePath}`);
        }
    }
}

// Create singleton instance
const hotReloadRegistry = new HotReloadRegistry();

// Export for ES6 module system
export {hotReloadRegistry, HotReloadRegistry};

// ONLY ONE GLOBAL: __hotReload namespace
// NO polluting globalThis with individual class names!

console.log('HotReloadRegistry: Centralized hot-reload tracking initialized');
