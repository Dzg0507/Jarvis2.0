"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("./index.js");
(0, vitest_1.describe)('File System Tools', () => {
    (0, vitest_1.describe)('listFiles', () => {
        (0, vitest_1.it)('should list files and directories correctly', async () => {
            const mockFs = {
                readdir: vitest_1.vi.fn().mockResolvedValue([
                    { name: 'file1.txt', isDirectory: () => false },
                    { name: 'dir1', isDirectory: () => true },
                ]),
            };
            const result = await (0, index_js_1.listFiles)('./', mockFs);
            (0, vitest_1.expect)(result).toBe('file1.txt\ndir1/');
            (0, vitest_1.expect)(mockFs.readdir).toHaveBeenCalledWith(vitest_1.expect.any(String), { withFileTypes: true });
        });
        (0, vitest_1.it)('should handle errors gracefully', async () => {
            const errorMessage = 'EACCES: permission denied';
            const mockFs = {
                readdir: vitest_1.vi.fn().mockRejectedValue(new Error(errorMessage)),
            };
            const result = await (0, index_js_1.listFiles)('./', mockFs);
            (0, vitest_1.expect)(result).toBe(`Error listing files: ${errorMessage}`);
        });
    });
});
