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
        this.lastSpaceState = false; // Track spacebar for game state transitions
        console.log('CONSTRUCTOR: InputSystem created at', Date.now());
    }

    /**
     * Core input logic extracted from JSGame.js updateInputHandler method
     * Handles F1 key detection and shouldRender toggle functionality
     * Now also handles keyboard-based game state transitions (extracted from C++ Game::UpdateFromKeyBoard)
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
        if (this.logTimer >= 300) {
            console.log('MODIFY InputSystem HandleInput');
            this.logTimer = 0; // Reset timer
        }

        // Handle F1 key (shouldRender toggle)
        this.handleF1Key();
        
        // Handle keyboard-based game state transitions (extracted from C++ Game::UpdateFromKeyBoard)
        this.handleKeyboardGameState();
    }

    /**
     * Handle F1 key for shouldRender toggle
     */
    handleF1Key() {
        let currentF1State = false;
        
        // Try legacy input API (C++ InputScriptInterface)
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
     * Handle keyboard-based game state transitions (extracted from C++ Game::UpdateFromKeyBoard)
     * Original C++ logic:
     * if (m_gameState == eGameState::ATTRACT) {
     *     if (g_input->WasKeyJustPressed(KEYCODE_SPACE)) {
     *         m_gameState = eGameState::GAME;
     *     }
     * }
     */
    handleKeyboardGameState() {
        let currentSpaceState = false;
        
        // Check spacebar state using C++ input system
        if (typeof input !== 'undefined' && input.wasKeyJustPressed) {
            currentSpaceState = input.wasKeyJustPressed(32); // Spacebar key code
        }

        // Edge detection for spacebar press
        if (currentSpaceState && !this.lastSpaceState) {
            console.log('InputSystem: Spacebar pressed - starting game state check');
            
            // Check if game object is available
            if (typeof game !== 'undefined') {
                console.log('InputSystem: game object is available');
                
                // Use PROPERTY-BASED access (NEW IMPLEMENTATION)
                try {
                    console.log('InputSystem: Attempting to read game.gameState...');
                    const currentGameState = game.gameState;
                    console.log('InputSystem: game.gameState returned:', currentGameState, '(type:', typeof currentGameState, ')');
                    
                    // If in ATTRACT mode and spacebar was just pressed, switch to GAME mode
                    // C++ enum: eGameState::ATTRACT = 0, eGameState::GAME = 1
                    // GameScriptInterface converts these to strings: "ATTRACT", "GAME"
                    if (currentGameState === 'ATTRACT') {
                        console.log('InputSystem: Current state is ATTRACT, attempting to change to GAME');
                        try {
                            console.log('InputSystem: Setting game.gameState = "GAME"...');
                            game.gameState = 'GAME';
                            console.log('InputSystem: Property assignment completed');
                            
                            // Verify the change
                            const newState = game.gameState;
                            console.log('InputSystem: After setting, game.gameState is now:', newState);
                            console.log('InputSystem: Spacebar pressed - Game state changed from ATTRACT to GAME via PROPERTY ACCESS');
                        } catch (error) {
                            console.log('InputSystem: Spacebar pressed but failed to set game state via property:', error);
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
     * Get the current spacebar key state
     * @returns {boolean} Current spacebar key state
     */
    getLastSpaceState() {
        return this.lastSpaceState;
    }

    /**
     * Check if F1 key is currently pressed (for other systems if needed)
     * @returns {boolean} True if F1 is currently pressed
     */
    isF1Pressed() {
        return this.lastF1State;
    }

    /**
     * Check if spacebar key is currently pressed (for other systems if needed)
     * @returns {boolean} True if spacebar is currently pressed
     */
    isSpacePressed() {
        return this.lastSpaceState;
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