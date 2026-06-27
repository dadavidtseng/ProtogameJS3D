//----------------------------------------------------------------------------------------------------
// FlyingMovementComponent.js
// Flying camera movement (migrated from PlayerEntity.js)
//
// COORDINATE SYSTEM: X-forward, Y-left, Z-up (right-handed)
// - X-axis: Forward direction (positive X is forward)
// - Y-axis: Left direction (positive Y is left, negative Y is right)
// - Z-axis: Up direction (positive Z is up, negative Z is down)
//----------------------------------------------------------------------------------------------------

import {Component} from '../../Core/Component.js';
import {InputInterface} from '../../Interface/InputInterface.js';

/**
 * FlyingMovementComponent - 3D flying camera movement
 *
 * Migrated from PlayerEntity.js handleInput() and update() methods.
 * Implements WASD + Z/C movement with speed boost, Q/E roll, and mouse rotation.
 *
 * Features:
 * - WASD: Forward/backward, left/right (relative to camera orientation)
 * - Z/C: Down/up (world Z axis)
 * - SHIFT: 10x speed boost
 * - Q/E: Roll left/right
 * - Mouse: Look around (yaw/pitch)
 *
 * Coordinate System Note:
 * - This component uses X-forward, Y-left, Z-up coordinate system
 * - Vector calculations are adjusted for this unusual coordinate system
 * - Do not replace with standard game engine vector math!
 *
 * Requires:
 * - InputComponent attached to GameObject (reads input state)
 * - GameObject with position and orientation properties
 *
 * Usage:
 * ```javascript
 * const movement = new FlyingMovementComponent(inputComponent, 2.0);
 * player.addComponent(movement);
 * ```
 */
export class FlyingMovementComponent extends Component
{
    /**
     * @param {InputComponent} inputComponent - Input source (keyboard, gamepad, etc.)
     * @param {number} moveSpeed - Base movement speed (default: 2.0)
     */
    constructor(inputComponent, moveSpeed = 2.0)
    {
        super('flyingMovement');

        this.inputComponent = inputComponent;
        this.inputInterface = new InputInterface(); // For mouse input

        // Movement constants (from PlayerEntity)
        this.moveSpeed = moveSpeed;
        this.mouseSensitivity = 0.125;
        this.rollSpeed = 90.0;

        // Velocity state
        this.velocity = {x: 0.0, y: 0.0, z: 0.0};
        this.angularVelocity = {yaw: 0.0, pitch: 0.0, roll: 0.0};

        console.log(`FlyingMovementComponent: Created with moveSpeed=${moveSpeed}`);
    }

    /**
     * Initialize component (called when attached to GameObject)
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

        console.log('FlyingMovementComponent: Initialized for GameObject');
    }

    /**
     * Update movement every frame
     * @param {number} deltaTime - Time since last frame in milliseconds
     */
    update(deltaTime)
    {
        if (!this.gameObject)
        {
            return;
        }

        // Convert deltaTime from milliseconds to seconds (matches C++ deltaSeconds)
        const deltaSeconds = deltaTime / 1000.0;

        // Handle input and calculate velocity
        this.handleInput(deltaSeconds);

        // Diagnostic logging (occasional)
        if (!this.frameCount) this.frameCount = 0;
        this.frameCount++;

        if (this.frameCount % 60 === 0)
        {
            const anyInputActive = this.inputComponent.upIsDown || this.inputComponent.downIsDown ||
                                   this.inputComponent.leftIsDown || this.inputComponent.rightIsDown ||
                                   this.inputComponent.zIsDown || this.inputComponent.cIsDown;

            if (anyInputActive)
            {
                console.log('=== MOVEMENT DIAGNOSTIC ===');
                console.log('Input State:', {
                    W: this.inputComponent.upIsDown,
                    S: this.inputComponent.downIsDown,
                    A: this.inputComponent.leftIsDown,
                    D: this.inputComponent.rightIsDown,
                    Z: this.inputComponent.zIsDown,
                    C: this.inputComponent.cIsDown
                });
                const forward = this.getForwardVector();
                const left = this.getLeftVector();
                console.log('Forward Vector:', JSON.stringify(forward));
                console.log('Left Vector:', JSON.stringify(left));
                console.log('Calculated Velocity:', JSON.stringify(this.velocity));
                console.log('DeltaSeconds:', deltaSeconds);
            }
        }

        // Update position
        this.gameObject.position.x += this.velocity.x * deltaSeconds;
        this.gameObject.position.y += this.velocity.y * deltaSeconds;
        this.gameObject.position.z += this.velocity.z * deltaSeconds;

        // Update orientation (yaw/pitch from mouse, roll from angular velocity)
        this.gameObject.orientation.yaw += this.angularVelocity.yaw * deltaSeconds;
        this.gameObject.orientation.pitch += this.angularVelocity.pitch * deltaSeconds;
        this.gameObject.orientation.roll += this.angularVelocity.roll * deltaSeconds;

        // Clamp orientation
        this.gameObject.orientation.roll = this.clamp(this.gameObject.orientation.roll, -45.0, 45.0);
        this.gameObject.orientation.pitch = this.clamp(this.gameObject.orientation.pitch, -85.0, 85.0);
    }

