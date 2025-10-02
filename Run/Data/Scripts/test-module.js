//----------------------------------------------------------------------------------------------------
// test-module.js - Simple Test ES6 Module
//----------------------------------------------------------------------------------------------------

// Import from test-config
import { TEST_MESSAGE, TEST_NUMBER, greet, TestClass } from './test-config.js';

console.log('test-module.js: Starting module execution');
console.log('test-module.js: Imported TEST_MESSAGE =', TEST_MESSAGE);
console.log('test-module.js: Imported TEST_NUMBER =', TEST_NUMBER);
console.log('test-module.js: Calling greet("World") =', greet("World"));

// Create instance of imported class
const testInstance = new TestClass(100);
console.log('test-module.js: TestClass instance value =', testInstance.getValue());

// Export something from this module
export function testModuleFunction() {
    console.log('testModuleFunction called from test-module.js');
    return 'Module function executed successfully!';
}

export const MODULE_NAME = 'test-module';

console.log('test-module.js: Module loaded successfully!');
