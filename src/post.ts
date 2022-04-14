import { save } from './action'
process.on("uncaughtException", e => console.warn('WARN: ' + e.message));
save()