    /**
     * Handle input (migrated from PlayerEntity.handleInput)
     * @param {number} deltaSeconds - Time since last frame in seconds
     */
    handleInput(deltaSeconds)
    {
        // Calculate forward and left vectors from orientation
        const forward = this.getForwardVector();
        const left = this.getLeftVector();

        // Reset velocity
        this.velocity = {x: 0.0, y: 0.0, z: 0.0};

        // Keyboard movement (WASD)
        if (this.inputComponent.upIsDown) // W
        {
            this.velocity.x += forward.x * this.moveSpeed;
            this.velocity.y += forward.y * this.moveSpeed;
            this.velocity.z += forward.z * this.moveSpeed;
        }
        if (this.inputComponent.downIsDown) // S
        {
            this.velocity.x -= forward.x * this.moveSpeed;
            this.velocity.y -= forward.y * this.moveSpeed;
            this.velocity.z -= forward.z * this.moveSpeed;
        }
        if (this.inputComponent.leftIsDown) // A
        {
            this.velocity.x += left.x * this.moveSpeed;
            this.velocity.y += left.y * this.moveSpeed;
            this.velocity.z += left.z * this.moveSpeed;
        }
        if (this.inputComponent.rightIsDown) // D
        {
            this.velocity.x -= left.x * this.moveSpeed;
            this.velocity.y -= left.y * this.moveSpeed;
            this.velocity.z -= left.z * this.moveSpeed;
        }

        // Phase 3: Z/C for vertical movement (world Z axis)
        if (this.inputComponent.zIsDown) // Z - down
        {
            this.velocity.z -= this.moveSpeed;
        }
        if (this.inputComponent.cIsDown) // C - up
        {
            this.velocity.z += this.moveSpeed;
        }

        // Phase 3: SHIFT speed boost (10x multiplier)
        let speedMultiplier = 1.0;
        if (this.inputComponent.shiftIsDown)
        {
            speedMultiplier = 10.0;
        }

        this.velocity.x *= speedMultiplier;
        this.velocity.y *= speedMultiplier;
        this.velocity.z *= speedMultiplier;

        // Phase 3: Mouse rotation (yaw/pitch)
        const mouseDelta = this.inputInterface.getCursorClientDelta();

        // Defensive: Ensure mouseDelta.x and mouseDelta.y are valid numbers
        const deltaX = (typeof mouseDelta.x === 'number' && !isNaN(mouseDelta.x)) ? mouseDelta.x : 0;
        const deltaY = (typeof mouseDelta.y === 'number' && !isNaN(mouseDelta.y)) ? mouseDelta.y : 0;

        this.gameObject.orientation.yaw -= deltaX * this.mouseSensitivity;
        this.gameObject.orientation.pitch += deltaY * this.mouseSensitivity;

        // Defensive: Ensure orientation never becomes NaN
        if (typeof this.gameObject.orientation.yaw !== 'number' || isNaN(this.gameObject.orientation.yaw))
        {
            console.log('FlyingMovementComponent: yaw became NaN! Resetting to 0');
            this.gameObject.orientation.yaw = 0.0;
        }
        if (typeof this.gameObject.orientation.pitch !== 'number' || isNaN(this.gameObject.orientation.pitch))
        {
            console.log('FlyingMovementComponent: pitch became NaN! Resetting to 0');
            this.gameObject.orientation.pitch = 0.0;
        }

        // Phase 3: Q/E roll controls
        this.angularVelocity.roll = 0.0;

        if (this.inputComponent.qIsDown) // Q - roll left
        {
            this.angularVelocity.roll = this.rollSpeed;
        }
        if (this.inputComponent.eIsDown) // E - roll right
        {
            this.angularVelocity.roll = -this.rollSpeed;
        }
    }

