"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const os_1 = require("os");
const action_1 = require("./action");
const assert = require("assert");
function runTest() {
    return __awaiter(this, void 0, void 0, function* () {
        const restored = new Set();
        const { digest } = yield (0, action_1.restore)({
            roots: ["sample"],
            wrapperScript: "sample/chored",
            keyPrefix: 'test',
        }, (spec) => {
            restored.add(spec);
            return Promise.resolve(undefined);
        });
        const restoredList = Array.from(restored);
        restoredList.sort((a, b) => a.key.localeCompare(b.key));
        assert.deepEqual(digest.pathList(), [
            'sample/choredefs/index.ts',
            'sample/choredefs/render.ts',
        ]);
        assert.deepEqual(digest.urlList(), [
            'https://raw.githubusercontent.com/timbertson/chored/1bfc880193f3aadfb28ea7eadd43067bb6893595/lib/chore/builtins.ts',
            'https://raw.githubusercontent.com/timbertson/chored/1bfc880193f3aadfb28ea7eadd43067bb6893595/lib/render.ts',
        ]);
        const home = (0, os_1.homedir)();
        assert.deepEqual(restoredList, [
            { paths: [home + '/.cache/chored'], key: 'test-bin-RCslodbYW1XCIlI9' },
            { paths: [home + '/.cache/deno'], key: 'test-mod-Yncf7My8bALxhw0d' },
        ]);
    });
}
runTest();
//# sourceMappingURL=test.js.map