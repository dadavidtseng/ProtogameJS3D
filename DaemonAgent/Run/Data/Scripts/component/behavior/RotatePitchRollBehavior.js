//----------------------------------------------------------------------------------------------------
// RotatePitchRollBehavior.js
// Rotates pitch and roll at 30°/second (Prop 0 behavior)
//----------------------------------------------------------------------------------------------------

import {BehaviorComponent} from './BehaviorComponent.js';

/**
 * RotatePitchRollBehavior - Rotates pitch and roll continuously
 *
 * Migrated from PropEntity 'rotate-pitch-roll' behavior.
 * Used by Prop 0: Cube at (2, 2, 0).
 *
 * Behavior:
 * - pitch += 30°/s
 * - roll += 30°/s
 *
 * Usage:
 * ```javascript
 * const behavior = new RotatePitchRollBehavior();
 * prop.addComponent(behavior);
 * ```
 */
export class RotatePitchRollBehavior extends BehaviorComponent
{
    constructor()
    {
        super('rotate-pitch-roll');

        this.rotationSpeed = 30.0; // degrees per second

        console.log('RotatePitchRollBehavior: Created');
    }

    /**
     * Update behavior - rotate pitch and roll
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

        // Rotate pitch and roll (from PropEntity line 94-95)
        this.gameObject.orientation.pitch += this.rotationSpeed * deltaSeconds;
        this.gameObject.orientation.roll += this.rotationSpeed * deltaSeconds;
    }
}

// Export for ES6 module system
export default RotatePitchRollBehavior;

// Export to globalThis for hot-reload detection
globalThis.RotatePitchRollBehavior = RotatePitchRollBehavior;

console.log('RotatePitchRollBehavior: Loaded (Phase 4 - Prop Migration)');
