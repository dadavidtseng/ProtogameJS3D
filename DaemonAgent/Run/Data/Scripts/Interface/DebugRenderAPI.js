//----------------------------------------------------------------------------------------------------
// DebugRenderAPI.js
// Debug render API using GenericCommand pipeline (CommandQueue → GenericCommandQueue → C++ handlers)
// Replaces DebugRenderInterface.js which called C++ DebugRenderSystemScriptInterface directly
//----------------------------------------------------------------------------------------------------

/**
 * DebugRenderAPI - Async debug render API via GenericCommand pipeline
 *
 * Architecture: JavaScript → CommandQueue.submit() → GenericCommandQueue
 *               → GenericCommandExecutor → Handler lambda → DebugRenderStateBuffer
 *               → App::RenderDebugPrimitives() (C++ render cycle)
 *
 * Design Principles:
 * - Async Everywhere: All methods return Promises for error detection and ordering
 * - GenericCommand Pipeline: Uses CommandQueue.submit() instead of direct C++ calls
 * - No Render-Phase Methods: C++ owns beginFrame/renderWorld/renderScreen/endFrame
 * - Single Responsibility: Only submits debug render commands
 *
 * Command Types:
 * Control: debug_render.set_visible, debug_render.set_hidden,
 *          debug_render.clear, debug_render.clear_all
 * World Geometry: debug_render.add_world_point, debug_render.add_world_line,
 *                 debug_render.add_world_cylinder, debug_render.add_world_wire_sphere,
 *                 debug_render.add_world_arrow, debug_render.add_world_text,
 *                 debug_render.add_billboard_text, debug_render.add_world_basis
 * Screen Geometry: debug_render.add_screen_text, debug_render.add_message
 */
export class DebugRenderAPI
{
    constructor()
    {
        const commandQueue = globalThis.CommandQueueAPI;
        if (!commandQueue || !commandQueue.isAvailable())
        {
            console.log('DebugRenderAPI: WARNING - CommandQueue not available at construction time');
        }
        else
        {
            console.log('DebugRenderAPI: Connected to GenericCommand pipeline');
        }
    }

    //----------------------------------------------------------------------------------------------------
    // Control Methods
    //----------------------------------------------------------------------------------------------------

    /**
     * Make debug rendering visible
     * @returns {Promise<void>} Resolves on success, rejects on failure
     */
    async setVisible()
    {
        return this._submit('debug_render.set_visible', {});
    }

    /**
     * Hide debug rendering
     * @returns {Promise<void>} Resolves on success, rejects on failure
     */
    async setHidden()
    {
        return this._submit('debug_render.set_hidden', {});
    }

    /**
     * Clear all debug rendering objects
     * @returns {Promise<void>} Resolves on success, rejects on failure
     */
    async clear()
    {
        return this._submit('debug_render.clear', {});
    }

    /**
     * Clear all debug primitives from StateBuffer (use when changing game states)
     * @returns {Promise<void>} Resolves on success, rejects on failure
     */
    async clearAll()
    {
        return this._submit('debug_render.clear_all', {});
    }

    //----------------------------------------------------------------------------------------------------
    // Geometry Methods - World Space
    //----------------------------------------------------------------------------------------------------

    /**
     * Add debug point in world space
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} z - Z coordinate
     * @param {number} radius - Point radius
     * @param {number} duration - Display duration (0 = one frame)
     * @param {number} r - Red (0-255)
     * @param {number} g - Green (0-255)
     * @param {number} b - Blue (0-255)
     * @param {number} a - Alpha (0-255)
     * @param {string} mode - Render mode: "ALWAYS", "USE_DEPTH", "X_RAY"
     * @returns {Promise<void>}
     */
    async addWorldPoint(x, y, z, radius, duration, r, g, b, a, mode = 'USE_DEPTH')
    {
        return this._submit('debug_render.add_world_point', { x, y, z, radius, duration, r, g, b, a, mode });
    }

    /**
     * Add debug line in world space
     * @param {number} x1 - Start X
     * @param {number} y1 - Start Y
     * @param {number} z1 - Start Z
     * @param {number} x2 - End X
     * @param {number} y2 - End Y
     * @param {number} z2 - End Z
     * @param {number} radius - Line radius
     * @param {number} duration - Display duration (0 = one frame)
     * @param {number} r - Red (0-255)
     * @param {number} g - Green (0-255)
     * @param {number} b - Blue (0-255)
     * @param {number} a - Alpha (0-255)
     * @param {string} mode - Render mode
     * @returns {Promise<void>}
     */
    async addWorldLine(x1, y1, z1, x2, y2, z2, radius, duration, r, g, b, a, mode = 'USE_DEPTH')
    {
        return this._submit('debug_render.add_world_line', { x1, y1, z1, x2, y2, z2, radius, duration, r, g, b, a, mode });
    }

    /**
     * Add debug cylinder in world space
     * @returns {Promise<void>}
     */
    async addWorldCylinder(baseX, baseY, baseZ, topX, topY, topZ, radius, duration, isWireframe, r, g, b, a, mode = 'USE_DEPTH')
    {
        return this._submit('debug_render.add_world_cylinder', { baseX, baseY, baseZ, topX, topY, topZ, radius, duration, isWireframe, r, g, b, a, mode });
    }

    /**
     * Add debug wire sphere in world space
     * @returns {Promise<void>}
     */
    async addWorldWireSphere(x, y, z, radius, duration, r, g, b, a, mode = 'USE_DEPTH')
    {
        return this._submit('debug_render.add_world_wire_sphere', { x, y, z, radius, duration, r, g, b, a, mode });
    }

