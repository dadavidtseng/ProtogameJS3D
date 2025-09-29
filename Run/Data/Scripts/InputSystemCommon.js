//----------------------------------------------------------------------------------------------------
// InputSystemCommon.js
//----------------------------------------------------------------------------------------------------

/**
 * InputSystemCommon.js
 *
 * JavaScript key code constants equivalent to C++ key code definitions.
 * Provides named constants for all keyboard and mouse input codes used by the InputSystem.
 *
 * Usage:
 * - import via: const { KEYCODE_SPACE, KEYCODE_F1 } = KeyCodes;
 * - or access via: KeyCodes.KEYCODE_SPACE, KeyCodes.KEYCODE_F1
 */

const KEYCODE_F1 = 112;
const KEYCODE_ESC = 27;
const KEYCODE_SPACE = 32;

globalThis.KEYCODE_F1 = KEYCODE_F1;
globalThis.KEYCODE_ESC = KEYCODE_ESC;
globalThis.KEYCODE_SPACE = KEYCODE_SPACE;

const KEYCODE = {
    // Number Keys (0-9)
    NUMCODE_0: 48,
    NUMCODE_1: 49,
    NUMCODE_2: 50,
    NUMCODE_3: 51,
    NUMCODE_4: 52,
    NUMCODE_5: 53,
    NUMCODE_6: 54,
    NUMCODE_7: 55,
    NUMCODE_8: 56,
    NUMCODE_9: 57,

    // Letter Keys (A-Z)
    KEYCODE_A: 65,
    KEYCODE_B: 66,
    KEYCODE_C: 67,
    KEYCODE_D: 68,
    KEYCODE_E: 69,
    KEYCODE_F: 70,
    KEYCODE_G: 71,
    KEYCODE_H: 72,
    KEYCODE_I: 73,
    KEYCODE_J: 74,
    KEYCODE_K: 75,
    KEYCODE_L: 76,
    KEYCODE_M: 77,
    KEYCODE_N: 78,
    KEYCODE_O: 79,
    KEYCODE_P: 80,
    KEYCODE_Q: 81,
    KEYCODE_R: 82,
    KEYCODE_S: 83,
    KEYCODE_T: 84,
    KEYCODE_U: 85,
    KEYCODE_V: 86,
    KEYCODE_W: 87,
    X: 88,
    KEYCODE_Y: 89,
    KEYCODE_Z: 90,

    // Function Keys (F1-F15)
    KEYCODE_F2: 113,
    KEYCODE_F3: 114,
    KEYCODE_F4: 115,
    KEYCODE_F5: 116,
    KEYCODE_F6: 117,
    KEYCODE_F7: 118,
    KEYCODE_F8: 119,
    KEYCODE_F9: 120,
    KEYCODE_F10: 121,
    KEYCODE_F11: 122,
    KEYCODE_F12: 123,
    KEYCODE_F13: 124,
    KEYCODE_F14: 125,
    KEYCODE_F15: 126,

    // Special Keys
    KEYCODE_ENTER: 13,
    KEYCODE_BACKSPACE: 8,
    KEYCODE_INSERT: 45,
    KEYCODE_DELETE: 46,
    KEYCODE_HOME: 36,
    KEYCODE_END: 35,
    KEYCODE_TILDE: 192,  // ` key

    // Arrow Keys
    KEYCODE_UPARROW: 38,
    KEYCODE_DOWNARROW: 40,
    KEYCODE_LEFTARROW: 37,
    KEYCODE_RIGHTARROW: 39,

    // Brackets
    KEYCODE_LEFT_BRACKET: 219,   // [
    KEYCODE_RIGHT_BRACKET: 221,  // ]

    // Modifier Keys
    KEYCODE_SHIFT: 16,
    KEYCODE_CONTROL: 17,

    // Mouse Buttons (using standard mouse button codes)
    KEYCODE_LEFT_MOUSE: 1,
    KEYCODE_RIGHT_MOUSE: 2,
};

// Make KeyCodes available globally for other JavaScript files
globalThis.KEYCODE = KEYCODE;

// Static version for hot-reload detection
KEYCODE.version = Date.now();

console.log('KeyCodes: JavaScript key code constants initialized');