//----------------------------------------------------------------------------------------------------
// MeshComponent.js
// Phase 2: High-level mesh rendering component using EntityAPI
// Migrated from low-level RendererInterface to high-level entity system
//----------------------------------------------------------------------------------------------------

import {Component} from '../../Core/Component.js';
import {EntityAPI} from '../../Interface/EntityAPI.js';

/**
 * MeshComponent - Manages entity creation and state synchronization (Phase 2)
 *
 * Phase 2 Migration Changes:
 * - Uses EntityAPI instead of RendererInterface
 * - Calls createMesh() once at initialization
 * - C++ handles all rendering automatically
 * - JavaScript only syncs state (position, color, orientation)
 *
 * Architecture:
 * - JavaScript: Game logic and state management
 * - C++: Rendering and geometry management
 * - Coordinate System: X-forward, Y-left, Z-up
 *
 * Features:
 * - High-level entity creation (cube, sphere, grid, plane)
 * - Automatic C++ rendering through EntityStateBuffer
 * - State synchronization (position, orientation, color)
 * - Error resilient callbacks
 *
 * Requires:
 * - GameObject with position, orientation properties
 * - EntityAPI (wrapper for C++ entity interface)
 *
 * Usage:
 * ```javascript
 * const mesh = new MeshComponent('cube', {r: 255, g: 0, b: 0, a: 255}, 1.0);
 * gameObject.addComponent(mesh);
 * ```
 */
export class MeshComponent extends Component
{
    // Version tracking for hot-reload detection
    static version = 2; // Incremented when adding EntityAPI hot-reload support

    /**
     * @param {string} meshType - Geometry type ('cube', 'sphere', 'grid', 'plane')
     * @param {Object} color - Initial color {r, g, b, a} (default: white)
     * @param {number} scale - Uniform scale factor (default: 1.0)
     * @param {number} textureId - Opaque texture handle from ResourceAPI.loadTexture (default: 0 = white)
     */
    constructor(meshType, color = {r: 255, g: 255, b: 255, a: 255}, scale = 1.0, textureId = 0)
    {
        super('mesh');

        this.meshType = meshType;
        this.color = color;
        this.scale = scale;
        this.textureId = textureId;
        this.entityId = null;           // C++ entity ID (null = not created yet)
        this.entityAPI = new EntityAPI();
        this.entityAPIVersion = EntityAPI.version; // Track version for hot-reload
        this.isCreating = false;        // Track async creation state

        console.log(`MeshComponent: Created with meshType=${meshType}, scale=${scale}, textureId=${textureId} (Phase 2)`);
    }

    /**
     * Initialize component (called when attached to GameObject)
     * Creates C++ entity with mesh geometry
     * @param {GameObject} gameObject
     */
    initialize(gameObject)
    {
        super.initialize(gameObject);

        // Ensure GameObject has required properties
        if (!this.gameObject.position)
        {
            this.gameObject.position = {x: 0, y: 0, z: 0};
        }
        if (!this.gameObject.orientation)
        {
            this.gameObject.orientation = {yaw: 0, pitch: 0, roll: 0};
        }

        // Create C++ entity asynchronously
        this.createEntity();

        console.log('MeshComponent: Initialized for GameObject (Phase 2)');
    }

    /**
     * Create C++ entity through high-level EntityAPI (Phase 2)
     * Replaces old low-level vertex array creation
     */
    createEntity()
    {
        // Hot-reload detection: Recreate EntityAPI if version changed
        if (EntityAPI.version > this.entityAPIVersion)
        {
            console.log(`MeshComponent: EntityAPI hot-reloaded (version ${this.entityAPIVersion} -> ${EntityAPI.version}), creating new instance`);
            this.entityAPI = new EntityAPI();
            this.entityAPIVersion = EntityAPI.version;
        }

        console.log(`MeshComponent: createEntity() called for ${this.meshType}`);
        console.log(`MeshComponent: EntityAPI available? ${this.entityAPI.isAvailable()}`);

        if (!this.entityAPI.isAvailable())
        {
            console.log('MeshComponent: ERROR - EntityAPI not available!');
            console.log('MeshComponent: EntityAPI status:', this.entityAPI.getStatus());
            return;
        }

        if (this.isCreating)
        {
            console.log('MeshComponent: Entity creation already in progress');
            return;
        }

        this.isCreating = true;

        // Prepare mesh properties
        const properties = {
            position: [
                this.gameObject.position.x,
                this.gameObject.position.y,
                this.gameObject.position.z
            ],
            scale: this.scale,
            color: [
                this.color.r,
                this.color.g,
                this.color.b,
                this.color.a
            ],
            textureId: this.textureId
        };

        console.log(`MeshComponent: Calling entityAPI.createMesh with meshType=${this.meshType}, properties=`, properties);

        // Create mesh asynchronously (C++ will create geometry and return entity ID)
        this.entityAPI.createMesh(this.meshType, properties, (entityId) => {
            this.isCreating = false;

            console.log(`MeshComponent: Callback received with entityId=${entityId}`);

            if (entityId === 0)
            {
                console.log(`MeshComponent: ERROR - Failed to create ${this.meshType} entity`);
                return;
            }

            this.entityId = entityId;
            console.log(`MeshComponent: Created ${this.meshType} entity with ID ${entityId} (Phase 2)`);
        });

        console.log(`MeshComponent: createMesh call completed (async)`);
    }

