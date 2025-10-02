// AudioSystem.mjs
// Phase 4 ES6 Module version using SystemComponent pattern

import { SystemComponent } from '../core/SystemComponent.mjs';

/**
 * AudioSystem - JavaScript wrapper for AudioScriptInterface
 * Phase 4 ES6 Module using SystemComponent pattern
 *
 * Features:
 * - Sound loading and caching
 * - Basic and advanced playback control
 * - Volume and playback state management
 * - FMOD integration through C++ AudioScriptInterface
 */
export class AudioSystem extends SystemComponent {
    constructor() {
        super('audioSystem', 5, { enabled: true });

        this.loadedSounds = new Map(); // Cache for loaded sound IDs
        this.activeSounds = new Map(); // Track active playback IDs
        this.isInitialized = false;

        console.log('AudioSystem: Module loaded (Phase 4 ES6)');
        this.initialize();
    }

    /**
     * Initialize the audio system and verify C++ audio interface availability
     */
    initialize() {
        try {
            // Check if C++ audio interface is available
            if (typeof audio !== 'undefined') {
                console.log('AudioSystem: C++ audio interface available');
                this.isInitialized = true;
            } else {
                console.log('AudioSystem: C++ audio interface NOT available - using mock mode');
                this.isInitialized = false;
            }
        } catch (error) {
            console.log('AudioSystem: Initialization failed:', error);
            this.isInitialized = false;
        }
    }

    /**
     * Load or get a sound file, returns sound ID for playback
     * @param {string} soundPath - Path to the sound file (e.g., "Data/Audio/TestSound.mp3")
     * @param {string} dimension - Sound dimension: "Sound2D" or "Sound3D"
     * @returns {number|null} Sound ID for playback, or null if failed
     */
    createOrGetSound(soundPath, dimension = "Sound2D") {
        try {
            if (!this.isInitialized) {
                console.log('AudioSystem: Cannot load sound - system not initialized');
                return null;
            }

            // Check cache first
            const cacheKey = `${soundPath}_${dimension}`;
            if (this.loadedSounds.has(cacheKey)) {
                const soundID = this.loadedSounds.get(cacheKey);
                console.log(`AudioSystem: Using cached sound ID ${soundID} for ${soundPath}`);
                return soundID;
            }

            // Load sound through C++ interface
            const soundID = audio.createOrGetSound(soundPath, dimension);

            // Check against MISSING_SOUND_ID, not > 0 (sound ID 0 is valid!)
            if (soundID !== null && soundID !== undefined) {
                this.loadedSounds.set(cacheKey, soundID);
                console.log(`AudioSystem: Loaded sound ${soundPath} with ID ${soundID}`);
                return soundID;
            } else {
                console.log(`AudioSystem: Failed to load sound ${soundPath}`);
                return null;
            }
        } catch (error) {
            console.log(`AudioSystem: Error loading sound ${soundPath}:`, error);
            return null;
        }
    }

    /**
     * Start basic sound playback
     * @param {number} soundID - Sound ID from createOrGetSound
     * @returns {number|null} Playback ID for control, or null if failed
     */
    startSound(soundID) {
        try {
            // Sound ID 0 is valid - don't check for truthy value
            if (soundID === null || soundID === undefined) {
                console.log('AudioSystem: Cannot start sound - invalid sound ID');
                return null;
            }

            const playbackID = audio.startSound(soundID);

            if (playbackID && playbackID > 0) {
                this.activeSounds.set(playbackID, { soundID, startTime: Date.now() });
                console.log(`AudioSystem: Started sound ${soundID} with playback ID ${playbackID}`);
                return playbackID;
            } else {
                console.log(`AudioSystem: Failed to start sound ${soundID}`);
                return null;
            }
        } catch (error) {
            console.log(`AudioSystem: Error starting sound ${soundID}:`, error);
            return null;
        }
    }

