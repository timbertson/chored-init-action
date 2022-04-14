import { homedir } from 'os'
import { join } from 'path'
import { restore, CacheSpec } from './action'
import * as assert from 'assert'

async function runTest() {
	const restored: Set<CacheSpec> = new Set()
	const { digest } = await restore({
		roots: ["sample"],
		wrapperScript: "sample/chored",
		keyPrefix: 'test',
	}, (spec: CacheSpec): Promise<string|undefined> => {
		restored.add(spec)
		return Promise.resolve(undefined)
	})
	
	const restoredList = Array.from(restored)
	restoredList.sort((a: CacheSpec, b: CacheSpec): number => a.key.localeCompare(b.key))

	assert.deepEqual(digest.pathList(), [
		'sample/choredefs/index.ts',
		'sample/choredefs/render.ts',
	])
	assert.deepEqual(digest.urlList(), [
		'https://raw.githubusercontent.com/timbertson/chored/1bfc880193f3aadfb28ea7eadd43067bb6893595/lib/chore/builtins.ts',
		'https://raw.githubusercontent.com/timbertson/chored/1bfc880193f3aadfb28ea7eadd43067bb6893595/lib/render.ts',
	])

	const home = homedir()
	assert.deepEqual(restoredList, [
		{ paths: [home + '/.cache/chored'], key: 'test-bin-RCslodbYW1XCIlI9' },
		{ paths: [home + '/.cache/deno'], key: 'test-mod-Yncf7My8bALxhw0d' },
	])
}

runTest()
