// F1_KeyHandler.js - Chrome DevTools Debuggable F1 Key Handler
// This script is executed when F2 key is pressed and appears in Chrome DevTools Sources panel
// You can set breakpoints here and step through the code in Chrome DevTools!

console.log('=== F1 KEY PRESSED - DEBUG MODE ===');

// Function to help with debugging - you can set breakpoints here
function toggleShouldRender() {
    if (typeof globalThis.shouldRender === 'undefined') {
        globalThis.shouldRender = true;
        console.log('F1: Initialized shouldRender to true');
        return 'initialized';
    } else {
        globalThis.shouldRender = !globalThis.shouldRender;
        console.log('F1: Toggled shouldRender to ' + globalThis.shouldRender);
        return globalThis.shouldRender ? 'enabled' : 'disabled';
    }
}

// Function to get engine status - you can inspect variables here
function getEngineStatus() {
    if (typeof globalThis.JSEngine !== 'undefined' && globalThis.JSEngine.getStatus) {
        let status = globalThis.JSEngine.getStatus();
        console.log('F1: Engine status:', status);
        return status;
    } else {
        console.log('F1: JSEngine not available or getStatus method missing');
        return null;
    }
}

// Function to get system information - useful for debugging
function getSystemInfo() {
    if (typeof globalThis.GameAPI !== 'undefined') {
        let systems = globalThis.GameAPI.listSystems();
        console.log('F1: Registered systems:', systems);
        return systems;
    } else {
        console.log('F1: GameAPI not available');
        return null;
    }
}

// Main execution - set breakpoints on any of these lines in Chrome DevTools
let renderResult = toggleShouldRender();
let engineStatus = getEngineStatus();  
let systemInfo = getSystemInfo();

// Additional debugging information
console.log('F1: Current shouldRender state:', globalThis.shouldRender);
console.log('F1: Render toggle result:', renderResult);

// Show available global objects for debugging
let globalObjects = Object.keys(globalThis).filter(key => 
    key.startsWith('JS') || 
    key === 'GameAPI' || 
    key === 'shouldRender' ||
    key === 'game'
);
console.log('F1: Available global objects:', globalObjects);

// Test shouldRender functionality by showing render status
if (typeof globalThis.shouldRender !== 'undefined') {
    if (globalThis.shouldRender) {
        console.log('F1: Rendering is ENABLED - game visuals should be visible');
    } else {
        console.log('F1: Rendering is DISABLED - game visuals should be hidden');
    }
} else {
    console.log('F1: WARNING - shouldRender is not defined!');
}

// Breakpoint helper - you can set a breakpoint here and inspect all variables
// debugger; // This will pause execution in Chrome DevTools when debugger is attached

console.log('=== F1 HANDLER COMPLETE ===');