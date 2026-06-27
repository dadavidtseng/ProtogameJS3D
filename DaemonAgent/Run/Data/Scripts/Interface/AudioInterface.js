//----------------------------------------------------------------------------------------------------
// AudioInterface.js
// Audio interface — all operations routed through GenericCommand pipeline
// Part of the interface wrapper layer for C++/JavaScript bridge
//----------------------------------------------------------------------------------------------------

/**
 * AudioInterface - Clean abstraction over C++ FMOD audio system
 *
 * All operations are submitted via CommandQueue.submit() through the GenericCommand pipeline.
 * C++ handlers execute on the main thread; results are delivered via CallbackQueue.
 *
 * Design Principles:
 * - Single Responsibility: Only wraps audio operations
 * - Safe Fallbacks: Returns sensible defaults if CommandQueue unavailable
 * - Type Safety: Clear return types and parameter documentation
 * - Async Callbacks: All methods use callbacks for async results
 * - Error Resilience: JavaScript errors should never crash C++ audio
 *
 * GenericCommand Operations:
 * - load_sound(soundPath, dimension) → callback(soundId)
 * - play_sound(soundId, volume, looped) → callback(playbackId)
 * - stop_sound(soundId) → callback(resultId)
 * - set_volume(soundId, volume) → callback(resultId)
 * - update_3d_position(soundId, position) → callback(resultId)
 *
 * Usage Example:
 * ```javascript
 * const audioInterface = new AudioInterface();
 * audioInterface.loadSoundAsync("Data/Audio/TestSound.mp3", (soundId) => {
 *     audioInterface.playSoundAsync(soundId, 1.0, false, (playbackId) => {
 *         console.log('Playing:', playbackId);
 *     });
 * });
 * ```
 */
export class AudioInterface
{
    constructor()
    {
        console.log('AudioInterface: Initialized (GenericCommand pipeline)');
    }

    /**
     * Check if GenericCommand pipeline is available for audio operations
     * @returns {boolean} True if CommandQueue is connected
     */
    isAvailable()
    {
        return globalThis.CommandQueueAPI !== undefined && globalThis.CommandQueueAPI !== null;
    }

    /**
     * Get interface status for debugging
     * @returns {Object} Status object with availability and pipeline information
     */
    getStatus()
    {
        return {
            available: this.isAvailable(),
            pipeline: 'GenericCommand',
            commandQueueAvailable: globalThis.CommandQueueAPI !== undefined
        };
    }

    //----------------------------------------------------------------------------------------------------
    // Async Methods (GenericCommand pipeline)
    //----------------------------------------------------------------------------------------------------

    /**
     * Load sound asynchronously via GenericCommand pipeline
     * @param {string} soundPath - Path to the sound file (e.g., "Data/Audio/TestSound.mp3")
     * @param {Function} callback - Callback function(soundId) called when sound is loaded (0 = failure)
     * @param {string} [dimension="Sound3D"] - Sound dimension: "Sound2D" or "Sound3D"
     * @returns {number} callbackId
     */
    loadSoundAsync(soundPath, callback, dimension = 'Sound2D')
    {
        const commandQueue = globalThis.CommandQueueAPI;
        if (!commandQueue || !commandQueue.isAvailable())
        {
            console.log('AudioInterface: ERROR - loadSoundAsync requires CommandQueue');
            if (callback) callback(-1);
            return 0;
        }

        if (!soundPath || typeof soundPath !== 'string')
        {
            console.log('AudioInterface: ERROR - soundPath must be a non-empty string');
            if (callback) callback(-1);
            return 0;
        }

        const callbackId = commandQueue.submit(
            'load_sound',
            { soundPath, dimension },
            'audio-interface',
            (result) =>
            {
                if (callback)
                {
                    callback(result.success ? result.resultId : -1);
                }
            }
        );

        return callbackId;
    }

    /**
     * Play sound asynchronously via GenericCommand pipeline
     * @param {number} soundId - Sound ID from loadSoundAsync
     * @param {number} [volume=1.0] - Volume (0.0 to 1.0)
     * @param {boolean} [looped=false] - Whether sound should loop
     * @param {Function} [callback] - Optional callback(soundId) when queued
     * @returns {number} callbackId
     */
    playSoundAsync(soundId, volume = 1.0, looped = false, callback = null)
    {
        const commandQueue = globalThis.CommandQueueAPI;
        if (!commandQueue || !commandQueue.isAvailable())
        {
            console.log('AudioInterface: ERROR - playSoundAsync requires CommandQueue');
            if (callback) callback(-1);
            return 0;
        }

        const callbackId = commandQueue.submit(
            'play_sound',
            { soundId, volume, looped },
            'audio-interface',
            (result) =>
            {
                if (callback)
                {
                    callback(result.success ? result.resultId : -1);
                }
            }
        );

        return callbackId;
    }

    /**
     * Stop sound asynchronously via GenericCommand pipeline
     * @param {number} soundId - Sound/Playback ID to stop
     * @param {Function} [callback] - Optional callback(soundId) when queued
     * @returns {number} callbackId
     */
    stopSoundAsync(soundId, callback = null)
    {
        const commandQueue = globalThis.CommandQueueAPI;
        if (!commandQueue || !commandQueue.isAvailable())
        {
            console.log('AudioInterface: ERROR - stopSoundAsync requires CommandQueue');
            if (callback) callback(-1);
            return 0;
        }

        const callbackId = commandQueue.submit(
            'stop_sound',
            { soundId },
            'audio-interface',
            (result) =>
            {
                if (callback)
                {
                    callback(result.success ? result.resultId : -1);
                }
            }
        );

        return callbackId;
    }

    /**
     * Set volume asynchronously via GenericCommand pipeline
     * @param {number} soundId - Sound/Playback ID
     * @param {number} volume - Volume (0.0 to 1.0)
     * @param {Function} [callback] - Optional callback(soundId) when queued
     * @returns {number} callbackId
     */
    setVolumeAsync(soundId, volume, callback = null)
    {
        const commandQueue = globalThis.CommandQueueAPI;
        if (!commandQueue || !commandQueue.isAvailable())
        {
            console.log('AudioInterface: ERROR - setVolumeAsync requires CommandQueue');
            if (callback) callback(-1);
            return 0;
        }

        const callbackId = commandQueue.submit(
            'set_volume',
            { soundId, volume },
            'audio-interface',
            (result) =>
            {
                if (callback)
                {
                    callback(result.success ? result.resultId : -1);
                }
            }
        );

        return callbackId;
    }

    /**
     * Update 3D position asynchronously via GenericCommand pipeline
     * @param {number} soundId - Sound/Playback ID
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} z - Z coordinate
     * @param {Function} [callback] - Optional callback(soundId) when queued
     * @returns {number} callbackId
     */
    update3DPositionAsync(soundId, x, y, z, callback = null)
    {
        const commandQueue = globalThis.CommandQueueAPI;
        if (!commandQueue || !commandQueue.isAvailable())
        {
            console.log('AudioInterface: ERROR - update3DPositionAsync requires CommandQueue');
            if (callback) callback(-1);
            return 0;
        }

        const callbackId = commandQueue.submit(
            'update_3d_position',
            { soundId, position: [x, y, z] },
            'audio-interface',
            (result) =>
            {
                if (callback)
                {
                    callback(result.success ? result.resultId : -1);
                }
            }
        );

        return callbackId;
    }
}

// Export for ES6 module system
export default AudioInterface;

// Export to globalThis for hot-reload detection
globalThis.AudioInterface = AudioInterface;

console.log('AudioInterface: Wrapper loaded (Interface Layer)');
