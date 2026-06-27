//----------------------------------------------------------------------------------------------------
// EventTypes.js - Event Type Constants for Type-Safe Event System
//----------------------------------------------------------------------------------------------------

/**
 * EventTypes - Centralized event type definitions
 *
 * Purpose:
 * - Prevent typos in event type strings
 * - Centralize event type documentation
 * - Enable IDE autocomplete for event types
 * - Document event data payload structure
 *
 * Usage:
 * ```javascript
 * import { EventTypes } from './core/EventTypes.js';
 *
 * // Subscribe to events
 * eventBus.subscribe(EventTypes.GAME_STATE_CHANGED, handler);
 *
 * // Emit events
 * eventBus.emit(EventTypes.GAME_STATE_CHANGED, eventData);
 * ```
 */

/**
 * Event Type Constants
 * Object.freeze() prevents modification at runtime
 */
export const EventTypes = Object.freeze({
    /**
     * GAME_STATE_CHANGED - Fired when game state transitions
     *
     * Event Data Payload:
     * {
     *     oldState: string,  // Previous GameState value ('ATTRACT', 'GAME', 'PAUSED')
     *     newState: string,  // New GameState value
     *     timestamp: number  // When the state change occurred (ms)
     * }
     *
     * Subscribers:
     * - AudioSystem (play state transition sounds)
     * - UI systems (update UI based on state)
     * - Analytics systems (track state transitions)
     */
    GAME_STATE_CHANGED: 'GameStateChanged',

    /**
     * PLAYER_SPAWNED - Fired when player entity is created
     *
     * Event Data Payload:
     * {
     *     playerId: number,
     *     position: {x, y, z},
     *     timestamp: number
     * }
     *
     * (Future event - placeholder for extensibility)
     */
    // PLAYER_SPAWNED: 'PlayerSpawned',

    /**
     * PROP_CREATED - Fired when a prop is created
     *
     * Event Data Payload:
     * {
     *     propId: number,
     *     propType: string,
     *     position: {x, y, z},
     *     timestamp: number
     * }
     *
     * (Future event - placeholder for extensibility)
     */
    // PROP_CREATED: 'PropCreated',

    /**
     * AUDIO_SYSTEM_READY - Fired when audio system initialization completes
     *
     * Event Data Payload:
     * {
     *     isReady: boolean,
     *     timestamp: number
     * }
     *
     * (Future event - placeholder for extensibility)
     */
    // AUDIO_SYSTEM_READY: 'AudioSystemReady',
});

/**
 * Validate that a string is a registered event type
 * @param {string} eventType - Event type to validate
 * @returns {boolean} True if eventType is valid
 */
export function isValidEventType(eventType)
{
    const validTypes = Object.values(EventTypes);
    return validTypes.includes(eventType);
}

/**
 * Get all registered event types
 * @returns {string[]} Array of event type strings
 */
export function getAllEventTypes()
{
    return Object.values(EventTypes);
}

/**
 * Get event type constant name from value
 * @param {string} eventType - Event type value (e.g., 'GameStateChanged')
 * @returns {string|null} Constant name (e.g., 'GAME_STATE_CHANGED') or null if not found
 */
export function getEventTypeName(eventType)
{
    for (const [key, value] of Object.entries(EventTypes))
    {
        if (value === eventType)
        {
            return key;
        }
    }
    return null;
}

console.log('EventTypes: Constants loaded (Event type registry)');
console.log('EventTypes: Registered event types:', getAllEventTypes());
