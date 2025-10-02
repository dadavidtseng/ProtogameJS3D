//----------------------------------------------------------------------------------------------------
// CppBridgeSystem.mjs - C++ Engine Bridge System Component
//----------------------------------------------------------------------------------------------------

/**
 * CppBridgeSystem - Bridges JavaScript execution with C++ engine
 *
 * Responsibilities:
 * - Call C++ engine update and render methods
 * - Track frame count for other systems
 * - Manage shouldRender flag for F1 toggle functionality
 *
 * Priority: 0 (Highest - must run first)
 *
 * CRITICAL: This is core infrastructure - should NOT be edited by AI agents
 * Only modify with explicit permission and full understanding of C++ bridge implications
 */

export class CppBridgeSystem {
    constructor(engine) {
        // SystemComponent pattern (id, priority, config)
        this.id = 'cppBridge';
        this.priority = 0;
        this.enabled = true;
        this.data = {
            description: 'Bridges JavaScript to C++ engine, manages frame count'
        };

        // Dependencies
        this.engine = engine;
        this.frameCount = 0;

        console.log('CppBridgeSystem: Created (priority: 0, bridges JS ↔ C++)');
    }

    /**
     * Update method - called every frame
     * Calls C++ engine update and increments frame count
     * @param {number} gameDelta - Game time delta (pauses when game paused)
     * @param {number} systemDelta - System time delta (never pauses)
     */
    update(gameDelta, systemDelta) {
        this.frameCount++;

        // Call C++ engine update if available
        if (this.engine) {
            this.engine.updateCppEngine(gameDelta, systemDelta);
        }
    }

    /**
     * Render method - called every frame
     * Calls C++ engine render, respects shouldRender flag
     */
    render() {
        // Check global shouldRender flag (F1 toggle functionality)
        let shouldRenderValue = true;
        if (typeof globalThis.shouldRender !== 'undefined') {
            shouldRenderValue = globalThis.shouldRender;
        }

        // Only render if flag is true
        if (shouldRenderValue && this.engine) {
            this.engine.renderCppEngine();
        }
    }

    /**
     * Get current frame count
     * Used by other systems for timing (CubeSpawner, PropMover, CameraShaker)
     * @returns {number} Current frame count
     */
    getFrameCount() {
        return this.frameCount;
    }

    /**
     * Static version for hot-reload detection
     * DO NOT modify - this is infrastructure
     */
    static get version() {
        return Date.now();
    }
}

console.log('CppBridgeSystem: Component loaded (ECS pattern)');
