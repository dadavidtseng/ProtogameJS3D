//----------------------------------------------------------------------------------------------------
// EntityAPI.js
// High-Level Entity API — all operations routed through GenericCommand pipeline
// Part of the interface wrapper layer for C++/JavaScript bridge
//----------------------------------------------------------------------------------------------------

/**
 * EntityAPI - High-level abstraction over C++ entity system
 *
 * All operations are submitted via CommandQueue.submit() through the GenericCommand pipeline.
 * C++ handlers execute on the main thread; results are delivered via CallbackQueue.
 *
 * Design Principles:
 * - Single Responsibility: Only wraps entity operations
 * - Safe Fallbacks: Returns sensible defaults if CommandQueue unavailable
 * - Type Safety: Clear return types and parameter documentation
 * - Async Callbacks: Creation methods use callbacks for async results
 * - Async Everywhere: All methods return Promises for error detection and ordering
 * - Error Resilience: JavaScript errors should never crash C++ rendering
 *
 * Coordinate System: X-forward, Y-left, Z-up (right-handed)
 * - +X = forward
 * - +Y = left
 * - +Z = up
 *
 * GenericCommand Operations:
 * - create_mesh(meshType, properties) → callback(entityId)
 * - entity.update_position(entityId, x, y, z) → callback(success)
 * - entity.move_by(entityId, dx, dy, dz) → callback(success)
 * - entity.update_orientation(entityId, yaw, pitch, roll) → callback(success)
 * - entity.update_color(entityId, r, g, b, a) → callback(success)
 * - entity.destroy(entityId) → callback(success)
 *
 * Usage Example:
 * ```javascript
 * const entityAPI = new EntityAPI();
 *
 * // Create a cube mesh
 * entityAPI.createMesh('cube', {
 *     position: [0, 0, 0],
 *     scale: 1.0,
 *     color: [255, 255, 255, 255]
 * }, (entityId) => {
 *     console.log('Cube created with ID:', entityId);
 *
 *     // Move the entity
 *     entityAPI.updatePosition(entityId, [10, 0, 0]);
 * });
 * ```
 */
export class EntityAPI
{
    // Version tracking for hot-reload detection
    static version = 6; // FULLY FLATTENED API - All methods now use individual primitive arguments (createMesh, updatePosition, updateOrientation, updateColor, moveBy)

    constructor()
    {
        // Singleton pattern: Return existing instance if available
        if (globalThis.EntityAPI && globalThis.EntityAPI instanceof EntityAPI)
        {
            console.log('EntityAPI: Returning existing singleton instance');
            return globalThis.EntityAPI;
        }

        // Make instance globally accessible for JSEngine callback routing
        globalThis.EntityAPI = this;

        console.log(`EntityAPI: Initialized (GenericCommand pipeline, version ${EntityAPI.version})`);
    }

    //----------------------------------------------------------------------------------------------------
    // Entity Creation and Management (GenericCommand pipeline)
    //----------------------------------------------------------------------------------------------------

    /**
     * Create a mesh entity with specified type and properties (async)
     * Uses CommandQueue.submit("create_mesh") via GenericCommand pipeline.
     *
     * @param {string} meshType - Type of mesh: 'cube', 'sphere', 'grid', 'plane'
     * @param {Object} properties - Mesh properties
     * @param {Array<number>} properties.position - [x, y, z] position
     * @param {number} properties.scale - Uniform scale factor
     * @param {Array<number>} properties.color - [r, g, b, a] color (0-255)
     * @param {number} [properties.textureId] - Opaque texture handle from ResourceAPI.loadTexture (0 = default white)
     * @param {Function} callback - Callback function(entityId) called when mesh is created
     * @returns {number} callbackId (0 if submission failed)
     */
    createMesh(meshType, properties, callback)
    {
        // Get CommandQueue singleton
        const commandQueue = globalThis.CommandQueueAPI;
        if (!commandQueue || !commandQueue.isAvailable())
        {
            console.log('EntityAPI: ERROR - createMesh requires CommandQueue');
            if (callback) callback(0);
            return 0;
        }

        if (!meshType || typeof meshType !== 'string')
        {
            console.log('EntityAPI: ERROR - createMesh requires valid meshType string');
            if (callback) callback(0);
            return 0;
        }

        const position  = (properties && properties.position) || [0, 0, 0];
        const scale     = (properties && properties.scale) || 1.0;
        const color     = (properties && properties.color) || [255, 255, 255, 255];
        const textureId = (properties && properties.textureId) || 0;

        // Submit via GenericCommand pipeline
        const callbackId = commandQueue.submit(
            'create_mesh',
            { meshType, position, scale, color, textureId },
            'entity-api',
            (result) =>
            {
                if (callback)
                {
                    // Adapt GenericCommand result format to EntityAPI callback format
                    // GenericCommand: { success, resultId, error }
                    // EntityAPI callback: (entityId) where 0 = failure
                    callback(result.success ? result.resultId : 0);
                }
            }
        );

        return callbackId;
    }

    //----------------------------------------------------------------------------------------------------
    // Entity Update Methods (GenericCommand pipeline, fire-and-forget)
    //----------------------------------------------------------------------------------------------------

