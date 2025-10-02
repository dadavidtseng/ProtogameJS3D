//----------------------------------------------------------------------------------------------------
// PropMover.mjs - Prop Movement System Component
//----------------------------------------------------------------------------------------------------

/**
 * PropMover - Moves props at regular intervals
 *
 * Responsibilities:
 * - Move props every 2 seconds (120 frames at 60fps)
 * - Generate random positions for props
 * - Track last move frame for timing
 *
 * Priority: 30 (Medium-Low - after cube spawning)
 *
 * AI Agent Note: This file CAN be edited by AI agents
 * Modify move interval, position logic, or add new movement patterns here
 */

export class PropMover {
    constructor(engine) {
        // SystemComponent pattern (id, priority, config)
        this.id = 'propMover';
        this.priority = 30;
        this.enabled = true;
        this.data = {
            description: 'Moves props every 2 seconds',
            lastMoveFrame: 0,
            interval: 120 // 2 seconds at 60fps
        };

        // Dependencies
        this.engine = engine;

        console.log('PropMover: Created (priority: 30, interval: 120 frames)');
    }

    /**
     * Update method - called every frame
     * Moves props at regular intervals
     * @param {number} gameDelta - Game time delta (pauses when game paused)
     * @param {number} systemDelta - System time delta (never pauses)
     */
    update(gameDelta, systemDelta) {
        // Get current frame count from engine (via CppBridgeSystem)
        const frameCount = this.engine.frameCount;

        // Wait until at least 240 frames have passed (4 seconds) before moving props
        if (frameCount > 240 && frameCount - this.data.lastMoveFrame >= this.data.interval) {
            this.moveProp();
            this.data.lastMoveFrame = frameCount;
        }
    }

    /**
     * Move a prop to a random position
     * AI agents can modify this method to change movement behavior
     */
    moveProp() {
        if (this.engine) {
            const propIndex = 0; // Move the first prop
            const x = (Math.random() - 0.5) * 8;   // Random x: -4 to 4
            const y = (Math.random() - 0.5) * 8;   // Random y: -4 to 4
            const z = Math.random() * 2;            // Random z: 0 to 2

            this.engine.moveProp(propIndex, x, y, z);
            console.log(`PropMover: Moved prop ${propIndex} to (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`);
        }
    }

    /**
     * Set move interval
     * @param {number} frames - Number of frames between moves
     */
    setMoveInterval(frames) {
        this.data.interval = frames;
        console.log(`PropMover: Move interval set to ${frames} frames`);
    }

    /**
     * Get current move interval
     * @returns {number} Frames between moves
     */
    getMoveInterval() {
        return this.data.interval;
    }

    /**
     * Static version for hot-reload detection
     * AI agents can trigger hot-reload by modifying this file
     */
    static get version() {
        return Date.now();
    }
}

console.log('PropMover: Component loaded (ECS pattern)');