    /**
     * Start sound with advanced parameters
     * @param {number} soundID - Sound ID from createOrGetSound
     * @param {boolean} isLooped - Whether sound should loop
     * @param {number} volume - Volume (0.0 to 1.0)
     * @param {number} balance - Stereo balance (-1.0 to 1.0)
     * @param {number} speed - Playback speed multiplier (0.1 to 10.0)
     * @param {boolean} isPaused - Start paused
     * @returns {number|null} Playback ID for control, or null if failed
     */
    startSoundAdvanced(soundID, isLooped = false, volume = 1.0, balance = 0.0, speed = 1.0, isPaused = false) {
        try {
            // Sound ID 0 is valid - don't check for truthy value
            if (soundID === null || soundID === undefined) {
                console.log('AudioSystem: Cannot start advanced sound - invalid sound ID');
                return null;
            }

            const playbackID = audio.startSoundAdvanced(soundID, isLooped, volume, balance, speed, isPaused);

            if (playbackID && playbackID > 0) {
                this.activeSounds.set(playbackID, {
                    soundID,
                    startTime: Date.now(),
                    isLooped,
                    volume,
                    balance,
                    speed,
                    isPaused
                });
                console.log(`AudioSystem: Started advanced sound ${soundID} with playback ID ${playbackID}`);
                return playbackID;
            } else {
                console.log(`AudioSystem: Failed to start advanced sound ${soundID}`);
                return null;
            }
        } catch (error) {
            console.log(`AudioSystem: Error starting advanced sound ${soundID}:`, error);
            return null;
        }
    }

    /**
     * Stop a playing sound
     * @param {number} playbackID - Playback ID from startSound
     * @returns {boolean} True if stopped successfully
     */
    stopSound(playbackID) {
        try {
            if (!this.isInitialized || !playbackID) {
                console.log('AudioSystem: Cannot stop sound - invalid state or playback ID');
                return false;
            }

            audio.stopSound(playbackID);
            this.activeSounds.delete(playbackID);
            console.log(`AudioSystem: Stopped sound with playback ID ${playbackID}`);
            return true;
        } catch (error) {
            console.log(`AudioSystem: Error stopping sound ${playbackID}:`, error);
            return false;
        }
    }

    /**
     * Set volume of a playing sound
     * @param {number} playbackID - Playback ID from startSound
     * @param {number} volume - Volume (0.0 to 1.0)
     * @returns {boolean} True if set successfully
     */
    setSoundVolume(playbackID, volume) {
        try {
            if (!this.isInitialized || !playbackID) {
                return false;
            }

            audio.setSoundVolume(playbackID, volume);

            // Update cached info
            if (this.activeSounds.has(playbackID)) {
                this.activeSounds.get(playbackID).volume = volume;
            }

            console.log(`AudioSystem: Set volume ${volume} for playback ID ${playbackID}`);
            return true;
        } catch (error) {
            console.log(`AudioSystem: Error setting volume for ${playbackID}:`, error);
            return false;
        }
    }

    /**
     * Convenience method: Load and play a sound in one call
     * @param {string} soundPath - Path to the sound file
     * @param {string} dimension - Sound dimension: "Sound2D" or "Sound3D"
     * @param {number} volume - Volume (0.0 to 1.0)
     * @returns {number|null} Playback ID or null if failed
     */
    playSound(soundPath, dimension = "Sound2D", volume = 1.0) {
        const soundID = this.createOrGetSound(soundPath, dimension);
        if (soundID !== null && soundID !== undefined) {
            const playbackID = this.startSound(soundID);
            if (playbackID && volume !== 1.0) {
                this.setSoundVolume(playbackID, volume);
            }
            return playbackID;
        }
        return null;
    }

    /**
     * Get system status and statistics
     * @returns {object} System status information
     */
    getSystemStatus() {
        return {
            isInitialized: this.isInitialized,
            loadedSoundsCount: this.loadedSounds.size,
            activeSoundsCount: this.activeSounds.size,
            cppInterfaceAvailable: typeof audio !== 'undefined'
        };
    }

    /**
     * Get list of loaded sounds
     * @returns {Array} Array of loaded sound information
     */
    getLoadedSounds() {
        const sounds = [];
        for (const [key, soundID] of this.loadedSounds) {
            sounds.push({ cacheKey: key, soundID });
        }
        return sounds;
    }

    /**
     * Get list of active sounds
     * @returns {Array} Array of active sound information
     */
    getActiveSounds() {
        const sounds = [];
        for (const [playbackID, info] of this.activeSounds) {
            sounds.push({ playbackID, ...info });
        }
        return sounds;
    }

    /**
     * Cleanup method - stop all sounds and clear caches
     */
    cleanup() {
        try {
            // Stop all active sounds
            for (const [playbackID] of this.activeSounds) {
                this.stopSound(playbackID);
            }

            // Clear caches
            this.loadedSounds.clear();
            this.activeSounds.clear();

            console.log('AudioSystem: Cleanup completed');
        } catch (error) {
            console.log('AudioSystem: Error during cleanup:', error);
        }
    }
}

// Export for ES6 module system
export default AudioSystem;

console.log('AudioSystem: Component loaded (Phase 4 ES6)');
