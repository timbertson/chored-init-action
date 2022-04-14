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
exports.save = exports.main = exports.restore = void 0;
const Cache = require("@actions/cache");
const Core = require("@actions/core");
const crypto_1 = require("crypto");
const util_1 = require("util");
const fs_1 = require("fs");
const os_1 = require("os");
const path_1 = require("path");
const Walk = require('@root/walk');
class Digest {
    constructor() {
        this.urls = new Set();
        this.paths = new Set();
    }
    addString(str) {
        this.urls.add(str);
    }
    addUrlsIn(path, str) {
        this.paths.add(path);
        for (const [url] of str.matchAll(/https?:\/\/[^'" ]+/gm)) {
            this.addString(url);
        }
    }
    addRemoteImportsIn(path, str) {
        for (const [match] of str.matchAll(/^(import|export).*/gm)) {
            this.addUrlsIn(path, match);
        }
    }
    digest(extra) {
        return (0, crypto_1.createHmac)('sha256', extra + this.urlList().join('\n')).digest('base64').substring(0, 16);
    }
    urlList() {
        const sorted = Array.from(this.urls);
        sorted.sort();
        return sorted;
    }
    pathList() {
        const sorted = Array.from(this.paths);
        sorted.sort();
        return sorted;
    }
}
const stateKey = 'cacheHits';
function restore(options, restoreCache) {
    return __awaiter(this, void 0, void 0, function* () {
        const modulesDigest = new Digest();
        const work = [];
        const misses = [];
        function restoreWithLogging(spec) {
            return __awaiter(this, void 0, void 0, function* () {
                const hit = yield restoreCache(spec);
                if (hit == null) {
                    misses.push(spec);
                    Core.info(`cache miss for ${spec.key}`);
                }
                else {
                    Core.info(`cache hit for ${spec.key}`);
                }
            });
        }
        function restoreWrapper() {
            return __awaiter(this, void 0, void 0, function* () {
                const contents = yield (0, util_1.promisify)(fs_1.readFile)(options.wrapperScript, 'utf8');
                yield restoreWithLogging({
                    key: `${options.keyPrefix}-bin-${(new Digest()).digest(contents)}`,
                    paths: [(0, path_1.join)((0, os_1.homedir)(), '.cache', 'chored')]
                });
            });
        }
        // we can start restoring based on the wrapper immediately
        work.push(restoreWrapper());
        // the choredef cache relies on us walking that directory
        const readTS = (path) => __awaiter(this, void 0, void 0, function* () {
            const contents = yield (0, util_1.promisify)(fs_1.readFile)(path, 'utf8');
            modulesDigest.addRemoteImportsIn(path, contents);
        });
        const walkFunc = (err, pathname, dirent) => __awaiter(this, void 0, void 0, function* () {
            if (err) {
                throw err;
            }
            const name = dirent.name;
            if (dirent.isDirectory()) {
                if (name.startsWith(".")) {
                    return false;
                }
            }
            else {
                if (name.endsWith('.ts')) {
                    work.push(readTS(pathname));
                }
            }
            return true;
        });
        for (const root of options.roots) {
            yield Walk.walk(root, walkFunc);
        }
        // FS reads are all initiated, wait for them to complete
        yield Promise.all(work);
        yield restoreWithLogging({
            key: `${options.keyPrefix}-mod-${modulesDigest.digest('')}`,
            paths: [(0, path_1.join)((0, os_1.homedir)(), '.cache', 'deno')]
        });
        Core.saveState(stateKey, misses);
        return { digest: modulesDigest, misses };
    });
}
exports.restore = restore;
function main() {
    return restore({
        keyPrefix: 'chored',
        roots: ['choredefs'],
        wrapperScript: 'chored',
    }, (spec) => Cache.restoreCache(spec.paths, spec.key)).then(_ => { });
}
exports.main = main;
function save() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const misses = JSON.parse(Core.getState(stateKey));
            yield Promise.all(misses.map((miss) => __awaiter(this, void 0, void 0, function* () {
                Cache.saveCache(miss.paths, miss.key);
            })));
        }
        catch (error) {
            // don't fail the workflow
            const msg = error instanceof (Error) ? error.message : String(error);
            Core.warning(msg);
        }
    });
}
exports.save = save;
//# sourceMappingURL=action.js.map