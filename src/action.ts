import * as Cache from '@actions/cache'
import * as Core from '@actions/core'
import { createHmac } from 'crypto'
import { promisify } from 'util'
import { readFile } from 'fs'
import { homedir } from 'os'
import { join as pathJoin } from 'path'
const Walk: any = require('@root/walk')

export interface Options {
	keyPrefix: string,
	roots: string[],
	wrapperScript: string,
}

class Digest {
	paths: Set<string>
	urls: Set<string>

	constructor() {
		this.urls = new Set()
		this.paths = new Set()
	}

	addString(str: string) {
		this.urls.add(str)
	}
	
	addUrlsIn(path: string, str: string) {
		this.paths.add(path)
		for (const [url] of str.matchAll(/https?:\/\/[^'" ]+/gm)) {
			this.addString(url)
		}
	}

	addRemoteImportsIn(path: string, str: string) {
		for (const [match] of str.matchAll(/(^(import|export).*)|( from +['"].*)/gm)) {
			this.addUrlsIn(path, match)
		}
	}
	
	digest(extra: string): string {
		return createHmac('sha256', extra + this.urlList().join('\n')).digest('base64').substring(0, 16)
	}
	
	urlList(): string[] {
		const sorted = Array.from(this.urls)
		sorted.sort()
		return sorted
	}

	pathList(): string[] {
		const sorted = Array.from(this.paths)
		sorted.sort()
		return sorted
	}
}

export interface CacheSpec {
	key: string,
	paths: string[],
}

export interface RestoreResult {
	misses: Array<CacheSpec>,
	digest: Digest,
}

const stateKey = 'cacheHits'

export async function restore(options: Options, restoreCache: (_: CacheSpec) => Promise<string | undefined>): Promise<RestoreResult> {
	const modulesDigest = new Digest()
	const work: Array<Promise<void>> = []
	const misses: CacheSpec[] = []
	
	async function restoreWithLogging(spec: CacheSpec): Promise<void> {
		const hit = await restoreCache(spec)
		if (hit == null) {
			misses.push(spec)
			Core.info(`cache miss for ${spec.key}`)
		} else {
			Core.info(`cache hit for ${spec.key}`)
		}
	}

	async function restoreWrapper(): Promise<void> {
		const contents = await promisify(readFile)(options.wrapperScript, 'utf8')
		await restoreWithLogging({
			key: `${options.keyPrefix}-bin-${(new Digest()).digest(contents)}`,
			paths: [pathJoin(homedir(), '.cache', 'chored')]
		})
	}

	// we can start restoring based on the wrapper immediately
	work.push(restoreWrapper())

	// the choredef cache relies on us walking that directory
	const readTS = async (path: string): Promise<void> => {
		const contents = await promisify(readFile)(path, 'utf8')
		modulesDigest.addRemoteImportsIn(path, contents)
	}

	const walkFunc = async (err: Error | undefined, pathname: string, dirent: any): Promise<boolean> => {
		if (err) {
			throw err;
		}
		const name: string = dirent.name
	
		if (dirent.isDirectory()) {
			if (name.startsWith(".")) {
				return false;
			}
		} else {
			if (name.endsWith('.ts')) {
				work.push(readTS(pathname))
			}
		}
		return true
	}

	for (const root of options.roots) {
		await Walk.walk(root, walkFunc)
	}

	// FS reads are all initiated, wait for them to complete
	await Promise.all(work)

	for (const url of modulesDigest.urlList()) {
		console.log('- ' + url)
	}

	console.log(`module cache derived from ${modulesDigest.urls.size} remote imports in ${modulesDigest.paths.size} files`)
	await restoreWithLogging({
		key: `${options.keyPrefix}-mod-${modulesDigest.digest('')}`,
		paths: [pathJoin(homedir(), '.cache', 'deno')]
	})
		
	Core.saveState(stateKey, misses)
	return { digest: modulesDigest, misses }
}

export function main(): Promise<void> {
	Core.info("initializing chored caches ...")
	return restore({
		keyPrefix: 'chored',
		roots: ['choredefs'],
		wrapperScript: 'chored',
	}, (spec: CacheSpec) => Cache.restoreCache(spec.paths, spec.key)).then(_ => {})
}

export async function save() {
	Core.info("saving chored caches ...")
	try {
		const misses = JSON.parse(Core.getState(stateKey)) as CacheSpec[]
		await Promise.all(misses.map(async (miss: CacheSpec) => {
			Cache.saveCache(miss.paths, miss.key)
		}))
	} catch(error) {
		// don't fail the workflow
		const msg = error instanceof(Error) ? error.message : String(error)
		Core.warning(msg)
	}
}
