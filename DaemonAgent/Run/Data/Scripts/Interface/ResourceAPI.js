//----------------------------------------------------------------------------------------------------
// ResourceAPI.js - Resource Loading Interface via GenericCommand
//
// Resource loading via GenericCommand pipeline (migrated from ResourceScriptInterface).
// Provides async resource loading through CommandQueue.submit().
//
// Supported commands:
//   load_texture  — Load texture file (PNG, TGA, etc.)
//   load_model    — Load 3D model file (not yet implemented in C++)
//   load_shader   — Load and compile shader file (HLSL)
//
// Usage:
//   import { ResourceAPI } from './Interface/ResourceAPI.js';
//   ResourceAPI.loadTexture('Data/Images/TestUV.png', (resourceId) => { ... });
//----------------------------------------------------------------------------------------------------

class ResourceAPI {

    /**
     * Load a texture file asynchronously via GenericCommand.
     * @param {string} path - File path relative to Run/ directory
     * @param {function} callback - Receives resourceId (uint64) on success, 0 on failure
     */
    static loadTexture(path, callback) {
        const commandQueue = globalThis.CommandQueueAPI;
        if (!commandQueue || !commandQueue.isAvailable()) {
            console.log('ResourceAPI.loadTexture: CommandQueue not available');
            if (callback) callback(0);
            return;
        }

        if (!path || typeof path !== 'string') {
            console.log('ResourceAPI.loadTexture: invalid path');
            if (callback) callback(0);
            return;
        }

        commandQueue.submit('load_texture', { path }, 'resource-api', (result) => {
            if (callback) {
                callback(result.success ? result.resultId : 0);
            }
        });
    }

    /**
     * Load a 3D model file asynchronously via GenericCommand.
     * NOTE: Not yet implemented in C++ ResourceSubsystem — will return error.
     * @param {string} path - File path relative to Run/ directory
     * @param {function} callback - Receives resourceId on success, 0 on failure
     */
    static loadModel(path, callback) {
        const commandQueue = globalThis.CommandQueueAPI;
        if (!commandQueue || !commandQueue.isAvailable()) {
            console.log('ResourceAPI.loadModel: CommandQueue not available');
            if (callback) callback(0);
            return;
        }

        if (!path || typeof path !== 'string') {
            console.log('ResourceAPI.loadModel: invalid path');
            if (callback) callback(0);
            return;
        }

        commandQueue.submit('load_model', { path }, 'resource-api', (result) => {
            if (callback) {
                callback(result.success ? result.resultId : 0);
            }
        });
    }

    /**
     * Load and compile a shader file asynchronously via GenericCommand.
     * @param {string} path - File path relative to Run/ directory (HLSL)
     * @param {function} callback - Receives resourceId (uint64) on success, 0 on failure
     */
    static loadShader(path, callback) {
        const commandQueue = globalThis.CommandQueueAPI;
        if (!commandQueue || !commandQueue.isAvailable()) {
            console.log('ResourceAPI.loadShader: CommandQueue not available');
            if (callback) callback(0);
            return;
        }

        if (!path || typeof path !== 'string') {
            console.log('ResourceAPI.loadShader: invalid path');
            if (callback) callback(0);
            return;
        }

        commandQueue.submit('load_shader', { path }, 'resource-api', (result) => {
            if (callback) {
                callback(result.success ? result.resultId : 0);
            }
        });
    }
}

export { ResourceAPI };
