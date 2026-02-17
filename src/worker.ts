// Minimal R2Bucket types for TS
interface R2ObjectBody { body: ReadableStream<Uint8Array> | null }
interface R2ListedObject { key: string }
interface R2ListResult { objects: R2ListedObject[]; truncated?: boolean; cursor?: string }
interface R2ListOptions { prefix?: string; limit?: number; cursor?: string; delimiter?: string }
interface R2Bucket {
  get(key: string): Promise<R2ObjectBody | null>
  list(options?: R2ListOptions): Promise<R2ListResult>
}

export interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> }
  DOWNLOADS: R2Bucket
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    // Serve robots.txt
    if (url.pathname === '/robots.txt') {
      const robots = `User-agent: *\nAllow: /\n`;
      return new Response(robots, { headers: { 'content-type': 'text/plain; charset=utf-8' } })
    }

    // R2 download proxy
    if (url.pathname.startsWith('/downloads/')) {
      const specialRaw = url.pathname.replace('/downloads/', '')
      const special = specialRaw.endsWith('/') ? specialRaw.slice(0, -1) : specialRaw

      // Stable latest endpoint: /downloads/arena-assistant/latest (with or without trailing slash)
      if (special === 'arena-assistant/latest') {
        const latestKey = await resolveLatestArenaAssistantKey(env)
        if (!latestKey) return new Response('Not found', { status: 404 })
        const obj = await env.DOWNLOADS.get(latestKey)
        if (!obj) return new Response('Not found', { status: 404 })
        const headers = new Headers()
        headers.set('content-type', 'application/octet-stream')
        headers.set('content-disposition', `attachment; filename="${latestKey}"`)
        headers.set('cache-control', 'no-cache')
        return new Response(obj.body, { headers })
      }

      const key = decodeURIComponent(special)
      const obj = await env.DOWNLOADS.get(key)
      if (obj) {
        const headers = new Headers()
        headers.set('content-type', 'application/octet-stream')
        headers.set('content-disposition', `attachment; filename="${key}"`)
        return new Response(obj.body, { headers })
      }
      return new Response('Not found', { status: 404 })
    }

    // SPA: if the path is not a file (no extension), serve index.html directly
    if (shouldSpaFallback(url)) {
      const indexUrl = new URL('/index.html', url.origin).toString()
      const indexReq = new Request(indexUrl, { method: 'GET', headers: request.headers })
      const html = ensureHtmlNoCache(await env.ASSETS.fetch(indexReq))
      if (request.method === 'HEAD') {
        return new Response(null, { status: html.status, headers: html.headers })
      }
      return html
    }

    // Otherwise try to serve static asset first
    const response = await env.ASSETS.fetch(request)

    // If not found, still fall back to index.html (covers hashed asset misses)
    if (response.status === 404) {
      const indexUrl = new URL('/index.html', url.origin).toString()
      const indexReq = new Request(indexUrl, { method: 'GET', headers: request.headers })
      const html = ensureHtmlNoCache(await env.ASSETS.fetch(indexReq))
      if (request.method === 'HEAD') {
        return new Response(null, { status: html.status, headers: html.headers })
      }
      return html
    }

    // Add long cache for non-HTML static assets
    const contentType = response.headers.get('content-type') || ''
    if (response.ok && !contentType.includes('text/html')) {
      const newHeaders = new Headers(response.headers)
      if (!newHeaders.has('cache-control')) {
        newHeaders.set('cache-control', 'public, max-age=31536000, immutable')
      }
      return new Response(response.body, { status: response.status, headers: newHeaders })
    }

    return response
  },
}

function shouldSpaFallback(url: URL): boolean {
  const pathname = url.pathname
  // Ignore root which should still serve index.html via the rule above
  if (pathname === '/' || pathname === '') return true
  const lastSegment = pathname.split('/').pop() || ''
  const hasExtension = lastSegment.includes('.')
  return !hasExtension
}

function ensureHtmlNoCache(resp: Response): Response {
  const headers = new Headers(resp.headers)
  headers.set('content-type', 'text/html; charset=utf-8')
  headers.set('cache-control', 'no-cache')
  return new Response(resp.body, { status: resp.status, headers })
}

async function resolveLatestArenaAssistantKey(env: Env): Promise<string | null> {
  // 1) Try manifest file first
  const manifestKeys = [
    'arena-assistant/latest.json',
    'arena-assistant/latest.txt',
    'latest.json',
    'latest.txt',
  ]
  for (const mk of manifestKeys) {
    const mf = await env.DOWNLOADS.get(mk)
    if (!mf || !mf.body) continue
    try {
      const text = (await new Response(mf.body).text()).trim()
      if (mk.endsWith('.json')) {
        const data = JSON.parse(text) as { key?: string }
        if (data.key && typeof data.key === 'string' && data.key.toLowerCase().endsWith('.exe')) return data.key
      } else {
        // plain text manifest contains the exact key
        if (text && text.toLowerCase().endsWith('.exe')) return text
      }
    } catch {
      // ignore this manifest and try others
    }
  }

  // 2) Fallback A: list by expected prefix and pick highest semver
  try {
    const prefixedKeys = await listAllKeys(env, 'Arena Assistant Setup v')
    const exePrefixed = prefixedKeys.filter(k => k.toLowerCase().endsWith('.exe'))
    if (exePrefixed.length > 0) {
      exePrefixed.sort((a, b) => compareVersionKeys(a, b))
      return exePrefixed[exePrefixed.length - 1]
    }
  } catch {
    // ignore and try global search
  }

  // 2) Fallback B: scan entire bucket for any .exe with a version pattern and pick highest
  try {
    const allKeys = await listAllKeys(env)
    const exeKeys = allKeys.filter(k => k.toLowerCase().endsWith('.exe'))
    const versioned = exeKeys.filter(k => /v\d+\.\d+(?:\.\d+)?/i.test(k))
    if (versioned.length === 0) return null
    versioned.sort((a, b) => compareVersionKeys(a, b))
    return versioned[versioned.length - 1]
  } catch {
    return null
  }
}

function compareVersionKeys(a: string, b: string): number {
  // Extract versions like "v0.1.1" or "v0.1" from filename
  const va = extractSemver(a)
  const vb = extractSemver(b)
  for (let i = 0; i < 3; i++) {
    const da = va[i] || 0
    const db = vb[i] || 0
    if (da !== db) return da - db
  }
  return 0
}

function extractSemver(key: string): [number, number, number] {
  const match = key.match(/v(\d+)\.(\d+)(?:\.(\d+))?/i)
  if (!match) return [0, 0, 0]
  const major = parseInt(match[1] || '0', 10)
  const minor = parseInt(match[2] || '0', 10)
  const patch = parseInt(match[3] || '0', 10)
  return [major, minor, patch]
}

async function listAllKeys(env: Env, prefix?: string): Promise<string[]> {
  const keys: string[] = []
  let cursor: string | undefined = undefined
  do {
    const result = await env.DOWNLOADS.list({ prefix, limit: 1000, cursor })
    for (const obj of result.objects || []) keys.push(obj.key)
    cursor = result.truncated ? result.cursor : undefined
  } while (cursor)
  return keys
}


