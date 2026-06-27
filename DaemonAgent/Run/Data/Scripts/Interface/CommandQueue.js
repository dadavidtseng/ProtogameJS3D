//----------------------------------------------------------------------------------------------------
// CommandQueue.js
// GenericCommand System - JavaScript Facade for C++ GenericCommandScriptInterface
// Part of the interface wrapper layer for C++/JavaScript bridge
//----------------------------------------------------------------------------------------------------

/**
 * CommandQueue - JavaScript facade for the GenericCommand system
 *
 * This wrapper provides a JavaScript-friendly interface to the C++ GenericCommandScriptInterface,
 * enabling JS game code to submit commands to the C++ engine via the GenericCommand pipeline.
 *
 * Design Principles:
 * - Single Responsibility: Only wraps C++ GenericCommandScriptInterface
 * - Safe Fallbacks: Returns sensible defaults if C++ interface unavailable
 * - Type Safety: Client-side validation before C++ calls
 * - Async Callbacks: submit() supports optional callback for async results
 * - Error Resilience: JavaScript errors should never crash C++ engine
 *
 * Architecture:
 *   JS submit() → JSON.stringify(payload) → C++ GenericCommandScriptInterface.submit()
 *                → GenericCommandQueue (SPSC) → App::ProcessGenericCommands()
 *                → GenericCommandExecutor → handler → CallbackQueue → JS handleCallback()
 *
 * Callback Flow:
 *   Callbacks are NOT processed by this class directly.
 *   C++ delivers GENERIC callbacks through the shared CallbackQueue.
 *   JSEngine.processCallbacks() → JSEngine.executeCallback() routes 'GENERIC' type
 *   callbacks to CommandQueue.handleCallback().
 *
 * C++ Interface Methods (exposed via globalThis.commandQueue):
 *   - submit(type, payloadJson, agentId, callback?): callbackId
 *   - registerHandler(type, handlerFunc): boolean
 *   - unregisterHandler(type): boolean
 *   - getRegisteredTypes(): string (JSON array)
 *
 * Usage Example:
 * ```javascript
 * const commandQueue = new CommandQueue();
 *
 * // Submit a command with callback
 * commandQueue.submit('spawn_wave', { count: 5, type: 'enemy' }, 'gameLogic', (result) => {
 *     console.log('Wave spawned, result:', result);
 * });
 *
 * // Submit fire-and-forget command
 * commandQueue.submit('set_param', { key: 'gravity', value: 9.81 }, 'config');
 *
 * // Query registered handler types
 * const types = commandQueue.getRegisteredTypes();
 * console.log('Available command types:', types);
 * ```
 */
export class CommandQueue
{
    // Version tracking for hot-reload detection
    static version = 1;

    constructor()
    {
        // Singleton pattern: Return existing instance if available
        if (globalThis.CommandQueueAPI && globalThis.CommandQueueAPI instanceof CommandQueue)
        {
            console.log('CommandQueue: Returning existing singleton instance');
            return globalThis.CommandQueueAPI;
        }

        this.cppCommandQueue = globalThis.commandQueue; // C++ GenericCommandScriptInterface

        // Callback registry for async command results
        this.callbackRegistry = new Map(); // Maps callbackId → callback function

        // Make instance globally accessible for JSEngine callback routing
        globalThis.CommandQueueAPI = this;

        if (!this.cppCommandQueue)
        {
            console.log('CommandQueue: C++ interface (globalThis.commandQueue) not available');
        }
        else
        {
            console.log(`CommandQueue: Connected to C++ GenericCommandScriptInterface (version ${CommandQueue.version})`);
        }
    }

    //----------------------------------------------------------------------------------------------------
    // Callback Handling
    //----------------------------------------------------------------------------------------------------

