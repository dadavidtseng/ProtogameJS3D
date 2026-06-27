//----------------------------------------------------------------------------------------------------
// GameStateChangedEvent.js - Game State Change Event
//----------------------------------------------------------------------------------------------------

import { Event } from './Event.js';
import { EventTypes } from './EventTypes.js';

/**
 * GameStateChangedEvent - Fired when game state transitions
 *
 * Event Data:
 * - oldState: Previous GameState value ('ATTRACT', 'GAME', 'PAUSED')
 * - newState: New GameState value
 * - timestamp: When the state change occurred
 * - source: Optional source identifier (e.g., 'InputSystem', 'GameLogic')
 *
 * Subscribers:
 * - AudioSystem: Play state transition sound effects
 * - UI Systems: Update UI based on state changes
 * - Analytics: Track state transition patterns
 *
 * Usage:
 * ```javascript
 * const event = new GameStateChangedEvent('ATTRACT', 'GAME');
 * eventBus.emit(EventTypes.GAME_STATE_CHANGED, event);
 * ```
 */
export class GameStateChangedEvent extends Event
{
    /**
     * Create a game state change event
     * @param {string} oldState - Previous GameState value
     * @param {string} newState - New GameState value
     * @param {string} source - Optional source identifier
     */
    constructor(oldState, newState, source = 'Unknown')
    {
        // Call Event base class constructor
        super(EventTypes.GAME_STATE_CHANGED);

        // Validate state values
        const validStates = ['ATTRACT', 'GAME', 'PAUSED'];

        if (!validStates.includes(oldState))
        {
            console.log(`GameStateChangedEvent: oldState '${oldState}' is not a valid GameState`);
        }

        if (!validStates.includes(newState))
        {
            console.log(`GameStateChangedEvent: newState '${newState}' is not a valid GameState`);
        }

        // Store event-specific data
        this.oldState = oldState;
        this.newState = newState;
        this.source = source;
    }

    /**
     * Check if this is a transition to GAME state
     * @returns {boolean} True if transitioning to GAME
     */
    isEnteringGame()
    {
        return this.newState === 'GAME' && this.oldState !== 'GAME';
    }

    /**
     * Check if this is a transition from GAME state
     * @returns {boolean} True if leaving GAME
     */
    isLeavingGame()
    {
        return this.oldState === 'GAME' && this.newState !== 'GAME';
    }

    /**
     * Check if this is a transition to ATTRACT state
     * @returns {boolean} True if transitioning to ATTRACT
     */
    isEnteringAttract()
    {
        return this.newState === 'ATTRACT' && this.oldState !== 'ATTRACT';
    }

    /**
     * Check if this is a pause/unpause transition
     * @returns {boolean} True if pausing or unpausing
     */
    isPauseToggle()
    {
        return (this.oldState === 'PAUSED' && this.newState === 'GAME') ||
               (this.oldState === 'GAME' && this.newState === 'PAUSED');
    }

    /**
     * Get human-readable event description
     * @returns {string} Event description
     */
    toString()
    {
        return `GameStateChangedEvent[${this.oldState} → ${this.newState}] at ${new Date(this.timestamp).toISOString()} (source: ${this.source})`;
    }

    /**
     * Convert event to JSON (for logging/debugging)
     * @returns {object} JSON representation
     */
    toJSON()
    {
        return {
            ...super.toJSON(),
            oldState: this.oldState,
            newState: this.newState,
            source: this.source
        };
    }
}

console.log('GameStateChangedEvent: Event class loaded');
