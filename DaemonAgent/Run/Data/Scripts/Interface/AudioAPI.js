//----------------------------------------------------------------------------------------------------
// AudioAPI.js
// High-level async audio API following EntityAPI/CameraAPI pattern
//----------------------------------------------------------------------------------------------------

import { AudioInterface } from './AudioInterface.js';

/**
 * AudioAPI - High-level async audio operations with callback handling
 *
 * Follows the same pattern as EntityAPI and CameraAPI:
 * - Stores callbacks in callbackRegistry
 * - C++ enqueues results to CallbackQueue
 * - JSEngine routes callbacks via handleCallback()
 *
 * Usage:
 * ```javascript
 * const soundId = await AudioAPI.loadSoundAsync("Data/Audio/TestSound.mp3");
 * const playbackId = await AudioAPI.playSoundAsync(soundId);
 * ```
 */
export class AudioAPI
{
    constructor()
    {
        this.audioInterface = new AudioInterface();

        console.log('AudioAPI: Initialized (GenericCommand pipeline)');
    }

    /**
     * Load sound asynchronously via GenericCommand pipeline
     * @param {string} soundPath - Path to the sound file
     * @returns {Promise<number>} Promise resolving to soundID
     */
    async loadSoundAsync(soundPath)
    {
        return new Promise((resolve, reject) =>
        {
            this.audioInterface.loadSoundAsync(soundPath, (soundId) =>
            {
                if (soundId < 0)
                {
                    reject(new Error(`Failed to load sound: ${soundPath}`));
                }
                else
                {
                    resolve(soundId);
                }
            });
        });
    }

    /**
     * Play sound asynchronously via GenericCommand pipeline
     * @param {number} soundID - Sound ID from loadSoundAsync
     * @param {number} volume - Volume (0.0 to 1.0)
     * @param {boolean} looped - Whether sound should loop
     * @returns {Promise<number>} Promise resolving to playbackID
     */
    async playSoundAsync(soundID, volume = 1.0, looped = false)
    {
        return new Promise((resolve, reject) =>
        {
            this.audioInterface.playSoundAsync(soundID, volume, looped, (playbackId) =>
            {
                if (playbackId < 0)
                {
                    reject(new Error(`Failed to play sound: ${soundID}`));
                }
                else
                {
                    resolve(playbackId);
                }
            });
        });
    }

    /**
     * Stop sound asynchronously via GenericCommand pipeline
     * @param {number} playbackID - Playback ID from playSoundAsync
     * @returns {Promise<void>}
     */
    async stopSoundAsync(playbackID)
    {
        return new Promise((resolve, reject) =>
        {
            this.audioInterface.stopSoundAsync(playbackID, (resultId) =>
            {
                if (resultId < 0)
                {
                    reject(new Error(`Failed to stop sound: ${playbackID}`));
                }
                else
                {
                    resolve();
                }
            });
        });
    }

    /**
     * Set volume asynchronously via GenericCommand pipeline
     * @param {number} playbackID - Playback ID
     * @param {number} volume - Volume (0.0 to 1.0)
     * @returns {Promise<void>}
     */
    async setVolumeAsync(playbackID, volume)
    {
        return new Promise((resolve, reject) =>
        {
            this.audioInterface.setVolumeAsync(playbackID, volume, (resultId) =>
            {
                if (resultId < 0)
                {
                    reject(new Error(`Failed to set volume: ${playbackID}`));
                }
                else
                {
                    resolve();
                }
            });
        });
    }



    /**
     * Check if C++ audio interface is available
     * @returns {boolean} True if C++ interface is connected
     */
    isAvailable()
    {
        return this.audioInterface.isAvailable();
    }
}

// Export singleton instance
export const audioAPI = new AudioAPI();

// Export to globalThis for JSEngine callback routing
globalThis.audioAPI = audioAPI;

console.log('AudioAPI: Module loaded (GenericCommand pipeline)');
