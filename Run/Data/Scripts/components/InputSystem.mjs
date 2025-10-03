// InputSystem.mjs
// Phase 4 ES6 Module version using SystemComponent pattern

import { SystemComponent } from '../core/SystemComponent.mjs';
import { KEYCODE_F1, KEYCODE_SPACE } from '../InputSystemCommon.mjs';

/**
 * InputSystem - Handles all input-related functionality
 * Phase 4 ES6 Module using SystemComponent pattern
 *
 * Features:
 * - F1 key debugging toggle
 * - Spacebar game state transitions
 * - Audio system integration
 */
export class InputSystem extends SystemComponent {
    constructor() {
        super('inputSystem', 10, { enabled: true });

        this.lastF1State = false;
        this.lastSpaceState = false;
        this.logTimer = 0;
        this.audioSystem = null; // Will be set by JSGame

        console.log('InputSystem: Module loaded (Phase 4 ES6)');
    }

    /**
     * Set the AudioSystem instance (called by JSGame)
     * @param {AudioSystem} audioSystem - AudioSystem instance from JSGame
     */
    setAudioSystem(audioSystem) {
        this.audioSystem = audioSystem;
        console.log('InputSystem: AudioSystem instance set');
    }

    /**
     * Update method - called every frame
     * @param {number} gameDelta - Game time delta
     * @param {number} systemDelta - System time delta
     */
    update(gameDelta, systemDelta) {
        // Accumulate time for logging
        this.logTimer += systemDelta;

        // Periodic logging (every 300ms)
        if (this.logTimer >= 300) {
            console.log('MODIFY InputSystem HandleInput');

            this.logTimer = 0;
        }

        // Handle F1 key (shouldRender toggle)
        this.handleF1Key();

        // Handle keyboard-based game state transitions
        this.handleKeyboardGameState();
    }

    /**
     * Handle F1 key for shouldRender toggle
     */
    handleF1Key() {
        let currentF1State = false;

        // Try legacy input API (C++ InputScriptInterface)
        if (typeof input !== 'undefined' && input.wasKeyJustPressed) {
            currentF1State = input.wasKeyJustPressed(KEYCODE_F1);
        }

        // Edge detection and shouldRender toggle
        if (currentF1State && !this.lastF1State) {
            if (typeof shouldRender !== 'undefined') {
                shouldRender = !shouldRender;
                console.log('InputSystem: F1 pressed, shouldRender =', shouldRender);
            } else if (typeof globalThis.shouldRender !== 'undefined') {
                globalThis.shouldRender = !globalThis.shouldRender;
                console.log('InputSystem: F1 pressed, globalThis.shouldRender =', globalThis.shouldRender);
            } else {
                console.log('InputSystem: F1 pressed but shouldRender variable not found!');
            }
        }

        // Update state for next frame edge detection
        this.lastF1State = currentF1State;
    }

    /**
     * Handle keyboard-based game state transitions
     */
    handleKeyboardGameState() {
        let currentSpaceState = false;

        // Check spacebar state using C++ input system
        if (typeof input !== 'undefined' && input.wasKeyJustPressed) {
            currentSpaceState = input.wasKeyJustPressed(KEYCODE_SPACE);
        }

        // Edge detection for spacebar press
        if (currentSpaceState && !this.lastSpaceState) {
            console.log('InputSystem: Spacebar pressed - starting game state check');

            // Check if game object is available
            if (typeof game !== 'undefined') {
                console.log('InputSystem: game object is available');

                // Use PROPERTY-BASED access
                try {
                    const currentGameState = game.gameState;
                    console.log('InputSystem: game.gameState returned:', currentGameState);

                    // If in ATTRACT mode and spacebar was just pressed, switch to GAME mode
                    if (currentGameState === 'ATTRACT') {
                        console.log('InputSystem: Current state is ATTRACT, attempting to change to GAME');

                        // Play click sound effect when changing from ATTRACT to GAME
                        if (this.audioSystem) {
                            const clickSound = this.audioSystem.createOrGetSound("Data/Audio/TestSound.mp3", "Sound2D");
                            if (clickSound !== null && clickSound !== undefined) {
                                this.audioSystem.startSound(clickSound);
                                console.log('InputSystem: Click sound effect played successfully');
                            } else {
                                console.log('InputSystem: Failed to load click sound effect');
                            }
                        } else {
                            console.log('InputSystem: AudioSystem not available');
                        }

                        // Try to change game state
                        try {
                            game.gameState = 'GAME';
                            console.log('InputSystem: Game state changed from ATTRACT to GAME');
                        } catch (error) {
                            console.log('InputSystem: Failed to set game state:', error);
                        }
                    } else {
                        console.log('InputSystem: Spacebar pressed but not in ATTRACT mode (current state:', currentGameState, ')');
                    }
                } catch (error) {
                    console.log('InputSystem: Error accessing game properties:', error);
                }
            } else {
                console.log('InputSystem: Spacebar pressed but game object not available');
            }
        }

        // Update state for next frame edge detection
        this.lastSpaceState = currentSpaceState;
    }

    /**
     * Get the current F1 key state
     * @returns {boolean} Current F1 key state
     */
    getLastF1State() {
        return this.lastF1State;
    }

    /**
     * Get the current spacebar key state
     * @returns {boolean} Current spacebar key state
     */
    getLastSpaceState() {
        return this.lastSpaceState;
    }
}

// Export for ES6 module system
export default InputSystem;

console.log('InputSystem: Component loaded (Phase 4 ES6)');
