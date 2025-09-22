//----------------------------------------------------------------------------------------------------
// InputSystem.js
//----------------------------------------------------------------------------------------------------

/**
 * InputSystem.js
 *
 * Extracted input handling logic from JSGame.js to enable AI Agent file separation.
 * This system handles all input-related functionality including F1 key debugging toggle.
 *
 * AI Agent Usage:
 * - This file contains pure input logic that AI Agents can edit independently
 * - JSGame.js delegates input handling to this system
 * - No direct system registration - JSGame.js handles registration and delegates
 */


class InputSystem {
    constructor() {
        this.lastF1State = false;
        console.log('CONSTRUCTOR: InputSystem created at', Date.now());
    }

    /**
     * Core input logic extracted from JSGame.js updateInputHandler method
     * Handles F1 key detection and shouldRender toggle functionality
     *
     * @param {number} deltaTime - Frame delta time from JSGame
     */
    handleInput(deltaTime) {
        // F1 key detection logic (extracted from JSGame.js lines 182-184)
        if (!this.logTimer) {
            this.logTimer = 0;
        }

        // Accumulate time
        this.logTimer += deltaTime;

        // Check if 0.5 seconds (500ms) have passed
        if (this.logTimer >= 200) {
            console.log('InputSystem HandleInput');
            this.logTimer = 0; // Reset timer
        }

        let currentF1State = true;
        if (typeof input !== 'undefined' && input.wasKeyJustPressed) {
            currentF1State = input.wasKeyJustPressed(112); // F1 key code
        }

        // Edge detection and shouldRender toggle (extracted from JSGame.js lines 187-198)
        if (currentF1State && !this.lastF1State) {
            if (typeof shouldRender !== 'undefined') {
                shouldRender = !shouldRender;
                console.log('InputSystem: F1 pressed via INPUT SYSTEM, shouldRender =', shouldRender);
            } else if (typeof globalThis.shouldRender !== 'undefined') {
                globalThis.shouldRender = !globalThis.shouldRender;
                console.log('InputSystem: F1 pressed via INPUT SYSTEM, globalThis.shouldRender =', globalThis.shouldRender);
            } else {
                console.log('InputSystem: F1 pressed but shouldRender variable not found!');
            }
        }

        // Update state for next frame edge detection
        this.lastF1State = currentF1State;
    }

    /**
     * API methods for JSGame.js and other systems to query input state
     */

    /**
     * Get the current F1 key state for delegation back to JSGame system data
     * @returns {boolean} Current F1 key state
     */
    getLastF1State() {
        return this.lastF1State;
    }

    /**
     * Check if F1 key is currently pressed (for other systems if needed)
     * @returns {boolean} True if F1 is currently pressed
     */
    isF1Pressed() {
        return this.lastF1State;
    }

    /**
     * AI Agent Extension Point:
     * Future AI Agents can add new input handling methods here without affecting JSGame.js
     *
     * Examples for future AI Agent additions:
     * - handleKeyboardInput(deltaTime)
     * - handleMouseInput(deltaTime)
     * - handleControllerInput(deltaTime)
     * - registerInputCallback(key, callback)
     */
}

// Static version for hot-reload detection - only changes when file is reloaded
InputSystem.version = Date.now();

// Make InputSystem available globally for JSGame.js delegation
globalThis.InputSystem = InputSystem;