//----------------------------------------------------------------------------------------------------
// Player.js
// Player GameObject - Demonstrates component-based architecture
// Inspired by Starship GameObject pattern
//----------------------------------------------------------------------------------------------------

import {GameObject} from '../Core/GameObject.js';
import {KeyboardInputComponent} from '../Component/input/KeyboardInputComponent.js';
import {FlyingMovementComponent} from '../Component/movement/FlyingMovementComponent.js';
import {CameraComponent} from '../Component/camera/CameraComponent.js';
import {hotReloadRegistry} from '../Core/HotReloadRegistry.js';

/**
 * Player - Player GameObject with component composition
 *
 * Demonstrates the new component-based architecture:
 * - Extends GameObject base class
 * - Composes KeyboardInputComponent for input handling
 * - Can be extended with MovementComponent, WeaponComponent, etc.
 *
 * Implementation (Phase 1 + Phase 2):
 * - KeyboardInputComponent for input handling
 * - FlyingMovementComponent for WASD 3D movement
 * - CameraComponent for world camera management
 * - Can be toggled with F2 key
 *
 * Future Enhancements:
 * - WeaponComponent for shooting mechanics (deferred to end)
 * - HealthComponent for damage system
 *
 * Usage:
 * ```javascript
 * const player = new Player();
 * player.update(deltaTime); // Called every frame when F2 is enabled
 * ```
 */
export class Player extends GameObject
{
    constructor()
    {
        super('Player');

        console.log('Player: Constructing Player GameObject');

        // Set initial position and orientation
        // X-forward, Y-left, Z-up coordinate system
        // TEST POSITION: Directly above origin looking DOWN
        // Position: 10 units UP (positive Z), centered at origin (X=0, Y=0)
        // Orientation: pitch=-90 to look straight DOWN
        this.position = {x: -5.0, y: 0.0, z: 1.0};
        this.orientation = {yaw: 0.0, pitch: 0.0, roll: 0.0};

        console.log('Player: DIAGNOSTIC - Initial position:', JSON.stringify(this.position));
        console.log('Player: DIAGNOSTIC - Initial orientation:', JSON.stringify(this.orientation));

        // Component composition
        this.keyboardInput = new KeyboardInputComponent();
        this.addComponent(this.keyboardInput);

        this.flyingMovement = new FlyingMovementComponent(this.keyboardInput, 2.0);
        this.addComponent(this.flyingMovement);

        this.camera = new CameraComponent();
        this.addComponent(this.camera);

        // Debug logging timer
        this.logTimer = 0;
        this.logInterval = 1000; // Log every 1 second

        console.log('Player: Player GameObject created successfully');
        console.log('Player: Components attached:', Array.from(this.components.keys()));
    }

    /**
     * Update player and all components
     * @param {number} deltaTime - Time since last frame in milliseconds
     */
    update(deltaTime)
    {
        if (!this.active)
        {
            return;
        }
        // console.log('Player GameObject: Active');
        // Update all components (calls KeyboardInputComponent.update)
        super.update(deltaTime);

        // Debug logging (periodic) - every 1 second
        this.logTimer += deltaTime;
        if (this.logTimer >= this.logInterval)
        {
            const inputState = this.keyboardInput.getInputState();
            console.log('===========================================');
            console.log('[JS DIAGNOSTIC] PLAYER GameObject');
            console.log('[JS DIAGNOSTIC] Position:', JSON.stringify(this.position));
            console.log('[JS DIAGNOSTIC] Orientation:', JSON.stringify(this.orientation));
            console.log('[JS DIAGNOSTIC] Camera ID:', this.camera.cameraId);
            console.log('[JS DIAGNOSTIC] Camera Ready:', this.camera.cameraReady);
            console.log('[JS DIAGNOSTIC] Input State:', inputState);
            console.log('===========================================');
            this.logTimer = 0;
        }
    }

    /**
     * Get player status for debugging
     */
    /**
     * Get player status for debugging
     */
    getPlayerStatus()
    {
        return {
            ...this.getStatus(),
            inputComponent: this.keyboardInput.getStatus(),
            movementComponent: this.flyingMovement.getStatus(),
            cameraComponent: this.camera.getStatus()
        };
    }

    /**
     * Get camera handle for rendering
     */
    getCamera()
    {
        return this.camera ? this.camera.getCamera() : null;
    }
}

// Register with hot-reload system (NO global pollution!)
hotReloadRegistry.register('Player', Player, {
    modulePath: './objects/Player.js',
    parentClass: 'GameObject'
});

console.log('Player: GameObject class loaded (Phase 1 + Phase 2 - Foundation + Movement/Camera)');
console.log('Player: [HOT-RELOAD VERIFICATION] Initial camera position set to (-5, 0, 2) - BEHIND origin looking FORWARD');
