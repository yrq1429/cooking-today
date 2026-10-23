import type { RecipeRequest } from './recipe-client'

interface Options { useHttp: boolean; base: string; cloudEnv: string }
interface Runtime {
  request?: (options: any) => Promise<any>
  cloud?: { init: (options: any) => any; callFunction: (options: any) => Promise<any> }
}
export function createRecipeTransport(options: Options, runtime: Runtime) {
  let initialized = false
  return async (data: RecipeRequest) => {
    if (options.useHttp) {
      const response = await runtime.request!({ url: `${options.base}/api/recipes`, method: 'POST', data, timeout: 25000, header: { 'Content-Type': 'application/json' } })
      if (response.statusCode !== 200) throw new Error('Recipe request failed')
      return response.data
    }
    if (!options.cloudEnv) return { ok: false, error: { code: 'NOT_CONFIGURED', message: '菜谱服务尚未连接，请稍后再试' } }
    if (!initialized) { runtime.cloud!.init({ env: options.cloudEnv, traceUser: false }); initialized = true }
    const response = await runtime.cloud!.callFunction({ name: 'recipes', config: { env: options.cloudEnv }, data })
    return response.result
  }
}
