//----------------------------------------------------------------------------------------------------
// Prop.js
// Prop GameObject - Demonstrates component-based architecture for props
//----------------------------------------------------------------------------------------------------

import {GameObject} from '../Core/GameObject.js';
import {MeshComponent} from '../Component/rendering/MeshComponent.js';
import {RotatePitchRollBehavior} from '../Component/behavior/RotatePitchRollBehavior.js';
import {PulseColorBehavior} from '../Component/behavior/PulseColorBehavior.js';
import {RotateYawBehavior} from '../Component/behavior/RotateYawBehavior.js';
import {StaticBehavior} from '../Component/behavior/StaticBehavior.js';
import {hotReloadRegistry} from '../Core/HotReloadRegistry.js';

/**
 * Prop - Prop GameObject with component composition
 *
 * Migrated from PropEntity.js to component-based architecture.
 * Composes MeshComponent for rendering and BehaviorComponent for logic.
 *
 * Prop Types (from PropEntity):
 * - Prop 0: Cube at (2, 2, 0) with rotate-pitch-roll behavior
 * - Prop 1: Cube at (-2, -2, 0) with pulse-color behavior
 * - Prop 2: Sphere at (10, -5, 1) with rotate-yaw behavior
 * - Prop 3: Grid at (0, 0, 0) with static behavior
 *
 * Implementation (Phase 4):
 * - MeshComponent for geometry and rendering
 * - BehaviorComponent for prop-specific logic
 *
 * Usage:
 * ```javascript
 * const prop = new Prop('cube', {x: 2, y: 2, z: 0}, 'rotate-pitch-roll');
 * prop.update(deltaTime); // Called every frame
 * prop.render(); // Called during rendering (Phase 2: C++ handles actual rendering)
 * ```
 */
export class Prop extends GameObject
{
    /**
     * @param {string} meshType - Geometry type ('cube', 'sphere', 'grid', 'plane')
     * @param {Object} position - Initial position {x, y, z}
     * @param {string} behaviorType - Behavior type ('rotate-pitch-roll', 'pulse-color', 'rotate-yaw', 'static', 'bounce')
     * @param {Object} color - Initial color {r, g, b, a} (default: white)
     * @param {number} scale - Uniform scale factor (default: 1.0)
     * @param {Object} options - Additional options
     * @param {boolean} options.enablePhysics - Enable bounce physics (default: false)
     * @param {Object} options.physicsConfig - Physics configuration (gravity, bounciness, mass)
     * @param {number} options.textureId - Opaque texture handle from ResourceAPI.loadTexture (default: 0 = white)
     */
    constructor(meshType, position, behaviorType, color = {r: 255, g: 255, b: 255, a: 255}, scale = 1.0, options = {})
    {
        super(`Prop_${meshType}_${behaviorType}`);

        console.log(`Prop: Constructing ${meshType} at (${position.x}, ${position.y}, ${position.z}) with ${behaviorType} behavior (Phase 2)`);

        // Set initial position and orientation
        this.position = position;
        this.orientation = {yaw: 0, pitch: 0, roll: 0};

        // Store physics options for later (after entity creation)
        this.enablePhysics = options.enablePhysics || false;
        this.physicsConfig = options.physicsConfig || {};

        // Component composition: MeshComponent (Phase 2 - no rendererSystem needed)
        const textureId = options.textureId || 0;
        this.mesh = new MeshComponent(meshType, color, scale, textureId);
        this.addComponent(this.mesh);

        // Component composition: BehaviorComponent
        this.behavior = this.createBehavior(behaviorType);
        this.addComponent(this.behavior);

        console.log('Prop: Prop GameObject created successfully');
        console.log('Prop: Components attached:', Array.from(this.components.keys()));
        console.log(`Prop: Physics enabled: ${this.enablePhysics}`);
    }

    /**
     * Create behavior component based on behavior type
     * @param {string} behaviorType - Behavior type string
     * @returns {BehaviorComponent} Behavior component instance
     */
    createBehavior(behaviorType)
    {
        switch (behaviorType)
        {
            case 'rotate-pitch-roll':
                return new RotatePitchRollBehavior();

            case 'pulse-color':
                return new PulseColorBehavior();

            case 'rotate-yaw':
                return new RotateYawBehavior();

            case 'static':
                return new StaticBehavior();

            default:
                console.log(`Prop: Unknown behavior type '${behaviorType}', using static behavior`);
                return new StaticBehavior();
        }
    }

    /**
     * Update prop (called by game update system)
     * @param {number} deltaTime - Time since last update in milliseconds
     */
    update(deltaTime)
    {
        // Call parent update (updates all components)
        super.update(deltaTime);

        // Check if we need to enable physics (only once after entity is created)
        if (this.enablePhysics && !this.physicsEnabled && this.mesh && this.mesh.entityId)
        {
            console.log(`Prop: Entity created with ID ${this.mesh.entityId}, enabling physics...`);

            // Get JSGame instance to add bounce physics
            const jsGameInstance = globalThis.jsGameInstance;
            if (jsGameInstance)
            {
                // Prepare physics config with initial position and gameObject reference
                const physicsConfig = {
                    ...this.physicsConfig,
                    initialPosition: [
                        this.position.x,
                        this.position.y,
                        this.position.z
                    ],
                    gameObject: this  // Pass reference for position sync
                };

                jsGameInstance.addPhysics(this.mesh.entityId, physicsConfig);
                this.physicsEnabled = true;
                console.log(`Prop: Physics enabled for entity ${this.mesh.entityId}`);
            }
            else
            {
                console.log('Prop: ERROR - globalThis.jsGameInstance not available for physics setup');
            }
        }
    }

    /**
     * Render prop (called by game render system)
     */
    render()
    {
        if (!this.active)
        {
            return;
        }

        // Render mesh component
        if (this.mesh)
        {
            this.mesh.render();
        }
    }

    /**
     * Get prop status for debugging
     */
    getPropStatus()
    {
        return {
            ...this.getStatus(),
            meshComponent: this.mesh ? this.mesh.getStatus() : null,
            behaviorComponent: this.behavior ? this.behavior.getStatus() : null
        };
    }
}

hotReloadRegistry.register('Prop', Prop, {
    modulePath: './objects/Prop.js',
    parentClass: 'GameObject'
});

console.log('Prop: GameObject class loaded (Phase 4 - Prop Migration)');