    /**
     * Update entity position (absolute)
     * Uses CommandQueue.submit("entity.update_position") via GenericCommand pipeline.
     *
     * @param {number} entityId - Entity ID to update
     * @param {Array<number>} position - [x, y, z] new position (X-forward, Y-left, Z-up)
     * @returns {Promise<void>} Resolves on success, rejects on failure
     */
    async updatePosition(entityId, position)
    {
        if (!Array.isArray(position) || position.length !== 3)
        {
            console.log('EntityAPI: ERROR - position must be [x, y, z] array');
            return;
        }

        return this._submit('entity.update_position', { entityId, x: position[0], y: position[1], z: position[2] });
    }

    /**
     * Move entity by relative delta
     * Uses CommandQueue.submit("entity.move_by") via GenericCommand pipeline.
     *
     * @param {number} entityId - Entity ID to move
     * @param {Array<number>} delta - [dx, dy, dz] movement delta (X-forward, Y-left, Z-up)
     * @returns {Promise<void>} Resolves on success, rejects on failure
     */
    async moveBy(entityId, delta)
    {
        if (!Array.isArray(delta) || delta.length !== 3)
        {
            console.log('EntityAPI: ERROR - delta must be [dx, dy, dz] array');
            return;
        }

        return this._submit('entity.move_by', { entityId, dx: delta[0], dy: delta[1], dz: delta[2] });
    }

    /**
     * Update entity orientation
     * Uses CommandQueue.submit("entity.update_orientation") via GenericCommand pipeline.
     *
     * @param {number} entityId - Entity ID to update
     * @param {Array<number>} orientation - [yaw, pitch, roll] in degrees
     * @returns {Promise<void>} Resolves on success, rejects on failure
     */
    async updateOrientation(entityId, orientation)
    {
        if (!Array.isArray(orientation) || orientation.length !== 3)
        {
            console.log('EntityAPI: ERROR - orientation must be [yaw, pitch, roll] array');
            return;
        }

        return this._submit('entity.update_orientation', { entityId, yaw: orientation[0], pitch: orientation[1], roll: orientation[2] });
    }

    /**
     * Update entity color
     * Uses CommandQueue.submit("entity.update_color") via GenericCommand pipeline.
     *
     * @param {number} entityId - Entity ID to update
     * @param {Array<number>} color - [r, g, b, a] color (0-255)
     * @returns {Promise<void>} Resolves on success, rejects on failure
     */
    async updateColor(entityId, color)
    {
        if (!Array.isArray(color) || color.length !== 4)
        {
            console.log('EntityAPI: ERROR - color must be [r, g, b, a] array');
            return;
        }

        return this._submit('entity.update_color', { entityId, r: color[0], g: color[1], b: color[2], a: color[3] });
    }

    /**
     * Destroy an entity
     * Uses CommandQueue.submit("entity.destroy") via GenericCommand pipeline.
     *
     * @param {number} entityId - Entity ID to destroy
     * @returns {Promise<number>} Resolves with entityId on success, rejects on failure
     */
    async destroyEntity(entityId)
    {
        return this._submit('entity.destroy', { entityId });
    }

    //----------------------------------------------------------------------------------------------------
    // Private Helper
    //----------------------------------------------------------------------------------------------------

    /**
     * Submit a command through the GenericCommand pipeline with Promise wrapping
     * @param {string} commandType - GenericCommand type (e.g. 'entity.update_position')
     * @param {Object} params - Command parameters
     * @returns {Promise<void>} Resolves on success, rejects on failure
     * @private
     */
    async _submit(commandType, params)
    {
        const commandQueue = globalThis.CommandQueueAPI;
        if (!commandQueue || !commandQueue.isAvailable())
        {
            console.log(`EntityAPI: ERROR - ${commandType} requires CommandQueue`);
            return;
        }

        return new Promise((resolve, reject) =>
        {
            commandQueue.submit(
                commandType,
                params,
                'entity-api',
                (result) =>
                {
                    if (result && result.success) { resolve(result.resultId); }
                    else { reject(new Error(result?.error || `${commandType} failed`)); }
                }
            );
        });
    }

    //----------------------------------------------------------------------------------------------------
    // Utility Methods
    //----------------------------------------------------------------------------------------------------

    /**
     * Check if GenericCommand pipeline is available for entity operations
     * @returns {boolean} True if CommandQueue is connected
     */
    isAvailable()
    {
        return globalThis.CommandQueueAPI !== undefined && globalThis.CommandQueueAPI !== null;
    }

    /**
     * Get interface status for debugging
     * @returns {Object} Status object with availability and pipeline information
     */
    getStatus()
    {
        return {
            available: this.isAvailable(),
            pipeline: 'GenericCommand',
            commandQueueAvailable: globalThis.CommandQueueAPI !== undefined
        };
    }
}

// Export for ES6 module system
export default EntityAPI;

// Export to globalThis for hot-reload detection
globalThis.EntityAPI = EntityAPI;

console.log('EntityAPI: High-level entity wrapper loaded (Phase 2 Interface Layer)');
