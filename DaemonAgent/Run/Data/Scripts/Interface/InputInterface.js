//----------------------------------------------------------------------------------------------------
// InputInterface.js
// Wrapper over globalThis.inputState (FrameEventQueue-driven local input state)
// Part of the interface wrapper layer for C++/JavaScript bridge
//----------------------------------------------------------------------------------------------------

/**
 * InputInterface - Clean abstraction over the JS-local InputState
 *
 * After the FrameEventQueue refactor, keyboard/mouse state is maintained locally
 * in globalThis.inputState (populated by InputSystem draining FrameEventQueue).
 * This wrapper provides the same API surface that KeyboardInputComponent and
 * other consumers relied on, now backed by the race-free local state.
 *
 * Controller input is not yet routed through FrameEventQueue and returns defaults.
 */
export class InputInterface
{
    constructor()
    {
        console.log('InputInterface: Connected to globalThis.inputState (FrameEventQueue)');
    }

    // === KEYBOARD INPUT ===

    /**
     * Check if a key was just pressed this frame
     * @param {number} keyCode - Virtual key code
     * @returns {boolean} True if key was just pressed
     */
    wasKeyJustPressed(keyCode)
    {
        const state = globalThis.inputState;
        return state ? !!state.justPressed[keyCode] : false;
    }

    /**
     * Check if a key was just released this frame
     * @param {number} keyCode - Virtual key code
     * @returns {boolean} True if key was just released
     */
    wasKeyJustReleased(keyCode)
    {
        const state = globalThis.inputState;
        return state ? !!state.justReleased[keyCode] : false;
    }

    /**
     * Check if a key is currently held down
     * @param {number} keyCode - Virtual key code
     * @returns {boolean} True if key is down
     */
    isKeyDown(keyCode)
    {
        const state = globalThis.inputState;
        return state ? !!state.keys[keyCode] : false;
    }

    // === MOUSE INPUT ===

    /**
     * Get current mouse position
     * @returns {{x: number, y: number}} Mouse coordinates
     */
    getMousePosition()
    {
        const state = globalThis.inputState;
        return state ? {x: state.cursorX, y: state.cursorY} : {x: 0, y: 0};
    }

    /**
     * Get mouse cursor delta (movement since last frame)
     * @returns {{x: number, y: number}} Mouse delta coordinates
     */
    getCursorClientDelta()
    {
        const state = globalThis.inputState;
        return state ? {x: state.cursorDX, y: state.cursorDY} : {x: 0, y: 0};
    }

    /**
     * Check if a mouse button is currently down
     * Mouse buttons are tracked via mouseButtonDown/mouseButtonUp events in InputState.
     * @param {number} button - Mouse button index (0=left, 1=right, 2=middle)
     * @returns {boolean} True if button is down
     */
    isMouseButtonDown(button)
    {
        // Mouse buttons share the keys[] array via keyCode from C++ FrameEvent
        // C++ maps mouse buttons to virtual key codes (VK_LBUTTON=1, VK_RBUTTON=2, VK_MBUTTON=4)
        const state = globalThis.inputState;
        if (!state) return false;
        // Map button index to Windows VK codes: 0→1(VK_LBUTTON), 1→2(VK_RBUTTON), 2→4(VK_MBUTTON)
        const vkMap = [1, 2, 4];
        const vk = vkMap[button];
        return vk !== undefined ? !!state.keys[vk] : false;
    }

    // === INTERFACE STATUS ===

    /**
     * Check if input state is available
     * @returns {boolean} True if globalThis.inputState exists
     */
    isAvailable()
    {
        return globalThis.inputState !== undefined && globalThis.inputState !== null;
    }

    /**
     * Get interface status for debugging
     */
    getStatus()
    {
        return {
            available: this.isAvailable(),
            backend: 'FrameEventQueue (inputState)'
        };
    }
}

// Export for ES6 module system
export default InputInterface;

// Export to globalThis for hot-reload detection
globalThis.InputInterface = InputInterface;

console.log('InputInterface: Wrapper loaded (FrameEventQueue backend)');
