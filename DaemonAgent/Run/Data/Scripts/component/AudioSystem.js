// AudioSystem.js
// Phase 4.5 ES6 Module version using Subsystem pattern + Event System

import { Subsystem } from '../Core/Subsystem.js';
import { EventTypes } from '../Event/EventTypes.js';
import { audioAPI } from '../Interface/AudioAPI.js';  // Async audio via GenericCommand pipeline

/**
 * AudioSystem - Audio subsystem using GenericCommand pipeline
 * ES6 Module using Subsystem pattern + Event System (DIP)
 *
 * Features:
 * - Async sound loading and caching via GenericCommand
 * - Playback control via GenericCommand callbacks
 * - Volume and playback state management
 * - FMOD integration through C++ GenericCommand handlers
 * - Event-based state change audio (Dependency Inversion)
 *
 * Architecture:
 * - Subscribes to GameStateChanged events
 * - NO dependency on InputSystem (loose coupling)
 * - All audio operations go through CommandQueue → GenericCommand → C++ handlers
 */
export class AudioSystem extends Subsystem {
    constructor() {
        super('audioSystem', 5, { enabled: true });

        this.loadedSounds = new Map(); // Cache for loaded sound IDs
        this.activeSounds = new Map(); // Track active playback IDs
        this.isInitialized = false;

        console.log('AudioSystem: Module loaded (Phase 4.5 ES6 + Event System)');
        this.initialize();

        // ✅ DEPENDENCY INVERSION: Subscribe to events instead of being called directly
        this.subscribeToEvents();
    }

    /**
     * Subscribe to event system (Dependency Inversion)
     */
    subscribeToEvents() {
        if (typeof globalThis.eventBus === 'undefined') {
            console.log('AudioSystem: EventBus not available, skipping event subscription');
            return;
        }

        // Subscribe to GameStateChanged events
        globalThis.eventBus.subscribe(
            EventTypes.GAME_STATE_CHANGED,
            this.onGameStateChanged.bind(this),
            10  // Priority: 10 (play audio early in event handler chain)
        );

        console.log('AudioSystem: Subscribed to GameStateChanged events');
    }

    /**
     * Handle GameStateChanged event (event-driven audio)
     * @param {GameStateChangedEvent} event - Game state change event
     */
    async onGameStateChanged(event) {
        console.log('XXXAudioSystem: GameStateChanged event received:', event.toString());

        // Play click sound when entering GAME state from ATTRACT
        if (event.isEnteringGame()) {
            console.log('AudioSystem: Playing state transition sound (ATTRACT → GAME)');

            try {
                // Phase 2: Use async audio methods via AudioCommandQueue
                const soundID = await this.loadSoundAsync("Data/Audio/TestSound.mp3");
                if (soundID !== null && soundID !== undefined) {
                    const playbackID = await this.playSoundAsync(soundID);
                    console.log(`AudioSystem: Click sound played successfully (soundID=${soundID}, playbackID=${playbackID})`);
                } else {
                    console.log('AudioSystem: Failed to load click sound');
                }
            } catch (error) {
                console.log('AudioSystem: Error playing click sound:', error.message);
            }
        }

        // Future: Add more state transition sounds
        // if (event.isLeavingGame()) { ... }
        // if (event.isPauseToggle()) { ... }
    }

    /**
     * Initialize the audio system and verify C++ audio interface availability
     */
    initialize() {
        try {
            // Check if GenericCommand pipeline is available for audio operations
            if (audioAPI.isAvailable()) {
                console.log('AudioSystem: GenericCommand pipeline available for audio');
                this.isInitialized = true;
            } else {
                console.log('AudioSystem: GenericCommand pipeline NOT available - audio disabled');
                this.isInitialized = false;
            }
        } catch (error) {
            console.log('AudioSystem: Initialization failed:', error);
            this.isInitialized = false;
        }
    }

    // NOTE: All sync methods removed — use async methods (loadSoundAsync, playSoundAsync, etc.)

    /**
     * Get system status and statistics
     * @returns {object} System status information
     */
    getSystemStatus() {
        return {
            isInitialized: this.isInitialized,
            loadedSoundsCount: this.loadedSounds.size,
            activeSoundsCount: this.activeSounds.size,
            pipeline: 'GenericCommand',
            commandQueueAvailable: audioAPI.isAvailable()
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
            // Stop all active sounds via async pipeline
            for (const [playbackID] of this.activeSounds) {
                this.stopSoundAsync(playbackID).catch(() => {});
            }

            // Clear caches
            this.loadedSounds.clear();
            this.activeSounds.clear();

            console.log('AudioSystem: Cleanup completed');
        } catch (error) {
            console.log('AudioSystem: Error during cleanup:', error);
        }
    }

