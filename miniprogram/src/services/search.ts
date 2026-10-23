import { Recipe } from '../types'

// 关键词搜索(语义搜索上线前的 V1 方案)
export function searchRecipes(recipes: Recipe[], query: string): Recipe[] {
  const q = query.trim()
  if (!q) return []
  const scored: { r: Recipe; s: number }[] = []
  for (const r of recipes) {
    let s = 0
    if (r.name.includes(q)) s += 10
    if (r.taste_tags.some(t => t.includes(q))) s += 5
    if (r.scene_tags.some(t => t.includes(q))) s += 5
    if (r.category.includes(q) || r.cuisine.includes(q)) s += 4
    if (r.ingredients.some(i => i.name.includes(q))) s += 3
    if (s > 0) scored.push({ r, s })
  }
  return scored.sort((a, b) => b.s - a.s).map(x => x.r)
}

export const HOT_WORDS = ['下饭', '快手菜', '清淡', '辣', '孩子爱吃', '甜品', '一人食']
