//----------------------------------------------------------------------------------------------------
// CubeSpawner.mjs - Cube Spawning System Component
//----------------------------------------------------------------------------------------------------

/**
 * CubeSpawner - Spawns cubes at regular intervals
 *
 * Responsibilities:
 * - Spawn cubes every 4 seconds (240 frames at 60fps)
 * - Generate random positions within game space
 * - Track last spawn frame for timing
 *
 * Priority: 20 (Medium - after input, before prop movement)
 *
 * AI Agent Note: This file CAN be edited by AI agents
 * Modify spawn interval, position logic, or add new spawn patterns here
 */

export class CubeSpawner {
    constructor(engine) {
        // SystemComponent pattern (id, priority, config)
        this.id = 'cubeSpawner';
        this.priority = 20;
        this.enabled = true;
        this.data = {
            description: 'Spawns cubes every 4 seconds',
            lastSpawnFrame: 0,
            interval: 240 // 4 seconds at 60fps
        };

        // Dependencies
        this.engine = engine;

        console.log('CubeSpawner: Created (priority: 20, interval: 240 frames)');
    }

    /**
     * Update method - called every frame
     * Spawns cubes at regular intervals
     * @param {number} gameDelta - Game time delta (pauses when game paused)
     * @param {number} systemDelta - System time delta (never pauses)
     */
    update(gameDelta, systemDelta) {
        // Get current frame count from engine (via CppBridgeSystem)
        const frameCount = this.engine.frameCount;

        // Check if enough frames have passed since last spawn
        if (frameCount - this.data.lastSpawnFrame >= this.data.interval) {
            this.spawnCube();
            this.data.lastSpawnFrame = frameCount;
        }
    }

    /**
     * Spawn a cube at a random position
     * AI agents can modify this method to change spawn behavior
     */
    spawnCube() {
        if (this.engine) {
            const x = (Math.random() - 0.5) * 10;  // Random x: -5 to 5
            const y = (Math.random() - 0.5) * 10;  // Random y: -5 to 5
            const z = Math.random() * 3;            // Random z: 0 to 3

            this.engine.createCube(x, y, z);
            console.log(`CubeSpawner: Spawned cube at (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`);
        }
    }

    /**
     * Set spawn interval
     * @param {number} frames - Number of frames between spawns
     */
    setSpawnInterval(frames) {
        this.data.interval = frames;
        console.log(`CubeSpawner: Spawn interval set to ${frames} frames`);
    }

    /**
     * Get current spawn interval
     * @returns {number} Frames between spawns
     */
    getSpawnInterval() {
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

console.log('CubeSpawner: Component loaded (ECS pattern)');
