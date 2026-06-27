//----------------------------------------------------------------------------------------------------
// CameraAPI.js
// High-Level Camera API — all operations routed through GenericCommand pipeline
// Part of the interface wrapper layer for C++/JavaScript bridge
//----------------------------------------------------------------------------------------------------

/**
 * CameraAPI - High-level abstraction over C++ camera system
 *
 * All operations are submitted via CommandQueue.submit() through the GenericCommand pipeline.
 * C++ handlers execute on the main thread; results are delivered via CallbackQueue.
 *
 * Design Principles:
 * - Single Responsibility: Only wraps camera operations
 * - Safe Fallbacks: Returns sensible defaults if CommandQueue unavailable
 * - Type Safety: Clear return types and parameter documentation
 * - Async Callbacks: Lifecycle methods use callbacks for async results
 * - Fire-and-Forget: Per-frame updates submit commands with no callback
 * - Error Resilience: JavaScript errors should never crash C++ rendering
 *
 * Coordinate System: X-forward, Y-left, Z-up (right-handed)
 * - +X = forward
 * - +Y = left
 * - +Z = up
 *
 * Camera Types:
 * - 'world': 3D perspective camera for world rendering
 * - 'screen': 2D orthographic camera for UI/HUD overlay
 *
 * GenericCommand Operations:
 * Lifecycle (async with callback):
 * - create_camera(posX, posY, posZ, yaw, pitch, roll, type) → callback(cameraId)
 * - camera.set_active(cameraId) → callback(success)
 * - camera.update_type(cameraId, type) → callback(success)
 * - camera.destroy(cameraId) → callback(success)
 *
 * Updates (fire-and-forget):
 * - camera.update(cameraId, posX, posY, posZ, yaw, pitch, roll) [RECOMMENDED - atomic]
 * - camera.update_position(cameraId, x, y, z)
 * - camera.update_orientation(cameraId, yaw, pitch, roll)
 * - camera.move_by(cameraId, dx, dy, dz)
 * - camera.look_at(cameraId, targetX, targetY, targetZ)
 *
 * Usage Example:
 * ```javascript
 * const cameraAPI = new CameraAPI();
 *
 * // Create a world camera (JavaScript wrapper uses array format for convenience)
 * // Internally converts to flattened C++ call: create(0, -10, 5, 0, 0, 0, 'world', callback)
 * cameraAPI.createCamera([0, -10, 5], [0, 0, 0], 'world', (cameraId) => {
 *     console.log('Camera created with ID:', cameraId);
 *
 *     // Move the camera
 *     cameraAPI.updatePosition(cameraId, [0, -15, 5]);
 *
 *     // Rotate the camera
 *     cameraAPI.updateOrientation(cameraId, [45, 0, 0]);
 *
 *     // Set as active camera
 *     cameraAPI.setActive(cameraId, (result) => {
 *         console.log('Camera activated:', result);
 *     });
 * });
 * ```
 */
export class CameraAPI
{
    constructor()
    {
        // Singleton pattern: Return existing instance if available
        if (globalThis.CameraAPI && globalThis.CameraAPI instanceof CameraAPI)
        {
            console.log('CameraAPI: Returning existing singleton instance');
            return globalThis.CameraAPI;
        }

        // Phase 9.2.1: Store cameraId from createCamera callback for per-frame operations
        this.cameraId = null;

        // Make instance globally accessible for JSEngine callback routing
        globalThis.CameraAPI = this;

        console.log('CameraAPI: Initialized (GenericCommand pipeline)');
    }

    //----------------------------------------------------------------------------------------------------
    // Camera Lifecycle Methods (GenericCommand pipeline)
    //----------------------------------------------------------------------------------------------------

