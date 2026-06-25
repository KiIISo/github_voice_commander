// Production server: serves the built frontend and proxies GitHub OAuth endpoints.
// Requires Node 18+ (uses built-in fetch). No extra dependencies.
// Usage: npm run build && npm start
import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const DIST = join(__dirname, 'dist')
const PORT = Number(process.env.PORT ?? 4173)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
}

async function readBody(req) {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => resolve(body))
  })
}

// Explicit allowlist — prevents this proxy from being used as an open SSRF relay
const ALLOWED_PROXY_PATHS = new Set([
  '/login/device/code',
  '/login/oauth/access_token',
])

async function proxyGitHub(req, res, targetPath) {
  if (!ALLOWED_PROXY_PATHS.has(targetPath)) {
    res.writeHead(403, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Path not allowed' }))
    return
  }
  try {
    const body = await readBody(req)
    const upstream = await fetch(`https://github.com${targetPath}`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body,
    })
    const text = await upstream.text()
    res.writeHead(upstream.status, { 'Content-Type': 'application/json' })
    res.end(text)
  } catch (err) {
    res.writeHead(502, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Proxy error', detail: String(err) }))
  }
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)

  if (req.method === 'POST' && url.pathname.startsWith('/api/github/')) {
    await proxyGitHub(req, res, url.pathname.replace('/api/github', ''))
    return
  }

  let filePath = join(DIST, url.pathname === '/' ? 'index.html' : url.pathname)
  if (!existsSync(filePath)) filePath = join(DIST, 'index.html') // SPA fallback

  try {
    const content = readFileSync(filePath)
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] ?? 'application/octet-stream' })
    res.end(content)
  } catch {
    res.writeHead(404)
    res.end('Not found')
  }
// Bind to localhost only — not exposed on LAN/external interfaces
}).listen(PORT, '127.0.0.1', () => {
  console.log(`GitHub Voice Commander → http://localhost:${PORT}`)
})
