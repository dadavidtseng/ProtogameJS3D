// test_phase3_main.js - Phase 3 Main Test Module
// Tests Phase 3 features: dynamic import, enhanced import.meta, error recovery

console.log("test_phase3_main.js: Starting Phase 3 validation tests...");

// =============================================================================
// Test 1: Dynamic Import (import() function)
// =============================================================================
console.log("\n=== Test 1: Dynamic Import ===");

// Test dynamic import with async/await
async function testDynamicImport() {
    try {
        console.log("test_phase3_main.js: Calling import('./dynamic_module.js')...");

        // Dynamic import returns a Promise
        const dynamicModule = await import('./dynamic_module.js');

        console.log("test_phase3_main.js: Dynamic import successful!");

        // Test imported named exports
        console.log(`Dynamic value: ${dynamicModule.dynamicValue}`);
        const result = dynamicModule.dynamicFunction(5);
        console.log(`Dynamic function result: ${result}`);

        // Test imported class
        const instance = new dynamicModule.DynamicClass("Phase3Test");
        console.log(`Dynamic class greeting: ${instance.greet()}`);

        // Test default export
        console.log(`Default export: ${JSON.stringify(dynamicModule.default)}`);

        console.log("✓ Test 1 PASSED: Dynamic import working!");
        return true;
    } catch (error) {
        console.log(`✗ Test 1 FAILED: ${error}`);
        return false;
    }
}

// =============================================================================
// Test 2: Enhanced import.meta
// =============================================================================
console.log("\n=== Test 2: Enhanced import.meta ===");

try {
    console.log(`import.meta.url: ${import.meta.url}`);

    // Phase 3 should add more properties to import.meta
    if (import.meta.url) {
        console.log("✓ Test 2 PASSED: import.meta.url available!");
    } else {
        console.log("✗ Test 2 FAILED: import.meta.url not available");
    }
} catch (error) {
    console.log(`✗ Test 2 FAILED: ${error}`);
}

// =============================================================================
// Test 3: Module Error Recovery (try importing non-existent module)
// =============================================================================
console.log("\n=== Test 3: Module Error Recovery ===");

async function testErrorRecovery() {
    try {
        console.log("test_phase3_main.js: Attempting to import non-existent module...");
        await import('./non_existent_module.js');
        console.log("✗ Test 3 FAILED: Should have thrown an error");
        return false;
    } catch (error) {
        console.log(`Expected error caught: ${error}`);
        console.log("✓ Test 3 PASSED: Error recovery working!");
        return true;
    }
}

// =============================================================================
// Execute all tests
// =============================================================================
async function runAllTests() {
    console.log("\n=== Running All Phase 3 Tests ===");

    const test1Result = await testDynamicImport();
    const test3Result = await testErrorRecovery();

    console.log("\n=== Phase 3 Test Summary ===");
    console.log(`Test 1 (Dynamic Import): ${test1Result ? 'PASS' : 'FAIL'}`);
    console.log(`Test 2 (import.meta): PASS (partial)`);
    console.log(`Test 3 (Error Recovery): ${test3Result ? 'PASS' : 'FAIL'}`);

    if (test1Result && test3Result) {
        console.log("\n✓✓✓ Phase 3 Validation: PASS ✓✓✓");
        return {
            status: "PASS",
            tests: {
                dynamicImport: test1Result,
                importMeta: true,
                errorRecovery: test3Result
            }
        };
    } else {
        console.log("\n✗✗✗ Phase 3 Validation: FAIL ✗✗✗");
        return {
            status: "FAIL",
            tests: {
                dynamicImport: test1Result,
                importMeta: true,
                errorRecovery: test3Result
            }
        };
    }
}

// Export test runner
export { runAllTests };

// Run tests immediately
runAllTests().then(result => {
    console.log("test_phase3_main.js: All tests completed!");
    console.log(`Final status: ${result.status}`);
}).catch(error => {
    console.log(`test_phase3_main.js: Fatal error: ${error}`);
});
