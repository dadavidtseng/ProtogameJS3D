// DebugRenderSystem.js
// JavaScript wrapper for debug visualization via GenericCommand pipeline
// Uses DebugRenderAPI (CommandQueue) instead of direct C++ DebugRenderSystemScriptInterface calls

import { Subsystem } from '../Core/Subsystem.js';
import { DebugRenderAPI } from '../Interface/DebugRenderAPI.js';

/**
 * DebugRenderSystem - JavaScript wrapper for debug visualization
 *
 * Provides debug rendering functionality including:
 * - Control (show/hide/clear)
 * - Geometry (points, lines, spheres, text, etc.)
 *
 * NOTE: Render-phase methods (beginFrame, renderWorld, renderScreen, endFrame)
 *       are now owned by C++ App::RenderDebugPrimitives(). JS only submits geometry/control commands.
 *
 * Usage:
 *   const debug = new DebugRenderSystem();
 *   await debug.addWorldLine(0, 0, 0, 1, 1, 1, 0.02, 0, 255, 0, 0, 255, "USE_DEPTH");
 */
export class DebugRenderSystem extends Subsystem
{
    constructor()
    {
        super('debugRenderSystem', 95, { enabled: true }); // Priority 95, before renderer (100)

        this.isInitialized = false;
        this.debugRenderAPI = new DebugRenderAPI();

        console.log('DebugRenderSystem: Module loaded (GenericCommand pipeline)');
        console.log(`DebugRenderSystem: this.id = ${this.id}, this.priority = ${this.priority}`);
        this.initialize();
    }

    /**
     * Initialize the debug render system and verify CommandQueue availability
     */
    initialize()
    {
        try
        {
            if (this.debugRenderAPI.isAvailable())
            {
                console.log('DebugRenderSystem: GenericCommand pipeline available');
                this.isInitialized = true;
            }
            else
            {
                console.log('DebugRenderSystem: GenericCommand pipeline NOT available!');
                this.isInitialized = false;
            }
        }
        catch (error)
        {
            console.log('DebugRenderSystem: Initialization failed:', error);
            this.isInitialized = false;
        }
    }

    /**
     * Update method - called every frame
     * @param {number} gameDelta - Game time delta
     * @param {number} systemDelta - System time delta
     */
    update(gameDelta, systemDelta)
    {
        // Debug render system has no per-frame update logic
        // All debug rendering operations are done through methods directly
    }

    /**
     * Render method - called every frame during render phase
     * NOTE: C++ owns the render cycle (beginFrame/renderWorld/renderScreen/endFrame)
     */
    render()
    {
        // No-op: C++ App::RenderDebugPrimitives() handles the render cycle
    }

    /**
     * Get system status for debugging
     */
    getSystemStatus()
    {
        return {
            id: this.id,
            priority: this.priority,
            enabled: this.enabled,
            isInitialized: this.isInitialized
        };
    }

    // === CONTROL METHODS ===

    /** Make debug rendering visible */
    async setVisible() { return this.debugRenderAPI.setVisible(); }

    /** Hide debug rendering */
    async setHidden() { return this.debugRenderAPI.setHidden(); }

    /** Clear all debug rendering objects */
    async clear() { return this.debugRenderAPI.clear(); }

    /** Clear all debug primitives from StateBuffer */
    async clearAll() { return this.debugRenderAPI.clearAll(); }

    // === GEOMETRY METHODS - WORLD SPACE ===

    /** Add debug point in world space */
    async addWorldPoint(x, y, z, radius, duration, r, g, b, a, mode = 'USE_DEPTH')
    {
        return this.debugRenderAPI.addWorldPoint(x, y, z, radius, duration, r, g, b, a, mode);
    }

    /** Add debug line in world space */
    async addWorldLine(x1, y1, z1, x2, y2, z2, radius, duration, r, g, b, a, mode = 'USE_DEPTH')
    {
        return this.debugRenderAPI.addWorldLine(x1, y1, z1, x2, y2, z2, radius, duration, r, g, b, a, mode);
    }

    /** Add debug cylinder in world space */
    async addWorldCylinder(baseX, baseY, baseZ, topX, topY, topZ, radius, duration, isWireframe, r, g, b, a, mode = 'USE_DEPTH')
    {
        return this.debugRenderAPI.addWorldCylinder(baseX, baseY, baseZ, topX, topY, topZ, radius, duration, isWireframe, r, g, b, a, mode);
    }

    /** Add debug wire sphere in world space */
    async addWorldWireSphere(x, y, z, radius, duration, r, g, b, a, mode = 'USE_DEPTH')
    {
        return this.debugRenderAPI.addWorldWireSphere(x, y, z, radius, duration, r, g, b, a, mode);
    }

    /** Add debug arrow in world space */
    async addWorldArrow(x1, y1, z1, x2, y2, z2, radius, duration, r, g, b, a, mode = 'USE_DEPTH')
    {
        return this.debugRenderAPI.addWorldArrow(x1, y1, z1, x2, y2, z2, radius, duration, r, g, b, a, mode);
    }

    /** Add debug text in world space */
    async addWorldText(text, transform, textHeight, alignX, alignY, duration, r, g, b, a, mode = 'USE_DEPTH')
    {
        return this.debugRenderAPI.addWorldText(text, transform, textHeight, alignX, alignY, duration, r, g, b, a, mode);
    }

    /** Add billboard text in world space */
    async addBillboardText(text, x, y, z, textHeight, alignX, alignY, duration, r, g, b, a, mode = 'USE_DEPTH')
    {
        return this.debugRenderAPI.addBillboardText(text, x, y, z, textHeight, alignX, alignY, duration, r, g, b, a, mode);
    }

    /** Add debug coordinate basis in world space */
    async addWorldBasis(transform, duration, mode = 'USE_DEPTH')
    {
        return this.debugRenderAPI.addWorldBasis(transform, duration, mode);
    }

    // === GEOMETRY METHODS - SCREEN SPACE ===

    /** Add debug text in screen space */
    async addScreenText(text, x, y, size, alignX, alignY, duration, r, g, b, a)
    {
        return this.debugRenderAPI.addScreenText(text, x, y, size, alignX, alignY, duration, r, g, b, a);
    }

    /** Add debug message */
    async addMessage(text, duration, r, g, b, a)
    {
        return this.debugRenderAPI.addMessage(text, duration, r, g, b, a);
    }
}

// Export to globalThis for hot-reload detection
globalThis.DebugRenderSystem = DebugRenderSystem;

console.log('DebugRenderSystem: Component loaded (GenericCommand pipeline)');
