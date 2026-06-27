//----------------------------------------------------------------------------------------------------
// BehaviorComponent.js
// Base class for prop behaviors (Strategy pattern)
//----------------------------------------------------------------------------------------------------

import {Component} from '../../Core/Component.js';

/**
 * BehaviorComponent - Abstract base class for prop behaviors
 *
 * Implements Strategy pattern for different prop behaviors.
 * Derived classes implement specific behavior logic (rotation, color pulsing, etc.)
 *
 * Design Pattern: Strategy Pattern
 * - BehaviorComponent defines the interface
 * - RotatePitchRollBehavior, PulseColorBehavior, etc. implement strategies
 * - Prop GameObjects use BehaviorComponent without knowing the specific behavior
 *
 * Behavior Types (from PropEntity):
 * - 'rotate-pitch-roll': Rotate pitch and roll (30°/s each)
 * - 'pulse-color': Pulsing color (sin wave)
 * - 'rotate-yaw': Rotate yaw (45°/s)
 * - 'static': No behavior (static prop)
 *
 * Usage Example:
 * ```javascript
 * const behavior = new RotatePitchRollBehavior();
 * prop.addComponent(behavior);
 * ```
 */
export class BehaviorComponent extends Component
{
    constructor(behaviorType)
    {
        super('behavior');

        this.behaviorType = behaviorType;

        console.log(`BehaviorComponent: Created with type '${behaviorType}'`);
    }

    /**
     * Initialize behavior (called when attached to GameObject)
     * @param {GameObject} gameObject
     */
    initialize(gameObject)
    {
        super.initialize(gameObject);

        // Ensure GameObject has required properties
        if (!this.gameObject.orientation)
        {
            this.gameObject.orientation = {yaw: 0, pitch: 0, roll: 0};
        }

        console.log(`BehaviorComponent: Initialized '${this.behaviorType}' for GameObject`);
    }

    /**
     * Update behavior every frame
     * Override in derived classes to implement specific behavior
     * @param {number} deltaTime - Time since last frame in milliseconds
     */
    update(deltaTime)
    {
        // Override in derived classes (RotatePitchRollBehavior, etc.)
    }

    /**
     * Get behavior status for debugging
     */
    getStatus()
    {
        return {
            ...super.getStatus(),
            behaviorType: this.behaviorType
        };
    }
}

// Export for ES6 module system
export default BehaviorComponent;

// Export to globalThis for hot-reload detection
globalThis.BehaviorComponent = BehaviorComponent;

console.log('BehaviorComponent: Base class loaded (Phase 4 - Prop Migration)');
