//----------------------------------------------------------------------------------------------------
// main.mjs - JavaScript Framework Entry Point (Phase 4 ES6 Modules)
//----------------------------------------------------------------------------------------------------

/**
 * Main entry point for the JavaScript framework
 *
 * Phase 4 Architecture:
 * - Single entry point loaded by C++
 * - ES6 module imports for clean dependency management
 * - Initializes JSEngine and JSGame
 * - Sets up global references for C++ bridge and hot-reload
 *
 * Loading Order:
 * 1. C++ loads main.mjs (ES6 module - this file)
 *    ↳ Imports InputSystemCommon.mjs (key code constants)
 *    ↳ Imports JSEngine.mjs
 *    ↳ Imports JSGame.mjs
 *       ↳ Imports InputSystem.mjs, AudioSystem.mjs
 *       ↳ Imports CppBridgeSystem.mjs, CubeSpawner.mjs, PropMover.mjs, CameraShaker.mjs
 */

import './InputSystemCommon.mjs'; // Global key code constants
import { JSEngine } from './JSEngine.mjs';
import { JSGame } from './JSGame.mjs';

console.log('(main.mjs)(start) - Phase 4 ES6 Module Entry Point');

// Create JSEngine instance
const jsEngineInstance = new JSEngine();

// Create JSGame instance
const jsGameInstance = new JSGame(jsEngineInstance);

// Set game instance in engine
jsEngineInstance.setGame(jsGameInstance);

// ============================================================================
// GLOBAL REFERENCES (for C++ bridge and hot-reload)
// ============================================================================

// REQUIRED: C++ calls JSEngine.update() and JSEngine.render() through globalThis
globalThis.JSEngine = jsEngineInstance;

// REQUIRED: Hot-reload system needs global reference to JSGame instance
globalThis.jsGameInstance = jsGameInstance;

// REQUIRED: F1 toggle functionality (rendering control)
if (typeof globalThis.shouldRender === 'undefined') {
    globalThis.shouldRender = true;
}

// ============================================================================
// STATUS LOGGING
// ============================================================================

console.log('JSGame: System registration framework initialized (Phase 4 ES6)');
console.log('Available API: globalThis.JSEngine for system management');
console.log('Input system status:', jsGameInstance.isInputEnabled() ? 'ENABLED' : 'DISABLED');
console.log('Audio system status:', jsGameInstance.isAudioEnabled() ? 'ENABLED' : 'DISABLED');
console.log('Hot-reload system status:', jsEngineInstance.hotReloadEnabled ? 'AVAILABLE (C++)' : 'NOT AVAILABLE');

console.log('(main.mjs)(end) - JavaScript framework initialized');

// Export for potential future use
export { jsEngineInstance, jsGameInstance };
