//----------------------------------------------------------------------------------------------------
// GameObject.js
// Base class for all game objects
// Inspired by Starship GameObject architecture
//----------------------------------------------------------------------------------------------------

import {Component} from './Component.js';

/**
 * Base GameObject class - Container for components
 *
 * GameObjects are entities in the game world that compose components to define their behavior.
 * This follows the Entity-Component-System (ECS) architectural pattern.
 *
 * Design Principles:
 * - Composition Over Inheritance: Behavior defined by attached components
 * - Component Lifecycle Management: Automatic initialization and cleanup
 * - Hot-Reload Friendly: GameObject state preserved across reloads
 * - Flexible Architecture: Add/remove components at runtime
 *
 * Example Usage:
 * ```javascript
 * const player = new Player(scene);
 * player.addComponent(new KeyboardInputComponent());
 * player.addComponent(new MovementComponent());
 * player.update(deltaTime);
 * ```
 *
 * Lifecycle:
 * - constructor() - GameObject creation
 * - initialize() - Component attachment and setup
 * - update(deltaTime) - Per-frame updates (calls all component updates)
 * - destroy() - Cleanup and component destruction
 */
export class GameObject
{
    /**
     * @param {string} name - Human-readable name for this GameObject
     */
    constructor(name = 'GameObject')
    {
        this.name = name;
        this.active = true;
        this.components = new Map(); // componentType -> Component instance

        // Transform properties (for 3D GameObjects)
        this.position = {x: 0, y: 0, z: 0};
        this.rotation = {x: 0, y: 0, z: 0};
        this.scale = {x: 1, y: 1, z: 1};

        console.log(`GameObject: ${name} created`);
    }

    /**
     * Add a component to this GameObject
     * @param {Component} component - Component instance to attach
     * @returns {Component} The attached component (for chaining)
     */
    addComponent(component)
    {
        if (!(component instanceof Component))
        {
            console.log(`GameObject.addComponent: ${component} is not a Component instance`);
            return null;
        }

        if (this.components.has(component.componentType))
        {
            console.log(`GameObject: ${this.name} already has component ${component.componentType}, replacing`);
        }

        this.components.set(component.componentType, component);
        component.initialize(this);

        console.log(`GameObject: ${this.name} added component ${component.componentType}`);
        return component;
    }

    /**
     * Get a component by type
     * @param {string} componentType - Type identifier of the component
     * @returns {Component|null} The component instance or null if not found
     */
    getComponent(componentType)
    {
        return this.components.get(componentType) || null;
    }

    /**
     * Remove a component by type
     * @param {string} componentType - Type identifier of the component
     * @returns {boolean} True if component was removed
     */
    async removeComponent(componentType)
    {
        const component = this.components.get(componentType);
        if (component)
        {
            await component.destroy();
            this.components.delete(componentType);
            console.log(`GameObject: ${this.name} removed component ${componentType}`);
            return true;
        }
        return false;
    }

    /**
     * Check if GameObject has a specific component
     * @param {string} componentType - Type identifier to check
     * @returns {boolean} True if component exists
     */
    hasComponent(componentType)
    {
        return this.components.has(componentType);
    }

    /**
     * Update this GameObject and all its components
     * @param {number} deltaTime - Time since last frame in milliseconds
     */
    update(deltaTime)
    {
        if (!this.active)
        {
            return;
        }

        // Update all enabled components
        for (const [type, component] of this.components)
        {
            if (component.enabled && typeof component.update === 'function')
            {
                component.update(deltaTime);
            }
        }
    }

    /**
     * Set GameObject active state
     * @param {boolean} active - Active state
     */
    setActive(active)
    {
        this.active = active;
        console.log(`GameObject: ${this.name} setActive(${active})`);
    }

    /**
     * Destroy this GameObject and all its components
     */
    async destroy()
    {
        console.log(`GameObject: ${this.name} destroying...`);

        // Destroy all components
        for (const [type, component] of this.components)
        {
            await component.destroy();
        }

        this.components.clear();
        this.active = false;

        console.log(`GameObject: ${this.name} destroyed`);
    }

    /**
     * Get GameObject status for debugging
     */
    getStatus()
    {
        const componentList = Array.from(this.components.keys());
        return {
            name: this.name,
            active: this.active,
            position: {...this.position},
            components: componentList,
            componentCount: this.components.size
        };
    }
}

// Export for ES6 module system
export default GameObject;

// Export to globalThis for hot-reload detection
globalThis.GameObject = GameObject;

console.log('GameObject: Base class loaded (Phase 1 - Foundation Layer)');
