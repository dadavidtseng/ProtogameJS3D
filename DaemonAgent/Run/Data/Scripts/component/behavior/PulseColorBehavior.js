//----------------------------------------------------------------------------------------------------
// PulseColorBehavior.js
// Pulsing color using sin wave (Prop 1 behavior)
//----------------------------------------------------------------------------------------------------

import {BehaviorComponent} from './BehaviorComponent.js';

/**
 * PulseColorBehavior - Pulsates mesh color using sin wave
 *
 * Migrated from PropEntity 'pulse-color' behavior.
 * Used by Prop 1: Cube at (-2, -2, 0).
 *
 * Behavior:
 * - Color pulsates using: (sin(time) + 1) * 0.5 * 255
 * - Requires MeshComponent to set color
 *
 * Usage:
 * ```javascript
 * const behavior = new PulseColorBehavior();
 * prop.addComponent(behavior);
 * ```
 */
export class PulseColorBehavior extends BehaviorComponent
{
    constructor()
    {
        super('pulse-color');

        this.startTime = Date.now() / 1000.0; // seconds
        this.meshComponent = null;

        console.log('PulseColorBehavior: Created');
    }

    /**
     * Initialize - find MeshComponent to control color
     * @param {GameObject} gameObject
     */
    initialize(gameObject)
    {
        super.initialize(gameObject);

        // Find MeshComponent to control color
        this.meshComponent = this.gameObject.getComponent('mesh');

        if (!this.meshComponent)
        {
            console.log('PulseColorBehavior: No MeshComponent found on GameObject!');
        }

        // Store initial color as pulse base (defaults to white if not set)
        this.baseColor = this.meshComponent
            ? { ...this.meshComponent.color }
            : {r: 255, g: 255, b: 255, a: 255};
    }

    /**
     * Update behavior - pulse color
     * @param {number} deltaTime - Time since last frame in milliseconds
     */
    update(deltaTime)
    {
        if (!this.gameObject || !this.meshComponent)
        {
            return;
        }

        // Calculate elapsed time (from PropEntity line 101-102)
        const currentTime = Date.now() / 1000.0;
        const elapsedTime = currentTime - this.startTime;

        // Pulsing color calculation — modulate base color by sin wave
        const colorValue = (Math.sin(elapsedTime) + 1.0) * 0.5;

        // Scale each channel of the base color by the pulse factor
        this.meshComponent.setColor({
            r: Math.floor(this.baseColor.r * colorValue),
            g: Math.floor(this.baseColor.g * colorValue),
            b: Math.floor(this.baseColor.b * colorValue),
            a: this.baseColor.a
        });
    }
}

// Export for ES6 module system
export default PulseColorBehavior;

// Export to globalThis for hot-reload detection
globalThis.PulseColorBehavior = PulseColorBehavior;

console.log('PulseColorBehavior: Loaded (Phase 4 - Prop Migration)');
