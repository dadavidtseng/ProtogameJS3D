// math_utils.js - Phase 2 Test Module (Dependency)
// This module will be imported by the main test module

console.log("math_utils.js: Module loading...");

// Export individual functions
export function add(a, b) {
    console.log(`math_utils.add(${a}, ${b}) = ${a + b}`);
    return a + b;
}

export function multiply(a, b) {
    console.log(`math_utils.multiply(${a}, ${b}) = ${a * b}`);
    return a * b;
}

export function square(x) {
    const result = x * x;
    console.log(`math_utils.square(${x}) = ${result}`);
    return result;
}

// Export a constant
export const PI = 3.14159;

// Export a class
export class Calculator {
    constructor(name) {
        this.name = name;
        console.log(`Calculator created: ${this.name}`);
    }

    calculate(operation, a, b) {
        console.log(`${this.name}: Calculating ${a} ${operation} ${b}`);
        switch (operation) {
            case '+': return add(a, b);
            case '*': return multiply(a, b);
            default: return 0;
        }
    }
}

console.log("math_utils.js: Module loaded successfully!");