    /**
     * Create a camera with specified position, orientation, and type (async)
     * Uses CommandQueue.submit("create_camera") via GenericCommand pipeline.
     *
     * @param {Array<number>} position - [x, y, z] camera position (X-forward, Y-left, Z-up)
     * @param {Array<number>} orientation - [yaw, pitch, roll] rotation in degrees
     * @param {string} type - Camera type: 'world' (3D perspective) or 'screen' (2D orthographic)
     * @param {Function} callback - Callback function(cameraId) called when camera is created
     * @returns {number} callbackId
     */
    createCamera(position, orientation, type, callback)
    {
        const commandQueue = globalThis.CommandQueueAPI;
        if (!commandQueue || !commandQueue.isAvailable())
        {
            console.log('CameraAPI: ERROR - createCamera requires CommandQueue');
            if (callback) callback(0);
            return 0;
        }

        if (!Array.isArray(position) || position.length !== 3)
        {
            console.log('CameraAPI: ERROR - position must be [x, y, z] array');
            if (callback) callback(0);
            return 0;
        }

        if (!Array.isArray(orientation) || orientation.length !== 3)
        {
            console.log('CameraAPI: ERROR - orientation must be [yaw, pitch, roll] array');
            if (callback) callback(0);
            return 0;
        }

        if (type !== 'world' && type !== 'screen')
        {
            console.log('CameraAPI: ERROR - type must be "world" or "screen"');
            if (callback) callback(0);
            return 0;
        }

        const callbackId = commandQueue.submit(
            'create_camera',
            { position, orientation, type },
            'camera-api',
            (result) =>
            {
                // Phase 9.2.1: Store cameraId for per-frame operations
                const cameraId = result.success ? result.resultId : null;
                this.cameraId = cameraId;

                if (callback)
                {
                    // Adapt GenericCommand result → CameraAPI callback format
                    // GenericCommand: { success, resultId, error }
                    // CameraAPI callback: (cameraId) where 0 = failure
                    callback(cameraId !== null ? cameraId : 0);
                }
            }
        );

        return callbackId;
    }

    /**
     * Set camera as active for rendering (async with callback)
     * Uses CommandQueue.submit("set_active_camera") via GenericCommand pipeline.
     * @param {number} cameraId - Camera ID to activate
     * @param {Function} callback - Callback function(result) called when operation completes
     * @returns {number} callbackId
     */
    setActive(cameraId, callback)
    {
        const commandQueue = globalThis.CommandQueueAPI;
        if (!commandQueue || !commandQueue.isAvailable())
        {
            console.log('CameraAPI: ERROR - setActive requires CommandQueue');
            if (callback) callback(0);
            return 0;
        }

        const callbackId = commandQueue.submit(
            'set_active_camera',
            { cameraId },
            'camera-api',
            (result) =>
            {
                if (callback)
                {
                    callback(result.success ? result.resultId : 0);
                }
            }
        );

        return callbackId;
    }

    /**
     * Update camera type (async with callback)
     * Uses CommandQueue.submit("update_camera_type") via GenericCommand pipeline.
     * @param {number} cameraId - Camera ID to update
     * @param {string} type - New camera type: 'world' or 'screen'
     * @param {Function} callback - Callback function(result) called when operation completes
     * @returns {number} callbackId
     */
    updateType(cameraId, type, callback)
    {
        const commandQueue = globalThis.CommandQueueAPI;
        if (!commandQueue || !commandQueue.isAvailable())
        {
            console.log('CameraAPI: ERROR - updateType requires CommandQueue');
            if (callback) callback(0);
            return 0;
        }

        if (type !== 'world' && type !== 'screen')
        {
            console.log('CameraAPI: ERROR - type must be "world" or "screen"');
            if (callback) callback(0);
            return 0;
        }

        const callbackId = commandQueue.submit(
            'update_camera_type',
            { cameraId, type },
            'camera-api',
            (result) =>
            {
                if (callback)
                {
                    callback(result.success ? result.resultId : 0);
                }
            }
        );

        return callbackId;
    }

    /**
     * Destroy camera (async with callback)
     * Uses CommandQueue.submit("destroy_camera") via GenericCommand pipeline.
     * @param {number} cameraId - Camera ID to destroy
     * @param {Function} callback - Callback function(result) called when operation completes
     * @returns {number} callbackId
     */
    destroy(cameraId, callback)
    {
        const commandQueue = globalThis.CommandQueueAPI;
        if (!commandQueue || !commandQueue.isAvailable())
        {
            console.log('CameraAPI: ERROR - destroy requires CommandQueue');
            if (callback) callback(0);
            return 0;
        }

        const callbackId = commandQueue.submit(
            'destroy_camera',
            { cameraId },
            'camera-api',
            (result) =>
            {
                // Phase 9.2.1: Clear stored cameraId on destroy
                if (result.success)
                {
                    this.cameraId = null;
                }

                if (callback)
                {
                    callback(result.success ? result.resultId : 0);
                }
            }
        );

        return callbackId;
    }

    //----------------------------------------------------------------------------------------------------
    // Camera Update Methods (GenericCommand pipeline, async with callback)
    //----------------------------------------------------------------------------------------------------

    /**
     * RECOMMENDED: Update camera position AND orientation atomically (eliminates race conditions)
     * Uses CommandQueue.submit("camera.update") via GenericCommand pipeline.
     * @param {number} cameraId - Camera ID to update
     * @param {number} posX - X position (forward direction)
     * @param {number} posY - Y position (left direction)
     * @param {number} posZ - Z position (up direction)
     * @param {number} yaw - Yaw rotation in degrees
     * @param {number} pitch - Pitch rotation in degrees
     * @param {number} roll - Roll rotation in degrees
     * @returns {Promise<void>} Resolves on success, rejects on failure
     */
    async update(cameraId, posX, posY, posZ, yaw, pitch, roll)
    {
        return this._submit('camera.update', { cameraId, posX, posY, posZ, yaw, pitch, roll });
    }

