//----------------------------------------------------------------------------------------------------
// StaticBehavior.js
// No behavior - static prop (Prop 3 behavior)
//----------------------------------------------------------------------------------------------------

import {BehaviorComponent} from './BehaviorComponent.js';

/**
 * StaticBehavior - No behavior, prop remains static
 *
 * Migrated from PropEntity 'static' behavior.
 * Used by Prop 3: Grid at (0, 0, 0).
 *
 * Behavior:
 * - No updates, prop remains static
 *
 * Usage:
 * ```javascript
 * const behavior = new StaticBehavior();
 * prop.addComponent(behavior);
 * ```
 */
export class StaticBehavior extends BehaviorComponent
{
    constructor()
    {
        super('static');

        console.log('StaticBehavior: Created');
    }

    /**
     * Update behavior - no-op for static props
     * @param {number} deltaTime - Time since last frame in milliseconds
     */
    update(deltaTime)
    {
        // No update - static prop (from PropEntity line 114-116)
    }
}

// Export for ES6 module system
export default StaticBehavior;

// Export to globalThis for hot-reload detection
globalThis.StaticBehavior = StaticBehavior;

console.log('StaticBehavior: Loaded (Phase 4 - Prop Migration)');
