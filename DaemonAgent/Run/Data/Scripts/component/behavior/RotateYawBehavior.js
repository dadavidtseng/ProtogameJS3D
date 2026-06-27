//----------------------------------------------------------------------------------------------------
// RotateYawBehavior.js
// Rotates yaw at 45°/second (Prop 2 behavior)
//----------------------------------------------------------------------------------------------------

import {BehaviorComponent} from './BehaviorComponent.js';

/**
 * RotateYawBehavior - Rotates yaw continuously
 *
 * Migrated from PropEntity 'rotate-yaw' behavior.
 * Used by Prop 2: Sphere at (10, -5, 1).
 *
 * Behavior:
 * - yaw += 45°/s
 *
 * Usage:
 * ```javascript
 * const behavior = new RotateYawBehavior();
 * prop.addComponent(behavior);
 * ```
 */
export class RotateYawBehavior extends BehaviorComponent
{
    constructor()
    {
        super('rotate-yaw');

        this.rotationSpeed = 45.0; // degrees per second

        console.log('RotateYawBehavior: Created');
    }

    /**
     * Update behavior - rotate yaw
     * @param {number} deltaTime - Time since last frame in milliseconds
     */
    update(deltaTime)
    {
        if (!this.gameObject)
        {
            return;
        }

        // Convert deltaTime from milliseconds to seconds
        const deltaSeconds = deltaTime / 1000.0;

        // Rotate yaw (from PropEntity line 111)
        this.gameObject.orientation.yaw += this.rotationSpeed * deltaSeconds;
    }
}

// Export for ES6 module system
export default RotateYawBehavior;

// Export to globalThis for hot-reload detection
globalThis.RotateYawBehavior = RotateYawBehavior;

console.log('RotateYawBehavior: Loaded (Phase 4 - Prop Migration)');
