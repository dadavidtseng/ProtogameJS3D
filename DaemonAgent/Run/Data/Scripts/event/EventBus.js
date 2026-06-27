//----------------------------------------------------------------------------------------------------
// EventBus.js - Centralized Event System for Dependency Inversion
//----------------------------------------------------------------------------------------------------

/**
 * EventBus - Observer Pattern implementation for loose coupling between subsystems
 *
 * Features:
 * - Subscribe/unsubscribe event handlers
 * - Emit events with type-safe data
 * - Priority-based handler execution
 * - Error isolation (one handler failure doesn't affect others)
 * - Hot-reload compatible
 *
 * Architecture:
 * - Central event dispatching (managed by JSEngine)
 * - Subsystems depend on EventBus (abstraction), not each other
 * - Implements Dependency Inversion Principle (DIP)
 *
 * Usage:
 * ```javascript
 * // Subscribe to events
 * eventBus.subscribe('GameStateChanged', (eventData) => {
 *     console.log('State changed:', eventData);
 * });
 *
 * // Emit events
 * eventBus.emit('GameStateChanged', { oldState: 'ATTRACT', newState: 'GAME' });
 *
 * // Unsubscribe
 * eventBus.unsubscribe('GameStateChanged', handlerFunction);
 * ```
 */
export class EventBus
{
    constructor()
    {
        // Map<eventType: string, Array<{handler: function, priority: number}>>
        // Using Map for O(1) lookup, Array for priority ordering
        this.listeners = new Map();

        // Statistics for debugging
        this.eventStats = {
            totalEmitted: 0,
            totalHandlersCalled: 0,
            errors: 0
        };

        console.log('EventBus: Initialized (Observer Pattern for DIP)');
    }

    /**
     * Subscribe to an event type
     * @param {string} eventType - Event type identifier (e.g., 'GameStateChanged')
     * @param {function} handler - Callback function (eventData) => void
     * @param {number} priority - Execution priority (lower = earlier, default: 50)
     */
    subscribe(eventType, handler, priority = 50)
    {
        // Validate parameters
        if (typeof eventType !== 'string' || eventType.length === 0)
        {
            console.log('EventBus.subscribe: eventType must be a non-empty string');
            return;
        }

        if (typeof handler !== 'function')
        {
            console.log('EventBus.subscribe: handler must be a function');
            return;
        }

        // Create listener array if this is first subscription to this event type
        if (!this.listeners.has(eventType))
        {
            this.listeners.set(eventType, []);
        }

        // Add handler with priority
        const handlerEntry = { handler, priority };
        this.listeners.get(eventType).push(handlerEntry);

        // Sort by priority (lower priority = execute first)
        this.listeners.get(eventType).sort((a, b) => a.priority - b.priority);

        console.log(`EventBus: Subscribed to '${eventType}' (priority: ${priority}, total handlers: ${this.listeners.get(eventType).length})`);
    }

    /**
     * Unsubscribe from an event type
     * @param {string} eventType - Event type identifier
     * @param {function} handler - Handler function to remove
     */
    unsubscribe(eventType, handler)
    {
        if (!this.listeners.has(eventType))
        {
            console.log(`EventBus.unsubscribe: No listeners registered for '${eventType}'`);
            return;
        }

        const handlers = this.listeners.get(eventType);
        const initialLength = handlers.length;

        // Remove all entries with matching handler
        const filteredHandlers = handlers.filter(entry => entry.handler !== handler);

        if (filteredHandlers.length === initialLength)
        {
            console.log(`EventBus.unsubscribe: Handler not found for '${eventType}'`);
            return;
        }

        // Update listeners
        if (filteredHandlers.length === 0)
        {
            // No more handlers, remove event type entirely
            this.listeners.delete(eventType);
            console.log(`EventBus: Unsubscribed from '${eventType}' (no more handlers, event type removed)`);
        }
        else
        {
            this.listeners.set(eventType, filteredHandlers);
            console.log(`EventBus: Unsubscribed from '${eventType}' (remaining handlers: ${filteredHandlers.length})`);
        }
    }

    /**
     * Emit an event to all subscribed handlers
     * @param {string} eventType - Event type identifier
     * @param {object} eventData - Event data payload (optional)
     */
    emit(eventType, eventData = {})
    {
        // Update statistics
        this.eventStats.totalEmitted++;

        // Check if anyone is listening
        if (!this.listeners.has(eventType))
        {
            // No listeners - this is not an error, just means no one is interested
            return;
        }

        const handlers = this.listeners.get(eventType);

        // Call each handler in priority order
        for (const { handler, priority } of handlers)
        {
            try
            {
                // Error isolation: one handler failure doesn't affect others
                handler(eventData);
                this.eventStats.totalHandlersCalled++;
            }
            catch (error)
            {
                // Log error but continue processing other handlers
                console.log(`EventBus: Error in handler for '${eventType}' (priority: ${priority}):`, error);
                console.log('EventBus: Error stack:', error.stack);
                this.eventStats.errors++;
            }
        }
    }

    /**
     * Check if an event type has any subscribers
     * @param {string} eventType - Event type identifier
     * @returns {boolean} True if at least one handler is subscribed
     */
    hasListeners(eventType)
    {
        return this.listeners.has(eventType) && this.listeners.get(eventType).length > 0;
    }

    /**
     * Get number of subscribers for an event type
     * @param {string} eventType - Event type identifier
     * @returns {number} Number of subscribed handlers
     */
    getListenerCount(eventType)
    {
        if (!this.listeners.has(eventType))
        {
            return 0;
        }
        return this.listeners.get(eventType).length;
    }

    /**
     * Get all registered event types
     * @returns {string[]} Array of event type identifiers
     */
    getEventTypes()
    {
        return Array.from(this.listeners.keys());
    }

    /**
     * Clear all event listeners (useful for testing/cleanup)
     */
    clear()
    {
        const eventTypes = this.getEventTypes();
        this.listeners.clear();
        console.log(`EventBus: Cleared all listeners (${eventTypes.length} event types removed)`);
    }

    /**
     * Get event bus statistics (for debugging)
     * @returns {object} Statistics object
     */
    getStats()
    {
        return {
            ...this.eventStats,
            activeEventTypes: this.listeners.size,
            totalHandlers: Array.from(this.listeners.values()).reduce((sum, handlers) => sum + handlers.length, 0)
        };
    }

    /**
     * Log current event bus status (for debugging)
     */
    logStatus()
    {
        console.log('EventBus Status:');
        console.log('  Active Event Types:', this.listeners.size);

        for (const [eventType, handlers] of this.listeners.entries())
        {
            console.log(`  - ${eventType}: ${handlers.length} handler(s)`);
        }

        console.log('  Statistics:', JSON.stringify(this.getStats()));
    }
}

console.log('EventBus: Module loaded (Observer Pattern, Dependency Inversion)');
