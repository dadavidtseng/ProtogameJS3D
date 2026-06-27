//----------------------------------------------------------------------------------------------------
// KeyboardInputComponent.js
// Keyboard-specific input implementation (Starship-inspired)
//----------------------------------------------------------------------------------------------------

import {InputComponent} from './InputComponent.js';
import {InputInterface} from '../../Interface/InputInterface.js';
import {KEYCODE_LEFT, KEYCODE_RIGHT, KEYCODE_UP, KEYCODE_DOWN, KEYCODE_SPACE, KEYCODE_W, KEYCODE_A, KEYCODE_S, KEYCODE_D, KEYCODE_Z, KEYCODE_C, KEYCODE_Q, KEYCODE_E, KEYCODE_SHIFT} from '../../InputSystemCommon.js';

/**
 * KeyboardInputComponent - Keyboard input implementation
 *
 * Concrete implementation of InputComponent that reads keyboard state from C++ input interface.
 * Supports both arrow keys and WASD for movement.
 *
 * Features:
 * - Arrow keys for directional input
 * - WASD alternative controls
 * - Spacebar for shoot/action
 * - Z/C for vertical movement
 * - Q/E for roll controls
 * - SHIFT for speed boost
 * - Input locking (disable input when needed)
 *
 * Usage Example:
 * ```javascript
 * const keyboardInput = new KeyboardInputComponent();
 * player.addComponent(keyboardInput);
 *
 * // In update loop:
 * keyboardInput.update();
 * if (keyboardInput.leftIsDown) {
 *     player.moveLeft();
 * }
 * ```
 */
export class KeyboardInputComponent extends InputComponent
{
    constructor()
    {
        super();

        this.componentType = 'keyboardInput'; // Override component type
        this.inputInterface = new InputInterface();
        this.lockInput = false; // When true, all input is ignored

        console.log('KeyboardInputComponent: Created with C++ input interface');
    }

    /**
     * Update keyboard input state
     * Reads from C++ input interface and updates input flags
     * @param {number} deltaTime - Time since last frame (unused)
     */
    update(deltaTime)
    {
        if (this.lockInput)
        {
            this.reset();
            return;
        }

        if (!this.inputInterface.isAvailable())
        {
            this.reset();
            return;
        }

        if(this.inputInterface.isKeyDown(KEYCODE_A))
        {
            console.log('KeyboardInputComponent: KeyDown key down');
        }
        // Left: Arrow Left OR 'A'
        this._left = this.inputInterface.isKeyDown(KEYCODE_LEFT) ||
                     this.inputInterface.isKeyDown(KEYCODE_A);

        // Right: Arrow Right OR 'D'
        this._right = this.inputInterface.isKeyDown(KEYCODE_RIGHT) ||
                      this.inputInterface.isKeyDown(KEYCODE_D);

        // Up: Arrow Up OR 'W'
        this._up = this.inputInterface.isKeyDown(KEYCODE_UP) ||
                   this.inputInterface.isKeyDown(KEYCODE_W);

        // Down: Arrow Down OR 'S'
        this._down = this.inputInterface.isKeyDown(KEYCODE_DOWN) ||
                     this.inputInterface.isKeyDown(KEYCODE_S);

        // Shoot: Spacebar
        this._shoot = this.inputInterface.wasKeyJustPressed(KEYCODE_SPACE);

        // Phase 3: Additional keys for advanced movement
        this._zDown = this.inputInterface.isKeyDown(KEYCODE_Z);
        this._cDown = this.inputInterface.isKeyDown(KEYCODE_C);
        this._qDown = this.inputInterface.isKeyDown(KEYCODE_Q);
        this._eDown = this.inputInterface.isKeyDown(KEYCODE_E);
        this._shiftDown = this.inputInterface.isKeyDown(KEYCODE_SHIFT);
    }

    /**
     * Lock/unlock input (useful for cutscenes, menus, etc.)
     * @param {boolean} locked - True to disable input
     */
    setLocked(locked)
    {
        this.lockInput = locked;
        if (locked)
        {
            this.reset();
        }
        console.log(`KeyboardInputComponent: Input ${locked ? 'locked' : 'unlocked'}`);
    }

    /**
     * Get component status for debugging
     */
    getStatus()
    {
        return {
            ...super.getStatus(),
            lockInput: this.lockInput,
            inputInterfaceAvailable: this.inputInterface.isAvailable(),
            currentInputState: this.getInputState()
        };
    }
}

// Export for ES6 module system
export default KeyboardInputComponent;

// Export to globalThis for hot-reload detection
globalThis.KeyboardInputComponent = KeyboardInputComponent;

console.log('KeyboardInputComponent: Loaded (Phase 1 - Foundation Layer)');
