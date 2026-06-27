//----------------------------------------------------------------------------------------------------
// Component.js
// Base class for all game components
// Inspired by Starship component architecture
//----------------------------------------------------------------------------------------------------

/**
 * Base Component class - Abstract base for all components
 *
 * Components are modular, reusable pieces of functionality that can be attached to GameObjects.
 * Each component handles a specific responsibility (input, movement, rendering, etc.)
 *
 * Design Principles:
 * - Single Responsibility: Each component does ONE thing well
 * - Composition over Inheritance: GameObjects compose components
 * - Hot-Reload Friendly: Components can be modified without C++ rebuild
 * - AI Agent Friendly: One component = one file
 *
 * Lifecycle:
 * - constructor() - Component initialization
 * - initialize(gameObject) - Called when attached to GameObject (optional)
 * - update(deltaTime) - Per-frame update (optional)
 * - destroy() - Cleanup when component is removed (optional)
 */
export class Component
{
    /**
     * @param {string} componentType - Unique identifier for this component type
     */
    constructor(componentType)
    {
        this.componentType = componentType;
        this.enabled = true;
        this.gameObject = null; // Reference to owning GameObject (set during attachment)

        console.log(`Component: ${componentType} created`);
    }

    /**
     * Called when component is attached to a GameObject
     * Override this to perform initialization that requires GameObject reference
     * @param {GameObject} gameObject - The GameObject this component is attached to
     */
    initialize(gameObject)
    {
        this.gameObject = gameObject;
        console.log(`Component: ${this.componentType} initialized for GameObject`);
    }

    /**
     * Called every frame if component is enabled
     * Override this to implement per-frame logic
     * @param {number} deltaTime - Time since last frame in milliseconds
     */
    update(deltaTime)
    {
        // Override in derived classes
    }

    /**
     * Called when component is removed from GameObject
     * Override this to perform cleanup
     */
    destroy()
    {
        console.log(`Component: ${this.componentType} destroyed`);
        this.gameObject = null;
    }

    /**
     * Enable this component
     */
    enable()
    {
        this.enabled = true;
    }

    /**
     * Disable this component (update won't be called)
     */
    disable()
    {
        this.enabled = false;
    }

    /**
     * Get component status for debugging
     */
    getStatus()
    {
        return {
            type: this.componentType,
            enabled: this.enabled,
            hasGameObject: this.gameObject !== null
        };
    }
}

// Export for ES6 module system
export default Component;

// Export to globalThis for hot-reload detection
globalThis.Component = Component;

console.log('Component: Base class loaded (Phase 1 - Foundation Layer)');
