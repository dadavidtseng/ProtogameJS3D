//----------------------------------------------------------------------------------------------------
// CameraShaker.mjs - Camera Shake Effect System Component
//----------------------------------------------------------------------------------------------------

/**
 * CameraShaker - Applies camera shake effects at regular intervals
 *
 * Responsibilities:
 * - Shake camera every 6 seconds (360 frames at 60fps)
 * - Generate random camera offset for shake effect
 * - Track last shake frame for timing
 *
 * Priority: 40 (Low - camera effects happen last)
 * Note: Uses systemDelta so camera shake continues even when game is paused
 *
 * AI Agent Note: This file CAN be edited by AI agents
 * Modify shake intensity, interval, or add new camera effects here
 */

export class CameraShaker {
    constructor(engine) {
        // SystemComponent pattern (id, priority, config)
        this.id = 'cameraShaker';
        this.priority = 40;
        this.enabled = true;
        this.data = {
            description: 'Shakes camera every 6 seconds',
            lastShakeFrame: 0,
            interval: 360 // 6 seconds at 60fps
        };

        // Dependencies
        this.engine = engine;

        console.log('CameraShaker: Created (priority: 40, interval: 360 frames)');
    }

    /**
     * Update method - called every frame
     * Applies camera shake at regular intervals
     * Note: Uses systemDelta parameter so it works even when game is paused
     * @param {number} gameDelta - Game time delta (pauses when game paused)
     * @param {number} systemDelta - System time delta (never pauses)
     */
    update(gameDelta, systemDelta) {
        // Get current frame count from engine (via CppBridgeSystem)
        const frameCount = this.engine.frameCount;

        // Check if enough frames have passed since last shake
        if (frameCount - this.data.lastShakeFrame >= this.data.interval) {
            this.applyShake();
            this.data.lastShakeFrame = frameCount;
        }
    }

    /**
     * Apply camera shake effect
     * AI agents can modify this method to change shake behavior
     */
    applyShake() {
        if (this.engine) {
            const shakeX = (Math.random() - 0.5) * 0.2;  // Random X offset: -0.1 to 0.1
            const shakeY = (Math.random() - 0.5) * 0.2;  // Random Y offset: -0.1 to 0.1
            const shakeZ = (Math.random() - 0.5) * 0.1;  // Random Z offset: -0.05 to 0.05

            this.engine.moveCamera(shakeX, shakeY, shakeZ);
            console.log(`CameraShaker: Applied shake (${shakeX.toFixed(3)}, ${shakeY.toFixed(3)}, ${shakeZ.toFixed(3)})`);
        }
    }

    /**
     * Set shake interval
     * @param {number} frames - Number of frames between shakes
     */
    setShakeInterval(frames) {
        this.data.interval = frames;
        console.log(`CameraShaker: Shake interval set to ${frames} frames`);
    }

    /**
     * Get current shake interval
     * @returns {number} Frames between shakes
     */
    getShakeInterval() {
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

console.log('CameraShaker: Component loaded (ECS pattern)');
