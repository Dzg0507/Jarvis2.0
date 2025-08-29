"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const index_js_1 = require("../index.js");
exports.default = {
    name: 'read_uploaded_file',
    definition: {
        title: 'Read Uploaded File',
        description: 'Reads the content of a file that has been uploaded by the user.',
        inputSchema: {
            filename: zod_1.z.string().describe('The name of the file to read.'),
        },
    },
    implementation: async ({ filename }) => {
        return {
            content: [
                {
                    type: 'text',
                    text: await (0, index_js_1.readUploadedFile)(filename),
                },
            ],
        };
    },
};