    /**
     * Handle callback from C++ (routed by JSEngine.executeCallback for 'GENERIC' type)
     *
     * @param {number} callbackId - Callback ID from C++
     * @param {number} resultId - Result identifier (0 if failed)
     * @param {string} errorMessage - Error message (empty string if success)
     * @param {string} resultJson - Rich JSON result payload (empty if not provided)
     */
    handleCallback(callbackId, resultId, errorMessage, resultJson)
    {
        const callback = this.callbackRegistry.get(callbackId);

        if (!callback)
        {
            // Callback already executed or not registered (hot-reload or duplicate)
            return;
        }

        // Remove from registry (one-time use)
        this.callbackRegistry.delete(callbackId);

        try
        {
            if (errorMessage && errorMessage.length > 0)
            {
                console.log(`CommandQueue: Callback ${callbackId} failed: ${errorMessage}`);
                callback({ success: false, error: errorMessage, resultId: 0 });
            }
            else if (resultJson && resultJson.length > 0)
            {
                // Rich JSON result from GENERIC handler — parse and deliver directly
                try
                {
                    const parsed = JSON.parse(resultJson);
                    callback(parsed);
                }
                catch (parseError)
                {
                    console.log(`CommandQueue: Failed to parse resultJson for callback ${callbackId}: ${parseError.message}`);
                    callback({ success: true, error: '', resultId: resultId });
                }
            }
            else
            {
                callback({ success: true, error: '', resultId: resultId });
            }
        }
        catch (error)
        {
            console.log(`CommandQueue: Error executing callback ${callbackId}: ${error.message}`);
        }
    }

    //----------------------------------------------------------------------------------------------------
    // Command Submission
    //----------------------------------------------------------------------------------------------------

    /**
     * Submit a GenericCommand to the C++ engine
     *
     * @param {string} type - Command type identifier (must match a registered C++ handler)
     * @param {Object} payload - Command payload (will be JSON.stringify'd for C++)
     * @param {string} agentId - Identifier of the submitting agent/system
     * @param {Function} [callback] - Optional callback for async result
     * @returns {number} callbackId (0 if no callback or submission failed)
     */
    submit(type, payload, agentId, callback)
    {
        if (!this.cppCommandQueue || !this.cppCommandQueue.submit)
        {
            console.log('CommandQueue: ERROR - submit not available');
            if (callback) callback({ success: false, error: 'C++ interface not available', resultId: 0 });
            return 0;
        }

        // Validate: type must be non-empty string
        if (!type || typeof type !== 'string')
        {
            console.log('CommandQueue: ERROR - submit requires valid type string');
            if (callback) callback({ success: false, error: 'Invalid type', resultId: 0 });
            return 0;
        }

        // Validate: payload must be object (or null/undefined for no payload)
        if (payload !== null && payload !== undefined && typeof payload !== 'object')
        {
            console.log('CommandQueue: ERROR - payload must be an object or null');
            if (callback) callback({ success: false, error: 'Invalid payload', resultId: 0 });
            return 0;
        }

        // Validate: agentId must be string
        if (!agentId || typeof agentId !== 'string')
        {
            console.log('CommandQueue: ERROR - submit requires valid agentId string');
            if (callback) callback({ success: false, error: 'Invalid agentId', resultId: 0 });
            return 0;
        }

        // Validate: callback must be function if provided
        if (callback !== undefined && callback !== null && typeof callback !== 'function')
        {
            console.log('CommandQueue: ERROR - callback must be a function');
            return 0;
        }

        try
        {
            // Serialize payload to JSON string for C++ anti-corruption layer
            const payloadJson = JSON.stringify(payload || {});

            // Call C++ interface
            // Signature: submit(type, payloadJson, agentId, callback?)
            let result;
            if (callback)
            {
                result = this.cppCommandQueue.submit(type, payloadJson, agentId, callback);
            }
            else
            {
                result = this.cppCommandQueue.submit(type, payloadJson, agentId);
            }

            // Store callback in JS registry for routing by JSEngine
            if (callback && result !== 0)
            {
                this.callbackRegistry.set(result, callback);
            }

            return result;
        }
        catch (error)
        {
            console.log(`CommandQueue: ERROR - submit exception: ${error.message}`);
            if (callback) callback({ success: false, error: error.message, resultId: 0 });
            return 0;
        }
    }

