// dynamic_module.js - Module to be loaded dynamically
// This module will be imported using import() function

console.log("dynamic_module.js: Module loading...");

// Export various items for testing
export const dynamicValue = 999;

export function dynamicFunction(x) {
    console.log(`dynamicFunction called with: ${x}`);
    return x * 2;
}

export class DynamicClass {
    constructor(name) {
        this.name = name;
        console.log(`DynamicClass created: ${this.name}`);
    }

    greet() {
        return `Hello from DynamicClass: ${this.name}`;
    }
}

export default {
    version: "1.0.0",
    type: "dynamic",
    message: "This module was loaded dynamically!"
};

console.log("dynamic_module.js: Module loaded successfully!");