    /**
     * Update component - Sync GameObject state to C++ entity
     * Called every frame by GameObject update system
     * @param {number} deltaTime - Time since last update
     */
    async update(deltaTime)
    {
        // Hot-reload detection: Recreate EntityAPI if version changed
        if (EntityAPI.version > this.entityAPIVersion)
        {
            console.log(`MeshComponent: EntityAPI hot-reloaded (version ${this.entityAPIVersion} -> ${EntityAPI.version}), creating new instance`);
            this.entityAPI = new EntityAPI();
            this.entityAPIVersion = EntityAPI.version;
        }

        if (!this.entityId || !this.entityAPI.isAvailable())
        {
            return; // Entity not created yet or API unavailable
        }

        // Sync position to C++ entity
        const position = [
            this.gameObject.position.x,
            this.gameObject.position.y,
            this.gameObject.position.z
        ];
        await this.entityAPI.updatePosition(this.entityId, position);

        // Sync orientation to C++ entity
        const orientation = [
            this.gameObject.orientation.yaw,
            this.gameObject.orientation.pitch,
            this.gameObject.orientation.roll
        ];
        await this.entityAPI.updateOrientation(this.entityId, orientation);

        // Sync color if changed (optional optimization: only sync on change)
        const color = [this.color.r, this.color.g, this.color.b, this.color.a];
        await this.entityAPI.updateColor(this.entityId, color);
    }

    /**
     * Render method - No longer performs rendering (C++ handles it)
     * Phase 2: C++ automatically renders all entities in EntityStateBuffer
     * This method can be removed or kept empty for compatibility
     */
    render()
    {
        // Phase 2: No rendering code needed!
        // C++ App::Render() automatically draws all entities in EntityStateBuffer
        // JavaScript only needs to keep state synchronized via update()
    }

    /**
     * Set mesh color (for behavior-driven color changes)
     * Color will be synced to C++ on next update()
     * @param {Object} color - Color {r, g, b, a}
     */
    async setColor(color)
    {
        this.color = color;

        // Immediately sync to C++ if entity exists
        if (this.entityId && this.entityAPI.isAvailable())
        {
            const colorArray = [color.r, color.g, color.b, color.a];
            await this.entityAPI.updateColor(this.entityId, colorArray);
        }
    }

    /**
     * Get current mesh color
     * @returns {Object} Color {r, g, b, a}
     */
    getColor()
    {
        return this.color;
    }

    /**
     * Move entity by relative delta
     * Convenience method for behavior components
     * @param {number} dx - Delta X (forward)
     * @param {number} dy - Delta Y (left)
     * @param {number} dz - Delta Z (up)
     */
    async moveBy(dx, dy, dz)
    {
        if (this.entityId && this.entityAPI.isAvailable())
        {
            await this.entityAPI.moveBy(this.entityId, [dx, dy, dz]);

            // Update GameObject position for consistency
            this.gameObject.position.x += dx;
            this.gameObject.position.y += dy;
            this.gameObject.position.z += dz;
        }
    }

    /**
     * Cleanup - Destroy C++ entity when component is destroyed
     */
    async destroy()
    {
        if (this.entityId && this.entityAPI.isAvailable())
        {
            await this.entityAPI.destroyEntity(this.entityId);
            console.log(`MeshComponent: Destroyed entity ${this.entityId} (Phase 2)`);
            this.entityId = null;
        }

        super.destroy();
    }

    /**
     * Get component status for debugging
     */
    getStatus()
    {
        return {
            ...super.getStatus(),
            meshType: this.meshType,
            entityId: this.entityId,
            isCreating: this.isCreating,
            scale: this.scale,
            color: this.color,
            apiAvailable: this.entityAPI.isAvailable()
        };
    }
}

// Export for ES6 module system
export default MeshComponent;

// Export to globalThis for hot-reload detection
globalThis.MeshComponent = MeshComponent;

console.log(`MeshComponent: Loaded (Phase 2 - High-Level Entity API, version ${MeshComponent.version})`);