    /**
     * Get forward vector from orientation
     * Coordinate System: X-forward, Y-left, Z-up (right-handed)
     *
     * AUTHORITATIVE C++ FORMULA from EulerAngles::GetAsVectors_IFwd_JLeft_KUp()
     * out_forwardIBasis = Vec3(cy * cp, sy * cp, -sp);
     *
     * When yaw=0°, pitch=0°: forward = (1, 0, 0) - pointing along +X axis
     * Yaw rotates around Z-axis (affects X and Y components)
     * Pitch rotates around Y-axis (affects X and Z components)
     */
    getForwardVector()
    {
        const yawRad = this.gameObject.orientation.yaw * (Math.PI / 180.0);
        const pitchRad = this.gameObject.orientation.pitch * (Math.PI / 180.0);

        const cy = Math.cos(yawRad);
        const sy = Math.sin(yawRad);
        const cp = Math.cos(pitchRad);
        const sp = Math.sin(pitchRad);

        return {
            x: cy * cp,   // X is forward
            y: sy * cp,   // Y is left (NO negative - matches C++)
            z: -sp        // Z is up (NEGATIVE sp - matches C++)
        };
    }

    /**
     * Get left vector from orientation
     * Coordinate System: X-forward, Y-left, Z-up (right-handed)
     *
     * AUTHORITATIVE C++ FORMULA from EulerAngles::GetAsVectors_IFwd_JLeft_KUp()
     * out_leftJBasis = Vec3(sr * sp * cy - sy * cr, cr * cy + sr * sp * sy, cp * sr);
     *
     * When yaw=0°, pitch=0°, roll=0°: left = (0, 1, 0) - pointing along +Y axis
     * Left vector accounts for full 3D rotation including roll
     * Yaw rotates around Z-axis, Pitch rotates around Y-axis, Roll rotates around X-axis
     */
    getLeftVector()
    {
        const yawRad = this.gameObject.orientation.yaw * (Math.PI / 180.0);
        const pitchRad = this.gameObject.orientation.pitch * (Math.PI / 180.0);
        const rollRad = this.gameObject.orientation.roll * (Math.PI / 180.0);

        const cy = Math.cos(yawRad);
        const sy = Math.sin(yawRad);
        const cp = Math.cos(pitchRad);
        const sp = Math.sin(pitchRad);
        const cr = Math.cos(rollRad);
        const sr = Math.sin(rollRad);

        return {
            x: sr * sp * cy - sy * cr,   // Full formula with roll
            y: cr * cy + sr * sp * sy,   // Full formula with roll
            z: cp * sr                   // Z component depends on pitch and roll
        };
    }

    /**
     * Clamp value between min and max
     */
    clamp(value, min, max)
    {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * Get movement status for debugging
     */
    getStatus()
    {
        return {
            ...super.getStatus(),
            velocity: this.velocity,
            angularVelocity: this.angularVelocity,
            position: this.gameObject ? this.gameObject.position : null,
            orientation: this.gameObject ? this.gameObject.orientation : null
        };
    }
}

// Export for ES6 module system
export default FlyingMovementComponent;

// Export to globalThis for hot-reload detection
globalThis.FlyingMovementComponent = FlyingMovementComponent;

console.log('FlyingMovementComponent: Loaded (Phase 2 + Phase 3 - Complete Movement System)');
console.log('FlyingMovementComponent: [HOT-RELOAD VERIFICATION] Using C++ EulerAngles formulas: forward=(cy*cp, sy*cp, -sp), left=(full 3D formula with roll)');
