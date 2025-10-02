//----------------------------------------------------------------------------------------------------
// test-config.js - Test ES6 Module Configuration
//----------------------------------------------------------------------------------------------------

// Named exports
export const TEST_MESSAGE = "Hello from ES6 module!";
export const TEST_NUMBER = 42;
export const TEST_ARRAY = [1, 2, 3, 4, 5];

// Named function export
export function greet(name) {
    return `Hello, ${name}! This is an ES6 module function.`;
}

// Named class export
export class TestClass {
    constructor(value) {
        this.value = value;
    }

    getValue() {
        return this.value;
    }

    setValue(newValue) {
        this.value = newValue;
    }
}

console.log('test-config.js module loaded!');
