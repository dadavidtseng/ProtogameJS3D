// Clock.js
// Pure JavaScript game clock — no C++ dependency
// Transforms system delta time with pause/timeScale controls

/**
 * Clock - Pure JavaScript game clock
 *
 * Receives system delta time each frame and applies local time controls:
 * - Pause/unpause
 * - Time scaling (slow motion, fast forward)
 * - Frame stepping for debugging
 *
 * Usage:
 *   const gameClock = new Clock();
 *   gameClock.pause();
 *   gameClock.setTimeScale(0.5);  // Slow motion
 *   // Each frame:
 *   gameClock.advance(systemDeltaSeconds);
 *   const delta = gameClock.getDeltaSeconds();
 */
export class Clock
{
    constructor()
    {
        this._deltaSeconds = 0;
        this._totalSeconds = 0;
        this._frameCount   = 0;
        this._timeScale    = 1.0;
        this._isPaused     = false;
        this._stepSingleFrame = false;

        console.log('Clock: Pure JS clock created');
    }

    /**
     * Advance the clock by the given system delta time.
     * Called once per frame before system updates.
     * @param {number} systemDeltaSeconds - Raw delta from C++ system clock
     */
    advance(systemDeltaSeconds)
    {
        if (this._isPaused && !this._stepSingleFrame)
        {
            this._deltaSeconds = 0;
            return;
        }

        this._deltaSeconds = systemDeltaSeconds * this._timeScale;
        this._totalSeconds += this._deltaSeconds;
        this._frameCount++;

        // Single-frame step: advance one frame then re-pause
        if (this._stepSingleFrame)
        {
            this._stepSingleFrame = false;
            this._isPaused = true;
        }
    }

    // === PAUSE CONTROL ===

    pause()           { this._isPaused = true; }
    unpause()         { this._isPaused = false; }
    togglePause()     { this._isPaused = !this._isPaused; }
    isPaused()        { return this._isPaused; }

    /**
     * Advance one frame while paused, then re-pause.
     */
    stepSingleFrame()
    {
        this._stepSingleFrame = true;
        this._isPaused = false;
    }

    // === TIME CONTROL ===

    setTimeScale(scale) { this._timeScale = Math.max(0.0, Math.min(10.0, scale)); }
    getTimeScale()      { return this._timeScale; }

    reset()
    {
        this._deltaSeconds = 0;
        this._totalSeconds = 0;
        this._frameCount   = 0;
    }

    // === TIME QUERIES ===

    getDeltaSeconds() { return this._deltaSeconds; }
    getTotalSeconds() { return this._totalSeconds; }
    getFrameCount()   { return this._frameCount; }

    getTimeInfo()
    {
        return {
            deltaSeconds: this._deltaSeconds,
            totalSeconds: this._totalSeconds,
            frameCount:   this._frameCount,
            timeScale:    this._timeScale,
            isPaused:     this._isPaused
        };
    }

    /**
     * No-op for backward compatibility (C++ Clock had destroy)
     */
    destroy() {}
}

// Export to globalThis for hot-reload detection
globalThis.Clock = Clock;

console.log('Clock: Component loaded (pure JavaScript implementation)');
