const http = require('node:http'), fs = require('node:fs'), path = require('node:path')
const { createRecipeService } = require('../cloudfunctions/recipes/provider.cjs')
const root = path.resolve(__dirname, '..')
let localKey = ''
try { localKey = fs.readFileSync(path.join(root, '.env.local'), 'utf8').split(/\r?\n/).find(line => line.startsWith('RECIPE_API_KEY='))?.slice('RECIPE_API_KEY='.length).trim() || '' } catch {}
const service = createRecipeService({ getKey: () => process.env.RECIPE_API_KEY || localKey })
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' }
function createServer() {
  return http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost')
    if (url.pathname === '/api/recipes') {
      response.setHeader('Content-Type', 'application/json; charset=utf-8'); response.setHeader('Cache-Control', 'no-store')
      if (request.method !== 'POST') { response.writeHead(405); response.end(JSON.stringify({ ok: false, error: { message: 'Method not allowed' } })); return }
      try {
        let body = ''; for await (const chunk of request) { body += chunk; if (body.length > 4096) throw new Error('body too large') }
        const data = JSON.parse(body), result = await service.handle(data)
        console.log(`[recipes] ${data.action || 'search'}: ${result.ok ? (result.recipes ? result.recipes.length + ' results' : result.recipe.id) : result.error.code}`)
        response.end(JSON.stringify(result))
      } catch { response.writeHead(400); response.end(JSON.stringify({ ok: false, error: { message: '请求不正确，请重试' } })) }
      return
    }
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return }
    let file
    try {
      const pathname = decodeURIComponent(url.pathname)
      const allowedRoot = pathname.startsWith('/assets/') ? path.join(root, 'miniprogram/src/assets') : path.join(root, '.factory-cache/preview')
      const relative = pathname.startsWith('/assets/') ? pathname.slice(8) : pathname === '/' ? 'index.html' : pathname.slice(1)
      file = path.resolve(allowedRoot, relative)
      if (!file.startsWith(allowedRoot + path.sep) || !mime[path.extname(file)] || !fs.statSync(file).isFile()) throw new Error('not public')
      response.setHeader('Content-Type', mime[path.extname(file)]); response.setHeader('Cache-Control', 'no-cache')
      if (request.method === 'HEAD') response.end(); else fs.createReadStream(file).pipe(response)
    } catch { response.writeHead(404); response.end('Not found') }
  })
}
if (require.main === module) createServer().listen(Number(process.env.PORT || 4186), '127.0.0.1', () => console.log('Online preview running at http://127.0.0.1:' + (process.env.PORT || 4186)))
module.exports = { createServer }
