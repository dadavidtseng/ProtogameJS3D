//----------------------------------------------------------------------------------------------------
// main.js - JavaScript Framework Entry Point
//----------------------------------------------------------------------------------------------------

/**
 * Main entry point for the JavaScript framework
 *
 * Architecture:
 * - Single entry point loaded by C++
 * - ES6 module imports for clean dependency management
 * - Initializes JSEngine and JSGame
 * - Sets up global references for C++ bridge and hot-reload
 *
 * Loading Order:
 * 1. C++ loads main.js (ES6 module - this file)
 *    ↳ Imports InputSystemCommon.js (key code constants)
 *    ↳ Imports JSEngine.js
 *    ↳ Imports JSGame.js
 *       ↳ Imports InputSystem.js, AudioSystem.js
 *       ↳ Imports CppBridgeSystem.js, CubeSpawner.js, PropMover.js, CameraShaker.js
 */

import './InputSystemCommon.js'; // Global key code constants
import { JSEngine } from './JSEngine.js';
import { JSGame } from './JSGame.js';
import { CommandQueue } from './Interface/CommandQueue.js';  // GenericCommand facade

console.log('(main.js)(start) - JavaScript Framework Entry Point');

// CommandQueue MUST be created before JSGame (API methods depend on globalThis.CommandQueueAPI)
const commandQueueInstance = new CommandQueue();
globalThis.CommandQueueAPI = commandQueueInstance;
console.log('CommandQueue: Instance created, available:', commandQueueInstance.isAvailable());

// ============================================================================
// HOT-RELOAD CLEANUP: Destroy old entities before re-creating
// ============================================================================
if (globalThis.jsGameInstance)
{
    console.log('main.js: Hot-reload detected — destroying old game objects...');
    const oldGame = globalThis.jsGameInstance;

    // Destroy all prop entities on C++ side
    if (oldGame.propGameObjects)
    {
        for (const prop of oldGame.propGameObjects)
        {
            if (prop && prop.destroy) { prop.destroy(); }
        }
    }

    // Destroy player entity on C++ side
    if (oldGame.playerGameObject && oldGame.playerGameObject.destroy)
    {
        oldGame.playerGameObject.destroy();
    }

    // Destroy camera on C++ side
    if (oldGame.cameraAPI && oldGame.cameraId)
    {
        oldGame.cameraAPI.destroy(oldGame.cameraId);
    }

    console.log('main.js: Old game objects destroyed');
}

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


console.log('Available API: globalThis.JSEngine for system management');
console.log('Input system status:', jsGameInstance.isInputEnabled() ? 'ENABLED' : 'DISABLED');
console.log('Audio system status:', jsGameInstance.isAudioEnabled() ? 'ENABLED' : 'DISABLED');
console.log('Hot-reload system status:', jsEngineInstance.hotReloadEnabled ? 'AVAILABLE (C++)' : 'NOT AVAILABLE');

// ============================================================================
// KADI BROKER INTEGRATION STATUS
// ============================================================================

console.log('\n========================================');
console.log('KADI Broker Integration Status');
console.log('========================================');

if (typeof kadi !== 'undefined') {
    console.log('✓ KADI global object: REGISTERED');
    console.log('  Type:', typeof kadi);

    // Test key generation to verify functionality
    try {
        const testKeys = kadi.generateKeyPair();
        if (testKeys && testKeys.publicKey && testKeys.privateKey) {
            console.log('✓ KADI functionality: WORKING');
            console.log('  Public key length:', testKeys.publicKey.length, 'chars');
            console.log('  Private key length:', testKeys.privateKey.length, 'chars');
        } else {
            console.log('✗ KADI functionality: INVALID RESPONSE');
        }
    } catch (e) {
        console.log('✗ KADI functionality: ERROR -', e.message);
    }

    console.log('\nℹ  KADI will auto-connect via KADIGameControl subsystem');
    console.log('   Connection: ws://localhost:8080');
    console.log('   Tools registered: 15 (Game Control + Development)');
} else {
    console.log('✗ KADI global object: NOT REGISTERED');
    console.log('  This means KADIScriptInterface was not registered with ScriptSubsystem');
    console.log('  Check App::SetupScriptingBindings() for KADI registration code');
}

console.log('========================================\n');

console.log('(main.js)(end) - JavaScript framework initialized');

// Export for potential future use
export { jsEngineInstance, jsGameInstance };