    /**
     * DEPRECATED: Update camera position only (use update() instead to avoid race conditions)
     * Uses CommandQueue.submit("camera.update_position") via GenericCommand pipeline.
     * @param {number} cameraId - Camera ID to update
     * @param {Array<number>} position - [x, y, z] new position (X-forward, Y-left, Z-up)
     * @returns {Promise<void>} Resolves on success, rejects on failure
     */
    async updatePosition(cameraId, position)
    {
        if (!Array.isArray(position) || position.length !== 3)
        {
            console.log('CameraAPI: ERROR - position must be [x, y, z] array');
            return;
        }

        return this._submit('camera.update_position', { cameraId, x: position[0], y: position[1], z: position[2] });
    }

    /**
     * Update camera orientation (absolute rotation)
     * Uses CommandQueue.submit("camera.update_orientation") via GenericCommand pipeline.
     * @param {number} cameraId - Camera ID to update
     * @param {Array<number>} orientation - [yaw, pitch, roll] rotation in degrees
     * @returns {Promise<void>} Resolves on success, rejects on failure
     */
    async updateOrientation(cameraId, orientation)
    {
        if (!Array.isArray(orientation) || orientation.length !== 3)
        {
            console.log('CameraAPI: ERROR - orientation must be [yaw, pitch, roll] array');
            return;
        }

        return this._submit('camera.update_orientation', { cameraId, yaw: orientation[0], pitch: orientation[1], roll: orientation[2] });
    }

    /**
     * Move camera by relative delta
     * Uses CommandQueue.submit("camera.move_by") via GenericCommand pipeline.
     * @param {number} cameraId - Camera ID to move
     * @param {Array<number>} delta - [dx, dy, dz] movement delta (X-forward, Y-left, Z-up)
     * @returns {Promise<void>} Resolves on success, rejects on failure
     */
    async moveBy(cameraId, delta)
    {
        if (!Array.isArray(delta) || delta.length !== 3)
        {
            console.log('CameraAPI: ERROR - delta must be [dx, dy, dz] array');
            return;
        }

        return this._submit('camera.move_by', { cameraId, dx: delta[0], dy: delta[1], dz: delta[2] });
    }

    /**
     * Make camera look at a target position
     * Uses CommandQueue.submit("camera.look_at") via GenericCommand pipeline.
     * @param {number} cameraId - Camera ID to update
     * @param {Array<number>} target - [x, y, z] target position to look at (X-forward, Y-left, Z-up)
     * @returns {Promise<void>} Resolves on success, rejects on failure
     */
    async lookAt(cameraId, target)
    {
        if (!Array.isArray(target) || target.length !== 3)
        {
            console.log('CameraAPI: ERROR - target must be [x, y, z] array');
            return;
        }

        return this._submit('camera.look_at', { cameraId, targetX: target[0], targetY: target[1], targetZ: target[2] });
    }

    //----------------------------------------------------------------------------------------------------
    //----------------------------------------------------------------------------------------------------
    // Private Helper
    //----------------------------------------------------------------------------------------------------

    /**
     * Submit a command through the GenericCommand pipeline with Promise wrapping
     * @param {string} commandType - GenericCommand type (e.g. 'camera.update_position')
     * @param {Object} params - Command parameters
     * @returns {Promise<void>} Resolves on success, rejects on failure
     * @private
     */
    async _submit(commandType, params)
    {
        const commandQueue = globalThis.CommandQueueAPI;
        if (!commandQueue || !commandQueue.isAvailable())
        {
            console.log(`CameraAPI: ERROR - ${commandType} requires CommandQueue`);
            return;
        }

        return new Promise((resolve, reject) =>
        {
            commandQueue.submit(
                commandType,
                params,
                'camera-api',
                (result) =>
                {
                    if (result && result.success) { resolve(result.resultId); }
                    else { reject(new Error(result?.error || `${commandType} failed`)); }
                }
            );
        });
    }

    // Utility Methods
    //----------------------------------------------------------------------------------------------------

    /**
     * Check if GenericCommand pipeline is available for camera operations
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
            commandQueueAvailable: globalThis.CommandQueueAPI !== undefined,
            cameraId: this.cameraId
        };
    }
}

// Export for ES6 module system
export default CameraAPI;

// Export to globalThis for hot-reload detection
globalThis.CameraAPI = CameraAPI;

console.log('CameraAPI: High-level camera wrapper loaded (M4-T8 Interface Layer)');
