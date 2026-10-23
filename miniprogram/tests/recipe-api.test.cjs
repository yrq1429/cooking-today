const test = require('node:test')
const assert = require('node:assert/strict')
const ts = require('typescript')
require.extensions['.ts'] = (module, file) => module._compile(ts.transpile(require('fs').readFileSync(file, 'utf8'), { module: ts.ModuleKind.CommonJS }), file)
const { normalizeRecipe, isUsableRecipe, createRecipeService } = require('../../cloudfunctions/recipes/provider.cjs')
const { createRecipeClient } = require('../src/services/recipe-client.ts')
const img = n => `https://caipu.ip13.com/caipu/buzhou/1/${n}.jpeg`
const raw = (id = 123) => ({ basic_info: { id_cookbook: id, cookbook_name: '可乐鸡翅#家常菜#', img_list: img('cover'), duration: '10~30分钟', level: '初级', tags: '家常菜,下饭菜' }, main_ingredients: [{ zhuliao_name: '鸡翅', shuliang: '500g' }, { zhuliao_name: '可乐', shuliang: '1罐' }, { zhuliao_name: '姜', shuliang: '3片' }], sub_ingredients: '', steps: [{ step_order: '3', step_introduce: '收汁出锅', step_img_list: img(3) }, { step_order: '1', step_introduce: '焯水沥干', step_img_list: img(1) }, { step_order: '2', step_introduce: '煎香后炖煮', step_img_list: img(2) }] })
test('把在线用料和乱序步骤转为页面可直接显示的逐步图文', () => {
  const r = normalizeRecipe(raw(), '鸡翅')
  assert.equal(r.id, 'ip13:123'); assert.equal(r.name, '可乐鸡翅')
  assert.deepEqual(r.steps, ['焯水沥干', '煎香后炖煮', '收汁出锅'])
  assert.equal(r.stepImages[0], img(1)); assert.equal(r.duration, '10~30分钟')
  assert.equal(r.ingredients.length, 3); assert.equal(r.searchQuery, '鸡翅')
})
test('过滤缺图、缺食材及非HTTPS图片，不把成品图冒充步骤图', () => {
  assert.equal(isUsableRecipe(normalizeRecipe(raw(), '鸡翅')), true)
  for (const change of [r => r.steps[1].step_img_list = '', r => r.main_ingredients = r.main_ingredients.slice(0, 1), r => r.steps[0].step_img_list = 'http://unsafe.test/a.jpg']) {
    const r = raw(); change(r); assert.equal(isUsableRecipe(normalizeRecipe(r, '鸡翅')), false)
  }
})
test('服务端从供应商查询，缓存详情；冷启动可用原搜索词找回同一道菜', async () => {
  let requests = 0
  const service = createRecipeService({ getKey: () => 'test-secret', fetchJson: async body => { assert.equal(body.key, 'test-secret'); requests++; return { code: 200, data: [raw()] } } })
  const search = await service.handle({ action: 'search', query: '鸡翅' })
  assert.equal(search.ok, true); assert.equal(search.recipes.length, 1)
  assert.equal((await service.handle({ action: 'detail', id: 'ip13:123', query: '鸡翅' })).recipe.id, 'ip13:123')
  assert.equal(requests, 1)
  const cold = createRecipeService({ getKey: () => 'test-secret', fetchJson: async () => ({ code: 200, data: [raw()] }) })
  assert.equal((await cold.handle({ action: 'detail', id: 'ip13:123', query: '鸡翅' })).recipe.id, 'ip13:123')
})
test('空结果、无权限和网络失败分别返回可识别状态，不暴露密钥', async () => {
  for (const [fetchJson, expected] of [[async () => ({ code: 200, data: [] }), null], [async () => ({ code: 403, msg: 'test-secret invalid' }), 'UPSTREAM_AUTH'], [async () => { throw new Error('test-secret connection') }, 'UPSTREAM_UNAVAILABLE']]) {
    const service = createRecipeService({ getKey: () => 'test-secret', fetchJson })
    const result = await service.handle({ action: 'search', query: '鸡翅' })
    assert.equal(result.error?.code || null, expected)
    assert.ok(!JSON.stringify(result).includes('test-secret'))
    if (!expected) assert.deepEqual(result.recipes, [])
  }
})
test('客户端发出在线查询并能从详情直链重新请求，不依赖本地菜谱', async () => {
  const calls = []; const recipe = normalizeRecipe(raw(), '鸡翅')
  const client = createRecipeClient(async data => { calls.push(data); return data.action === 'search' ? { ok: true, recipes: [recipe], query: '鸡翅' } : { ok: true, recipe } })
  assert.equal((await client.search('鸡翅')).recipes[0].id, 'ip13:123')
  assert.equal((await client.detail('ip13:123', '鸡翅')).id, 'ip13:123')
  assert.equal(calls.length, 1)
  const fresh = createRecipeClient(async data => { calls.push(data); return { ok: true, recipe } })
  await fresh.detail('ip13:123', '鸡翅'); assert.equal(calls[1].action, 'detail')
})
test('客户端拒绝接口失败，不静默替换成本地数据', async () => {
  const client = createRecipeClient(async () => ({ ok: false, error: { code: 'UPSTREAM_UNAVAILABLE', message: '菜谱暂时没加载出来，请重试' } }))
  await assert.rejects(client.search('鸡翅'), /菜谱暂时没加载出来/)
})
test('供应商用400和空字符串表示无菜谱时，页面收到空列表而非网络错误', async () => {
  const service = createRecipeService({ getKey: () => 'test-secret', fetchJson: async () => ({ code: '400', count: 0, msg: '未找到相关的菜谱', data: '' }) })
  const result = await service.handle({ action: 'search', query: '不存在的菜' })
  assert.equal(result.ok, true); assert.deepEqual(result.recipes, [])
})
test('微信原始路由参数解码后保存，日记再次打开仍是同一在线ID', () => {
  const { decodeRouteParam } = require('../src/services/route.ts')
  const fromRecipePage = encodeURIComponent('ip13:1426735')
  const storedId = decodeRouteParam(fromRecipePage)
  const diaryLink = encodeURIComponent(storedId)
  assert.equal(storedId, 'ip13:1426735')
  assert.equal(decodeRouteParam(diaryLink), 'ip13:1426735')
  assert.equal(decodeRouteParam('ip13:1426735'), 'ip13:1426735')
  assert.equal(decodeRouteParam('%bad%'), '%bad%')
})
test('只有一串食材名却没有用量的菜谱不算完整用料', () => {
  const r = raw(); r.main_ingredients.forEach(row => { row.shuliang = '' })
  assert.equal(isUsableRecipe(normalizeRecipe(r, '鸡翅')), false)
})
