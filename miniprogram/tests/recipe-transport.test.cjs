const test = require('node:test'), assert = require('node:assert/strict'), ts = require('typescript')
require.extensions['.ts'] = (module, file) => module._compile(ts.transpile(require('fs').readFileSync(file, 'utf8'), { module: ts.ModuleKind.CommonJS }), file)
const { createRecipeTransport } = require('../src/services/recipe-transport.ts')
test('本机开发只请求代理，不初始化或调用云环境', async () => {
  const calls = []
  const send = createRecipeTransport({ useHttp: true, base: 'http://127.0.0.1:4186', cloudEnv: '' }, { request: async data => { calls.push(data); return { statusCode: 200, data: { ok: true } } }, cloud: { init: () => assert.fail('must not init cloud'), callFunction: () => assert.fail('must not call cloud') } })
  assert.equal((await send({ action: 'search', query: '鸡翅' })).ok, true)
  assert.equal(calls[0].url, 'http://127.0.0.1:4186/api/recipes')
})
test('未指定云环境时返回配置状态，禁止盲调默认环境', async () => {
  const send = createRecipeTransport({ useHttp: false, base: '', cloudEnv: '' }, { cloud: { init: () => assert.fail('must not init default cloud'), callFunction: () => assert.fail('must not call default cloud') } })
  const result = await send({ action: 'search' })
  assert.equal(result.ok, false); assert.equal(result.error.code, 'NOT_CONFIGURED')
})
test('云函数初始化及调用都显式指定环境，初始化只执行一次', async () => {
  const calls = []
  const send = createRecipeTransport({ useHttp: false, base: '', cloudEnv: 'test-env' }, { cloud: { init: data => calls.push(['init', data]), callFunction: async data => { calls.push(['call', data]); return { result: { ok: true } } } } })
  await send({ action: 'search' }); await send({ action: 'search' })
  assert.equal(calls[0][1].env, 'test-env'); assert.equal(calls[1][1].config.env, 'test-env')
  assert.equal(calls.filter(row => row[0] === 'init').length, 1)
})
