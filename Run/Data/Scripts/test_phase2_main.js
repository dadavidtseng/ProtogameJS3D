// test_phase2_main.js - Phase 2 Main Test Module
// This module imports from math_utils.js to test Phase 2 import resolution

console.log("test_phase2_main.js: Starting Phase 2 import test...");

// Test: Import named exports
import { add, multiply, square, PI, Calculator } from './math_utils.js';

console.log("test_phase2_main.js: Imports successful!");

// Test 1: Call imported functions
console.log("=== Test 1: Calling imported functions ===");
const sum = add(10, 5);
console.log(`Result: ${sum}`);

const product = multiply(7, 3);
console.log(`Result: ${product}`);

const squared = square(4);
console.log(`Result: ${squared}`);

// Test 2: Use imported constant
console.log("=== Test 2: Using imported constant ===");
console.log(`PI = ${PI}`);
const circumference = 2 * PI * 5;
console.log(`Circumference of circle with radius 5: ${circumference}`);

// Test 3: Use imported class
console.log("=== Test 3: Using imported class ===");
const calc = new Calculator("Phase2Calculator");
const calcResult = calc.calculate('+', 100, 200);
console.log(`Calculator result: ${calcResult}`);

// Export test results
export const testResults = {
    sum,
    product,
    squared,
    circumference,
    calcResult,
    status: "Phase 2 validation PASS"
};

console.log("test_phase2_main.js: All tests completed successfully!");
console.log("Phase 2 Import Resolution: WORKING ✓");
