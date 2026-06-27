//----------------------------------------------------------------------------------------------------
// InputComponent.js
// Base class for input components (Starship-inspired)
//----------------------------------------------------------------------------------------------------

import {Component} from '../../Core/Component.js';

/**
 * InputComponent - Abstract base class for input handling
 *
 * Provides a common interface for different input sources (keyboard, gamepad, AI, etc.)
 * Derived classes implement specific input mechanisms while maintaining consistent API.
 *
 * Design Pattern: Strategy Pattern
 * - InputComponent defines the interface
 * - KeyboardInputComponent, GamepadInputComponent, BotInputComponent implement strategies
 * - GameObjects use InputComponent without knowing the specific input source
 *
 * Input State Properties:
 * - _left: boolean - Left movement input
 * - _right: boolean - Right movement input
 * - _up: boolean - Up movement input
 * - _down: boolean - Down movement input
 * - _shoot: boolean - Shoot/action input
 * - _zDown: boolean - Z key (vertical down movement)
 * - _cDown: boolean - C key (vertical up movement)
 * - _qDown: boolean - Q key (roll left)
 * - _eDown: boolean - E key (roll right)
 * - _shiftDown: boolean - SHIFT key (speed boost)
 *
 * Usage Example:
 * ```javascript
 * const input = new KeyboardInputComponent();
 * if (input.leftIsDown) {
 *     // Move left
 * }
 * ```
 */
export class InputComponent extends Component
{
    constructor()
    {
        super('input');

        // Input state (protected - use getters for access)
        this._left = false;
        this._right = false;
        this._up = false;
        this._down = false;
        this._shoot = false;

        // Phase 3: Additional input states for advanced movement
        this._zDown = false;      // Z key - vertical down
        this._cDown = false;      // C key - vertical up
        this._qDown = false;      // Q key - roll left
        this._eDown = false;      // E key - roll right
        this._shiftDown = false;  // SHIFT key - speed boost

        console.log('InputComponent: Base class instantiated');
    }

    /**
     * Left input state
     * @returns {boolean}
     */
    get leftIsDown()
    {
        return this._left;
    }

    /**
     * Right input state
     * @returns {boolean}
     */
    get rightIsDown()
    {
        return this._right;
    }

    /**
     * Up input state
     * @returns {boolean}
     */
    get upIsDown()
    {
        return this._up;
    }

    /**
     * Down input state
     * @returns {boolean}
     */
    get downIsDown()
    {
        return this._down;
    }

    /**
     * Shoot/action input state
     * @returns {boolean}
     */
    get shootIsDown()
    {
        return this._shoot;
    }

    /**
     * Z key input state (vertical down movement)
     * @returns {boolean}
     */
    get zIsDown()
    {
        return this._zDown;
    }

    /**
     * C key input state (vertical up movement)
     * @returns {boolean}
     */
    get cIsDown()
    {
        return this._cDown;
    }

    /**
     * Q key input state (roll left)
     * @returns {boolean}
     */
    get qIsDown()
    {
        return this._qDown;
    }

    /**
     * E key input state (roll right)
     * @returns {boolean}
     */
    get eIsDown()
    {
        return this._eDown;
    }

    /**
     * SHIFT key input state (speed boost)
     * @returns {boolean}
     */
    get shiftIsDown()
    {
        return this._shiftDown;
    }

    /**
     * Reset all input states to false
     * Useful for disabling input or clearing state
     */
    reset()
    {
        this._left = false;
        this._right = false;
        this._up = false;
        this._down = false;
        this._shoot = false;

        // Phase 3: Reset additional input states
        this._zDown = false;
        this._cDown = false;
        this._qDown = false;
        this._eDown = false;
        this._shiftDown = false;
    }

    /**
     * Override in derived classes to implement specific input logic
     * @param {number} deltaTime - Time since last frame
     */
    update(deltaTime)
    {
        // Override in derived classes (KeyboardInputComponent, etc.)
    }

    /**
     * Get input state for debugging
     */
    getInputState()
    {
        return {
            left: this._left,
            right: this._right,
            up: this._up,
            down: this._down,
            shoot: this._shoot,
            zDown: this._zDown,
            cDown: this._cDown,
            qDown: this._qDown,
            eDown: this._eDown,
            shiftDown: this._shiftDown
        };
    }
}

// Export for ES6 module system
export default InputComponent;

// Export to globalThis for hot-reload detection
globalThis.InputComponent = InputComponent;

console.log('InputComponent: Base class loaded (Phase 1 - Foundation Layer)');