    /**
     * Add debug arrow in world space
     * @returns {Promise<void>}
     */
    async addWorldArrow(x1, y1, z1, x2, y2, z2, radius, duration, r, g, b, a, mode = 'USE_DEPTH')
    {
        return this._submit('debug_render.add_world_arrow', { x1, y1, z1, x2, y2, z2, radius, duration, r, g, b, a, mode });
    }

    /**
     * Add debug text in world space
     * @param {string} text - Text to display
     * @param {Array<number>} transform - 16-element transform matrix
     * @param {number} textHeight - Text height
     * @param {number} alignX - X alignment
     * @param {number} alignY - Y alignment
     * @param {number} duration - Display duration
     * @param {number} r - Red (0-255)
     * @param {number} g - Green (0-255)
     * @param {number} b - Blue (0-255)
     * @param {number} a - Alpha (0-255)
     * @param {string} mode - Render mode
     * @returns {Promise<void>}
     */
    async addWorldText(text, transform, textHeight, alignX, alignY, duration, r, g, b, a, mode = 'USE_DEPTH')
    {
        return this._submit('debug_render.add_world_text', { text, transform, textHeight, alignX, alignY, duration, r, g, b, a, mode });
    }

    /**
     * Add billboard text in world space
     * @param {string} text - Text to display
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @param {number} z - Position Z
     * @param {number} textHeight - Text height
     * @param {number} alignX - X alignment
     * @param {number} alignY - Y alignment
     * @param {number} duration - Display duration
     * @param {number} r - Red (0-255)
     * @param {number} g - Green (0-255)
     * @param {number} b - Blue (0-255)
     * @param {number} a - Alpha (0-255)
     * @param {string} mode - Render mode
     * @returns {Promise<void>}
     */
    async addBillboardText(text, x, y, z, textHeight, alignX, alignY, duration, r, g, b, a, mode = 'USE_DEPTH')
    {
        return this._submit('debug_render.add_billboard_text', { text, x, y, z, textHeight, alignX, alignY, duration, r, g, b, a, mode });
    }

    /**
     * Add debug coordinate basis in world space
     * @param {Array<number>} transform - 16-element transform matrix
     * @param {number} duration - Display duration
     * @param {string} mode - Render mode
     * @returns {Promise<void>}
     */
    async addWorldBasis(transform, duration, mode = 'USE_DEPTH')
    {
        return this._submit('debug_render.add_world_basis', { transform, duration, mode });
    }

    //----------------------------------------------------------------------------------------------------
    // Geometry Methods - Screen Space
    //----------------------------------------------------------------------------------------------------

    /**
     * Add debug text in screen space
     * @param {string} text - Text to display
     * @param {number} x - Screen X coordinate
     * @param {number} y - Screen Y coordinate
     * @param {number} size - Text size
     * @param {number} alignX - X alignment
     * @param {number} alignY - Y alignment
     * @param {number} duration - Display duration
     * @param {number} r - Red (0-255)
     * @param {number} g - Green (0-255)
     * @param {number} b - Blue (0-255)
     * @param {number} a - Alpha (0-255)
     * @returns {Promise<void>}
     */
    async addScreenText(text, x, y, size, alignX, alignY, duration, r, g, b, a)
    {
        return this._submit('debug_render.add_screen_text', { text, x, y, size, alignX, alignY, duration, r, g, b, a });
    }

    /**
     * Add debug message
     * @param {string} text - Message text
     * @param {number} duration - Display duration
     * @param {number} r - Red (0-255)
     * @param {number} g - Green (0-255)
     * @param {number} b - Blue (0-255)
     * @param {number} a - Alpha (0-255)
     * @returns {Promise<void>}
     */
    async addMessage(text, duration, r, g, b, a)
    {
        return this._submit('debug_render.add_message', { text, duration, r, g, b, a });
    }

    //----------------------------------------------------------------------------------------------------
    // Utility Methods
    //----------------------------------------------------------------------------------------------------

    /**
     * Check if GenericCommand pipeline is available for debug render operations
     * @returns {boolean} True if CommandQueue is connected
     */
    isAvailable()
    {
        const commandQueue = globalThis.CommandQueueAPI;
        return commandQueue !== undefined && commandQueue !== null && commandQueue.isAvailable();
    }

    /**
     * Get interface status for debugging
     */
    getStatus()
    {
        return {
            available: this.isAvailable(),
            pipeline: 'GenericCommand (CommandQueue → GenericCommandQueue → C++ handlers)'
        };
    }

    //----------------------------------------------------------------------------------------------------
    // Private Helper
    //----------------------------------------------------------------------------------------------------

    /**
     * Submit a command through the GenericCommand pipeline with Promise wrapping
     * @param {string} commandType - GenericCommand type (e.g. 'debug_render.add_world_line')
     * @param {Object} params - Command parameters
     * @returns {Promise<void>} Resolves on success, rejects on failure
     * @private
     */
    async _submit(commandType, params)
    {
        const commandQueue = globalThis.CommandQueueAPI;
        if (!commandQueue || !commandQueue.isAvailable())
        {
            console.log(`DebugRenderAPI: ERROR - ${commandType} requires CommandQueue`);
            return;
        }

        return new Promise((resolve, reject) =>
        {
            commandQueue.submit(
                commandType,
                params,
                'debug-render-api',
                (result) =>
                {
                    if (result && result.success) { resolve(); }
                    else { reject(new Error(result?.error || `${commandType} failed`)); }
                }
            );
        });
    }
}

// Export for ES6 module system
export default DebugRenderAPI;

// Export to globalThis for hot-reload detection
globalThis.DebugRenderAPI = DebugRenderAPI;

console.log('DebugRenderAPI: Loaded (GenericCommand pipeline)');

