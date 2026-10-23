const https = require('node:https')
const SOURCE_URL = 'https://api.ip13.com/doc/65'
const DEFAULT_QUERY = '家常菜'
const TTL = 15 * 60 * 1000

const text = value => typeof value === 'string' ? value.replace(/<[^>]*>/g, '').trim() : ''
function imageUrl(value) {
  const first = Array.isArray(value) ? value[0] : value
  if (typeof first !== 'string') return ''
  const url = first.trim().split(/[,;\s]+/)[0]
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && parsed.hostname === 'caipu.ip13.com' && !parsed.username && !parsed.password ? url : ''
  } catch { return '' }
}
function normalizeRecipe(raw, query) {
  const info = raw?.basic_info || {}
  const steps = (Array.isArray(raw?.steps) ? raw.steps : []).slice().sort((a, b) => Number(a.step_order) - Number(b.step_order))
  const stepImages = {}
  steps.forEach((step, index) => { const url = imageUrl(step.step_img_list); if (url) stepImages[index] = url })
  const ingredients = [raw?.main_ingredients, raw?.sub_ingredients].flatMap(list => Array.isArray(list) ? list : []).map(row => ({ name: text(row.zhuliao_name || row.fuliao_name || row.name), amount: text(row.shuliang || row.amount) })).filter(row => row.name)
  const tags = text(info.tags).split(/[,，]/).filter(Boolean)
  const cleanName = text(info.cookbook_name).replace(/#[^#]*#/g, '').trim()
  const cover = imageUrl(info.img_list)
  return {
    id: /^\d+$/.test(String(info.id_cookbook)) ? `ip13:${info.id_cookbook}` : '',
    name: cleanName || text(info.cookbook_name), cover,
    desc: text(info.summary), category: text(info.fenlei_tag) || '家常菜', cuisine: '',
    ingredients, steps: steps.map(step => text(step.step_introduce)), stepImages,
    gallery: [...new Set([cover, ...Object.values(stepImages)].filter(Boolean))],
    duration: text(info.duration), difficultyLabel: text(info.level), time_minutes: 0, servings: 0, difficulty: 0,
    taste_tags: tags, scene_tags: [], nutrition: { calories: 0, note: '' },
    tips: text(info.tips) ? [text(info.tips)] : [],
    source: { name: '悦耳菜谱', url: SOURCE_URL }, searchQuery: query
  }
}
function isUsableRecipe(recipe) {
  return !!recipe.id && !!recipe.name && !!recipe.cover && recipe.ingredients.length >= 3 && recipe.ingredients.filter(row => row.amount).length >= Math.max(3, Math.ceil(recipe.ingredients.length * 0.6)) && recipe.steps.length >= 3 && recipe.steps.every((step, i) => step.length >= 2 && !!recipe.stepImages[i])
}
function requestJson(data) {
  return new Promise((resolve, reject) => {
    const body = Buffer.from(JSON.stringify(data))
    const request = https.request('https://api.ip13.com/api/recipes/searchrecipes', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': body.length } }, response => {
      const chunks = []; let size = 0
      response.on('data', chunk => { size += chunk.length; if (size > 4 * 1024 * 1024) response.destroy(new Error('response too large')); else chunks.push(chunk) })
      response.on('error', reject)
      response.on('end', () => {
        if (response.statusCode !== 200) { reject(new Error('upstream HTTP error')); return }
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))) } catch { reject(new Error('invalid upstream JSON')) }
      })
    })
    request.setTimeout(18000, () => request.destroy(new Error('upstream timeout')))
    request.on('error', reject); request.end(body)
  })
}
function createRecipeService({ getKey, fetchJson = requestJson, now = Date.now }) {
  const searches = new Map(), details = new Map(), pending = new Map()
  function read(map, key) { const item = map.get(key); if (!item) return null; if (now() - item.at >= TTL) { map.delete(key); return null } return item.value }
  function write(map, key, value) { map.set(key, { at: now(), value }); if (map.size > 300) map.delete(map.keys().next().value) }
  async function search(query) {
    const cached = read(searches, query)
    if (cached) return { ...cached, cached: true }
    if (pending.has(query)) return pending.get(query)
    const operation = (async () => {
      const key = getKey()
      if (!key) throw Object.assign(new Error('菜谱服务暂未就绪，请稍后重试'), { code: 'NOT_CONFIGURED' })
      let data
      try { data = await fetchJson({ key, cookbook_name: query, limit: 30 }) }
      catch { throw Object.assign(new Error('菜谱暂时没加载出来，请重试'), { code: 'UPSTREAM_UNAVAILABLE' }) }
      if (Number(data?.code) === 403) throw Object.assign(new Error('菜谱服务暂时不可用，请稍后重试'), { code: 'UPSTREAM_AUTH' })
      // The provider also returns code=400, count=0, data='' for an actual no-match.
      if (Number(data?.code) === 400 && Number(data?.count) === 0 && text(data?.msg).includes('未找到')) {
        const empty = { ok: true, recipes: [], query, source: 'ip13', filtered: 0, cached: false }
        write(searches, query, empty); return empty
      }
      // Other business errors must not masquerade as empty results.
      if (Number(data?.code) !== 200) throw Object.assign(new Error('菜谱暂时没加载出来，请重试'), { code: 'UPSTREAM_UNAVAILABLE' })
      if (!Array.isArray(data.data)) throw Object.assign(new Error('菜谱返回异常，请稍后重试'), { code: 'UPSTREAM_UNAVAILABLE' })
      const recipes = []; const ids = new Set()
      for (const raw of data.data) {
        const recipe = normalizeRecipe(raw, query)
        if (!isUsableRecipe(recipe) || ids.has(recipe.id)) continue
        ids.add(recipe.id); recipes.push(recipe); write(details, recipe.id, recipe)
      }
      recipes.sort((a, b) => Number(b.name === query) - Number(a.name === query))
      const result = { ok: true, recipes, query, source: 'ip13', filtered: data.data.length - recipes.length, cached: false }
      write(searches, query, result); return result
    })()
    pending.set(query, operation)
    try { return await operation } finally { pending.delete(query) }
  }
  async function handle(event) {
    try {
      const action = event?.action || 'search'
      const query = typeof event?.query === 'string' ? event.query.trim() : ''
      if (query.length > 40) return { ok: false, error: { code: 'INVALID_QUERY', message: '菜名太长了，试试简短一点' } }
      if (action === 'search') return await search(query || DEFAULT_QUERY)
      if (action !== 'detail' || !/^ip13:\d{1,20}$/.test(event.id || '')) return { ok: false, error: { code: 'INVALID_REQUEST', message: '这道菜暂时找不到了' } }
      let recipe = read(details, event.id)
      if (!recipe && query) recipe = (await search(query)).recipes.find(row => row.id === event.id)
      return recipe ? { ok: true, recipe, source: 'ip13' } : { ok: false, error: { code: 'NOT_FOUND', message: '这道菜暂时找不到了，返回搜索试试' } }
    } catch (error) {
      return { ok: false, error: { code: error.code || 'UPSTREAM_UNAVAILABLE', message: error.code ? error.message : '菜谱暂时没加载出来，请重试' } }
    }
  }
  return { handle }
}
module.exports = { normalizeRecipe, isUsableRecipe, createRecipeService }
