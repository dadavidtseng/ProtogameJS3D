// InputSystem.js
// Event-driven input system using FrameEventQueue (replaces InputScriptInterface)
//
// Architecture:
//   C++ InputSystem enqueues KeyDown/KeyUp/CursorUpdate events into FrameEventQueue (SPSC).
//   JS InputSystem drains the queue each frame and maintains local InputState.
//   Eliminates the race condition from synchronous cross-thread InputScriptInterface reads.

import {Subsystem} from '../Core/Subsystem.js';
import {KEYCODE_F1, KEYCODE_SPACE, KEYCODE_ESC} from '../InputSystemCommon.js';
import {GameState} from "../JSGame.js";
import {jsGameInstance} from "../main.js";
import {EventTypes} from "../Event/EventTypes.js";
import {GameStateChangedEvent} from "../Event/GameStateChangedEvent.js";

/**
 * InputState - Local input state maintained by draining FrameEventQueue.
 * Tracks current key states, per-frame transitions, and cursor position.
 */
class InputState
{
    constructor()
    {
        // Key state arrays (indexed by keyCode 0-255)
        this.keys        = new Uint8Array(256);  // 1 = down, 0 = up
        this.justPressed  = new Uint8Array(256);  // 1 = pressed this frame
        this.justReleased = new Uint8Array(256);  // 1 = released this frame

        // Cursor state
        this.cursorX  = 0;
        this.cursorY  = 0;
        this.cursorDX = 0;
        this.cursorDY = 0;
    }

    /**
     * Reset per-frame transition flags. Call at start of frame before processing events.
     */
    beginFrame()
    {
        this.justPressed.fill(0);
        this.justReleased.fill(0);
        this.cursorDX = 0;
        this.cursorDY = 0;
    }

    /**
     * Process a single frame event from the FrameEventQueue.
     */
    processEvent(event)
    {
        switch (event.type)
        {
            case 'keyDown':
            case 'mouseButtonDown':
                if (!this.keys[event.keyCode])
                {
                    this.justPressed[event.keyCode] = 1;
                }
                this.keys[event.keyCode] = 1;
                break;

            case 'keyUp':
            case 'mouseButtonUp':
                if (this.keys[event.keyCode])
                {
                    this.justReleased[event.keyCode] = 1;
                }
                this.keys[event.keyCode] = 0;
                break;

            case 'cursorUpdate':
                this.cursorX  = event.x;
                this.cursorY  = event.y;
                this.cursorDX = event.dx;
                this.cursorDY = event.dy;
                break;
        }
    }
}

// Singleton InputState — accessible by other systems via globalThis.inputState
const inputState = new InputState();
globalThis.inputState = inputState;

/**
 * InputSystem - Drains FrameEventQueue and handles game input logic.
 * Replaces the old InputScriptInterface-based polling with event-driven state.
 *
 * Priority 10: runs early so all downstream systems see fresh input state.
 */
export class InputSystem extends Subsystem
{
    constructor()
    {
        super('inputSystem', 10, {enabled: true});
        this.logTimer = 0;
        console.log('InputSystem: Module loaded (FrameEventQueue architecture)');
    }

    /**
     * Update — drain events, rebuild local state, handle game logic.
     * @param {number} gameDelta - Game time delta
     * @param {number} systemDelta - System time delta
     */
    update(gameDelta, systemDelta)
    {
        // --- 1. Reset per-frame flags and drain the C++ event queue ---
        inputState.beginFrame();

        if (typeof frameEvents !== 'undefined')
        {
            const events = frameEvents.drainAll();
            if (events)
            {
                for (let i = 0; i < events.length; i++)
                {
                    inputState.processEvent(events[i]);
                }
            }
        }

        // --- 2. Periodic heartbeat log ---
        this.logTimer += systemDelta;
        if (this.logTimer >= 300)
        {
            console.log('InputSystem: HandleInput active');
            this.logTimer = 0;
        }

        // --- 3. F1: Toggle rendering debug mode ---
        if (inputState.justPressed[KEYCODE_F1])
        {
            globalThis.shouldRender = !globalThis.shouldRender;
            console.log('InputSystem: F1 pressed, shouldRender =', globalThis.shouldRender);
        }

        // --- 4. Game state transitions ---
        if (typeof jsGameInstance !== 'undefined')
        {
            if (jsGameInstance.gameState === GameState.ATTRACT)
            {
                // SPACE: ATTRACT → GAME
                if (inputState.justPressed[KEYCODE_SPACE])
                {
                    const oldState = jsGameInstance.gameState;
                    const newState = GameState.GAME;
                    jsGameInstance.setGameState(newState);

                    const event = new GameStateChangedEvent(oldState, newState, 'InputSystem');
                    globalThis.eventBus.emit(EventTypes.GAME_STATE_CHANGED, event);
                    console.log('InputSystem: Emitted GameStateChangedEvent (ATTRACT → GAME)');
                }

                // ESC: Quit from attract mode
                if (inputState.justPressed[KEYCODE_ESC])
                {
                    globalThis.commandQueue.submit('game.app_request_quit', '{}', 'inputSystem');
                }
            }

            if (jsGameInstance.gameState === GameState.GAME)
            {
                // ESC: GAME → ATTRACT
                if (inputState.justPressed[KEYCODE_ESC])
                {
                    const oldState = jsGameInstance.gameState;
                    const newState = GameState.ATTRACT;
                    jsGameInstance.setGameState(newState);

                    const event = new GameStateChangedEvent(oldState, newState, 'InputSystem');
                    globalThis.eventBus.emit(EventTypes.GAME_STATE_CHANGED, event);
                    console.log('InputSystem: Emitted GameStateChangedEvent (GAME → ATTRACT)');
                }
            }
        }
    }
}

// Export for ES6 module system
export default InputSystem;

// Export to globalThis for hot-reload detection
globalThis.InputSystem = InputSystem;

console.log('InputSystem: Component loaded (FrameEventQueue architecture)');
