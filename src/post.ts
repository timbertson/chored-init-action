import { save } from './action'
export default async function() {
	process.on("uncaughtException", e => console.warn('WARN: ' + e.message));
	return save()
}
