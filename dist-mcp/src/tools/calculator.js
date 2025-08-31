"use strict";
// Create this new file at: src/tools/calculator.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculate = calculate;
/**
 * Safely evaluates a mathematical expression.
 * This is a simple implementation for demonstration. For a real-world application,
 * using a dedicated math parsing library like 'mathjs' would be more robust and secure.
 * @param expression The mathematical expression to evaluate (e.g., "2 + 2 * 10").
 * @returns The result of the calculation or an error message.
 */
async function calculate(expression) {
    console.log(`[Tool:calculate] Called with expression: "${expression}"`);
    try {
        // Security check: Only allow numbers and basic math operators.
        // This is a crucial step to prevent arbitrary code execution.
        if (/[^0-9\s\+\-\*\/\(\)\.]/g.test(expression)) {
            throw new Error("Invalid characters in expression. Only numbers and basic operators (+, -, *, /) are allowed.");
        }
        // Using Function constructor is a safer way to evaluate than eval()
        const result = new Function(`return ${expression}`)();
        return `The result of "${expression}" is ${result}.`;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error during calculation.';
        console.error('[Tool:calculate] Error:', errorMessage);
        return `Error calculating expression: ${errorMessage}`;
    }
}
