"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculate = calculate;
async function calculate(expression) {
    console.log(`[Tool:calculate] Called with expression: "${expression}"`);
    try {
        if (/[^0-9\s\+\-\*\/\(\)\.]/g.test(expression)) {
            throw new Error("Invalid characters in expression. Only numbers and basic operators (+, -, *, /) are allowed.");
        }
        const result = new Function(`return ${expression}`)();
        return `The result of "${expression}" is ${result}.`;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error during calculation.';
        console.error('[Tool:calculate] Error:', errorMessage);
        return `Error calculating expression: ${errorMessage}`;
    }
}