    //----------------------------------------------------------------------------------------------------
    // Handler Registration (for future JS-side handlers)
    //----------------------------------------------------------------------------------------------------

    /**
     * Register a handler for a command type
     * Note: In current architecture, handlers are registered from C++ side.
     * This method is provided for future extensibility.
     *
     * @param {string} type - Command type to handle
     * @param {Function} handler - Handler function
     * @returns {boolean} true if registered successfully
     */
    registerHandler(type, handler)
    {
        if (!this.cppCommandQueue || !this.cppCommandQueue.registerHandler)
        {
            console.log('CommandQueue: ERROR - registerHandler not available');
            return false;
        }

        if (!type || typeof type !== 'string')
        {
            console.log('CommandQueue: ERROR - registerHandler requires valid type string');
            return false;
        }

        if (typeof handler !== 'function')
        {
            console.log('CommandQueue: ERROR - registerHandler requires handler function');
            return false;
        }

        try
        {
            return this.cppCommandQueue.registerHandler(type, handler);
        }
        catch (error)
        {
            console.log(`CommandQueue: ERROR - registerHandler exception: ${error.message}`);
            return false;
        }
    }

    /**
     * Unregister a handler for a command type
     *
     * @param {string} type - Command type to unregister
     * @returns {boolean} true if unregistered successfully
     */
    unregisterHandler(type)
    {
        if (!this.cppCommandQueue || !this.cppCommandQueue.unregisterHandler)
        {
            console.log('CommandQueue: ERROR - unregisterHandler not available');
            return false;
        }

        if (!type || typeof type !== 'string')
        {
            console.log('CommandQueue: ERROR - unregisterHandler requires valid type string');
            return false;
        }

        try
        {
            return this.cppCommandQueue.unregisterHandler(type);
        }
        catch (error)
        {
            console.log(`CommandQueue: ERROR - unregisterHandler exception: ${error.message}`);
            return false;
        }
    }

    //----------------------------------------------------------------------------------------------------
    // Query Methods
    //----------------------------------------------------------------------------------------------------

    /**
     * Get list of registered command handler types
     *
     * @returns {string[]} Array of registered command type strings
     */
    getRegisteredTypes()
    {
        if (!this.cppCommandQueue || !this.cppCommandQueue.getRegisteredTypes)
        {
            console.log('CommandQueue: ERROR - getRegisteredTypes not available');
            return [];
        }

        try
        {
            const jsonString = this.cppCommandQueue.getRegisteredTypes();
            return JSON.parse(jsonString);
        }
        catch (error)
        {
            console.log(`CommandQueue: ERROR - getRegisteredTypes exception: ${error.message}`);
            return [];
        }
    }

    //----------------------------------------------------------------------------------------------------
    // Utility Methods
    //----------------------------------------------------------------------------------------------------

    /**
     * Check if C++ GenericCommandScriptInterface is available
     * @returns {boolean} True if C++ interface is connected
     */
    isAvailable()
    {
        return this.cppCommandQueue !== undefined && this.cppCommandQueue !== null;
    }

    /**
     * Get interface status for debugging
     * @returns {Object} Status object with availability and method information
     */
    getStatus()
    {
        return {
            available: this.isAvailable(),
            cppInterfaceType: typeof this.cppCommandQueue,
            pendingCallbacks: this.callbackRegistry.size,
            hasMethods: this.cppCommandQueue ? {
                submit: typeof this.cppCommandQueue.submit === 'function',
                registerHandler: typeof this.cppCommandQueue.registerHandler === 'function',
                unregisterHandler: typeof this.cppCommandQueue.unregisterHandler === 'function',
                getRegisteredTypes: typeof this.cppCommandQueue.getRegisteredTypes === 'function'
            } : null
        };
    }
}

// Export for ES6 module system
export default CommandQueue;

// Export to globalThis for hot-reload detection
globalThis.CommandQueue = CommandQueue;

console.log('CommandQueue: GenericCommand facade loaded (Interface Layer)');
