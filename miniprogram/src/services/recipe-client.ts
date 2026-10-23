import type { Recipe } from '../types'

export interface SearchResult { recipes: Recipe[]; query: string; filtered?: number; cached?: boolean }
export type RecipeRequest = { action: 'search' | 'detail'; query?: string; id?: string }
export function createRecipeClient(send: (data: RecipeRequest) => Promise<any>) {
  const viewed = new Map<string, { recipe: Recipe; at: number }>()
  const remember = (recipe: Recipe) => { viewed.set(recipe.id, { recipe, at: Date.now() }); if (viewed.size > 120) viewed.delete(viewed.keys().next().value) }
  async function invoke(data: RecipeRequest) {
    let response: any
    try { response = await send(data) } catch { throw new Error('菜谱暂时没加载出来，请检查网络后重试') }
    if (response?.ok !== true) throw new Error(response?.error?.message || '菜谱暂时没加载出来，请重试')
    return response
  }
  async function search(query: string): Promise<SearchResult> {
    const response = await invoke({ action: 'search', query: query.trim() })
    if (!Array.isArray(response.recipes)) throw new Error('菜谱返回异常，请重试')
    response.recipes.forEach(remember)
    return { recipes: response.recipes, query: response.query, filtered: response.filtered, cached: response.cached }
  }
  async function detail(id: string, query = ''): Promise<Recipe> {
    const cached = viewed.get(id)
    if (cached && Date.now() - cached.at < 15 * 60 * 1000) return cached.recipe
    const response = await invoke({ action: 'detail', id, query })
    if (!response.recipe || response.recipe.id !== id) throw new Error('这道菜暂时找不到了，返回搜索试试')
    remember(response.recipe); return response.recipe
  }
  return { search, detail }
}
