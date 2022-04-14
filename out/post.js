"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const action_1 = require("./action");
process.on("uncaughtException", e => console.warn('WARN: ' + e.message));
(0, action_1.save)();
//# sourceMappingURL=post.js.map