"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const system_js_1 = require("../system.js");
exports.default = {
    name: 'get_current_datetime',
    definition: {
        description: 'Gets the current date, time, and day of the week from the system.',
        inputSchema: {}
    },
    implementation: async () => {
        return {
            content: [
                {
                    type: 'text',
                    text: await (0, system_js_1.getCurrentDateTime)(),
                },
            ],
        };
    },
};