    // ========================================
    // ASYNC METHODS (Phase 2: AudioCommandQueue)
    // ========================================
    // Delegate to audioAPI which handles callback registry and Promise wrapping

    /**
     * Load sound asynchronously via AudioCommandQueue
     * @param {string} soundPath - Path to the sound file
     * @returns {Promise<number>} Promise resolving to soundID
     */
    async loadSoundAsync(soundPath) {
        try {
            if (!this.isInitialized) {
                throw new Error('AudioSystem not initialized');
            }

            // Check cache first
            const cacheKey = `${soundPath}_Sound2D`;
            if (this.loadedSounds.has(cacheKey)) {
                const soundID = this.loadedSounds.get(cacheKey);
                console.log(`AudioSystem: Using cached sound ID ${soundID} for ${soundPath}`);
                return soundID;
            }

            // Load sound through AudioAPI (handles callback registry)
            const soundID = await audioAPI.loadSoundAsync(soundPath);

            // Phase 2: soundID 0 is VALID (first loaded sound gets ID 0)
            // Only reject null/undefined (actual failures)
            if (soundID !== null && soundID !== undefined) {
                this.loadedSounds.set(cacheKey, soundID);
                console.log(`AudioSystem: Loaded sound ${soundPath} async with ID ${soundID}`);
                return soundID;
            } else {
                throw new Error(`Failed to load sound ${soundPath}`);
            }
        } catch (error) {
            console.log(`AudioSystem: Error loading sound async ${soundPath}:`, error.message);
            throw error;
        }
    }

    /**
     * Play sound asynchronously via AudioCommandQueue
     * @param {number} soundID - Sound ID from loadSoundAsync
     * @param {number} volume - Volume (0.0 to 1.0)
     * @param {boolean} looped - Whether sound should loop
     * @returns {Promise<number>} Promise resolving to playbackID
     */
    async playSoundAsync(soundID, volume = 1.0, looped = false) {
        try {
            if (soundID === null || soundID === undefined) {
                throw new Error('Invalid sound ID');
            }

            // Play sound through AudioAPI (handles callback registry)
            const playbackID = await audioAPI.playSoundAsync(soundID, volume, looped);

            if (playbackID !== null && playbackID !== undefined && playbackID >= 0) {
                this.activeSounds.set(playbackID, { soundID, startTime: Date.now(), volume, looped });
                console.log(`AudioSystem: Started sound ${soundID} async with playback ID ${playbackID}`);
                return playbackID;
            } else {
                throw new Error(`Failed to start sound ${soundID}`);
            }
        } catch (error) {
            console.log(`AudioSystem: Error playing sound async ${soundID}:`, error.message);
            throw error;
        }
    }

    /**
     * Stop sound asynchronously via AudioCommandQueue
     * @param {number} playbackID - Playback ID from playSoundAsync
     * @returns {Promise<void>}
     */
    async stopSoundAsync(playbackID) {
        try {
            if (!playbackID) {
                throw new Error('Invalid playback ID');
            }

            // Stop sound through AudioAPI (handles callback registry)
            await audioAPI.stopSoundAsync(playbackID);
            this.activeSounds.delete(playbackID);
            console.log(`AudioSystem: Stopped sound async with playback ID ${playbackID}`);
        } catch (error) {
            console.log(`AudioSystem: Error stopping sound async ${playbackID}:`, error.message);
            throw error;
        }
    }

    /**
     * Set volume asynchronously via AudioCommandQueue
     * @param {number} playbackID - Playback ID
     * @param {number} volume - Volume (0.0 to 1.0)
     * @returns {Promise<void>}
     */
    async setVolumeAsync(playbackID, volume) {
        try {
            if (!playbackID) {
                throw new Error('Invalid playback ID');
            }

            // Set volume through AudioAPI (handles callback registry)
            await audioAPI.setVolumeAsync(playbackID, volume);

            // Update cached info
            if (this.activeSounds.has(playbackID)) {
                this.activeSounds.get(playbackID).volume = volume;
            }

            console.log(`AudioSystem: Set volume async ${volume} for playback ID ${playbackID}`);
        } catch (error) {
            console.log(`AudioSystem: Error setting volume async for ${playbackID}:`, error.message);
            throw error;
        }
    }
}

// Export for ES6 module system
export default AudioSystem;

console.log('AudioSystem: Component loaded (Phase 4 ES6)');
