//----------------------------------------------------------------------------------------------------
// CameraComponent.js
// Camera management using Phase 2b CameraAPI (High-Level Camera Interface)
//----------------------------------------------------------------------------------------------------

import {Component} from '../../Core/Component.js';
import {CameraAPI} from '../../Interface/CameraAPI.js';

/**
 * CameraComponent - Manages world camera lifecycle using Phase 2b CameraAPI
 *
 * Phase 2b Migration: Replaced legacy CameraInterface with new CameraAPI
 * - Uses async callback pattern for camera creation
 * - Integrates with CameraStateBuffer double-buffering
 * - Simplified API with position/orientation updates
 *
 * Features:
 * - Creates world camera via CameraAPI.createCamera() (async)
 * - Activates camera via CameraAPI.setActive() (async)
 * - Updates camera position/orientation every frame (fire-and-forget)
 * - Destroys camera on component destruction (async)
 *
 * Requires:
 * - GameObject with position {x, y, z} and orientation {yaw, pitch, roll} properties
 * - CameraAPI (Phase 2b wrapper for C++ HighLevelEntityAPI)
 *
 * Usage:
 * ```javascript
 * const camera = new CameraComponent();
 * player.addComponent(camera);
 * const cameraId = camera.getCameraId(); // Camera ID from Phase 2b API
 * ```
 */
export class CameraComponent extends Component
{
    static version = 3;  // Hot-reload version tracking (incremented for Phase 2b migration)

    constructor()
    {
        super('camera');

        this.cameraId = null;           // Phase 2b: Camera ID instead of camera handle
        this.cameraReady = false;       // Flag to indicate camera creation completed
        this.cameraUpdateCount = 0;
        this.cameraAPI = new CameraAPI();  // Phase 2b: New high-level API

        console.log('CameraComponent: Created (Phase 2b - using CameraAPI)');
    }

    /**
     * Initialize component (called when attached to GameObject)
     * Creates and configures the world camera using Phase 2b API
     * @param {GameObject} gameObject
     */
    initialize(gameObject)
    {
        super.initialize(gameObject);

        // Ensure CameraAPI is available
        if (!this.cameraAPI.isAvailable())
        {
            console.log('CameraComponent: ERROR - CameraAPI not available (CommandQueue not ready)');
            return;
        }

        console.log('CameraComponent: CameraAPI is available, proceeding with camera creation');

        // Get initial position and orientation from GameObject
        const position = [
            gameObject.position.x,
            gameObject.position.y,
            gameObject.position.z
        ];

        const orientation = [
            gameObject.orientation.yaw,
            gameObject.orientation.pitch,
            gameObject.orientation.roll
        ];

        // Phase 2b: Create camera with async callback
        console.log('CameraComponent: Creating world camera (Phase 2b API)...');
        console.log('  position:', position);
        console.log('  orientation:', orientation);
        console.log('  type: world');

        console.log('CameraComponent: Calling cameraAPI.createCamera()...');
        this.cameraAPI.createCamera(position, orientation, 'world', (cameraId) =>
        {
            console.log('CameraComponent: *** CALLBACK RECEIVED *** cameraId =', cameraId);

            if (cameraId === 0)
            {
                console.log('CameraComponent: ERROR - Camera creation failed!');
                return;
            }

            this.cameraId = cameraId;
            console.log('CameraComponent: World camera created with ID:', cameraId);

            // Activate this camera for rendering
            console.log('CameraComponent: Setting camera as active...');
            this.cameraAPI.setActive(cameraId, (result) =>
            {
                if (result === 0)
                {
                    console.log('CameraComponent: ERROR - Failed to set camera active!');
                    return;
                }

                this.cameraReady = true;
                console.log('CameraComponent: Camera activated successfully');
            });
        });

        console.log('CameraComponent: Camera creation initiated (async)');
    }

    /**
     * Update camera transform every frame
     * Uses async updates for position and orientation via GenericCommand pipeline
     * @param {number} deltaTime - Time since last frame in milliseconds
     */
    async update(deltaTime)
    {
        if (!this.gameObject || !this.cameraReady || this.cameraId === null)
        {
            return;
        }

        // Update camera position and orientation from GameObject transform
        await this.updateCameraTransform();
    }

    /**
     * Update C++ camera position and orientation using Phase 2b API
     * Phase 2b: Uses async update() with callback for error detection
     */
    async updateCameraTransform()
    {
        if (!this.cameraId || !this.gameObject)
        {
            return;
        }

        // Log camera updates occasionally (every 60 frames) to avoid spam
        this.cameraUpdateCount++;
        const shouldLog = (this.cameraUpdateCount % 60 === 0);

        if (shouldLog)
        {
            console.log('=== CAMERA DIAGNOSTIC ===');
            console.log(`Camera ID: ${this.cameraId}`);
            console.log('Camera Position (from GameObject):', JSON.stringify(this.gameObject.position));
            console.log('Camera Orientation (from GameObject):', JSON.stringify(this.gameObject.orientation));
        }

        // OPTION 1 FIX: Combined atomic update (eliminates race condition)
        // Send BOTH position and orientation in a single command
        // Old approach: Two separate commands caused race condition where second command
        // would read stale position from back buffer before first command was processed
        await this.cameraAPI.update(
            this.cameraId,
            this.gameObject.position.x,
            this.gameObject.position.y,
            this.gameObject.position.z,
            this.gameObject.orientation.yaw,
            this.gameObject.orientation.pitch,
            this.gameObject.orientation.roll
        );
    }

    /**
     * Get camera ID for rendering (Phase 2b)
     * @returns {number|null} Camera ID or null if not created yet
     */
    getCameraId()
    {
        return this.cameraId;
    }

    /**
     * Legacy method for compatibility (returns camera ID)
     * @deprecated Use getCameraId() instead
     */
    getCamera()
    {
        return this.cameraId;
    }

    /**
     * Check if camera is ready for use
     * @returns {boolean} True if camera created and activated
     */
    isCameraReady()
    {
        return this.cameraReady && this.cameraId !== null;
    }

    /**
     * Cleanup - Destroy camera when component is destroyed (Phase 2b async)
     */
    destroy()
    {
        if (this.cameraId !== null)
        {
            console.log('CameraComponent: Destroying camera ID:', this.cameraId);

            // Phase 2b: Async destroy with callback
            this.cameraAPI.destroy(this.cameraId, (result) =>
            {
                if (result === 0)
                {
                    console.log('CameraComponent: ERROR - Camera destruction failed!');
                }
                else
                {
                    console.log('CameraComponent: Camera destroyed successfully');
                }
            });

            this.cameraId = null;
            this.cameraReady = false;
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
            cameraId: this.cameraId,
            cameraReady: this.cameraReady,
            cameraUpdateCount: this.cameraUpdateCount,
            apiAvailable: this.cameraAPI.isAvailable()
        };
    }
}

// Export for ES6 module system
export default CameraComponent;

// Export to globalThis for hot-reload detection
globalThis.CameraComponent = CameraComponent;

console.log('CameraComponent: Loaded (Phase 2b - CameraAPI Migration)');
