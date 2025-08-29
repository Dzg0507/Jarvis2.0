"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTool = void 0;
const zod_1 = require("zod");
const createTool = (toolDefinition, dependencies = {}) => {
    const { name, definition, implementation } = toolDefinition;
    const wrappedImplementation = async (input) => {
        try {
            const schema = zod_1.z.object(definition.inputSchema);
            const validatedInput = schema.parse(input);
            const result = await implementation(validatedInput, dependencies);
            return { success: true, data: result };
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return { success: false, error: `Invalid input: ${error.message}` };
            }
            return { success: false, error: error.message };
        }
    };
    return {
        name,
        definition,
        implementation: wrappedImplementation,
    };
};
exports.createTool = createTool;
