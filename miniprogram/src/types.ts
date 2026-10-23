export interface Ingredient {
  name: string
  amount: string
}

export interface Recipe {
  id: string
  name: string
  searchQuery?: string
  duration?: string
  difficultyLabel?: string
  cover?: string
  source?: { name: string; url: string; license?: string }
  stepImages?: Record<number, string>
  gallery?: string[]
  ingredientNote?: string
  tips?: string[]
  desc?: string           // 一句话简介
  category: string        // 荤菜/素菜/汤/主食/凉菜/甜品
  cuisine: string         // 川/粤/家常...
  ingredients: Ingredient[]
  steps: string[]
  taste_tags: string[]    // 辣/清淡/酸甜/咸鲜/香辣/酸甜辣...
  scene_tags: string[]    // 快手菜/下饭菜/一人食/孩子爱吃/宴客...
  difficulty: number      // 1-5
  time_minutes: number
  servings: number
  nutrition: { calories: number; note: string }  // 估算值
}

export interface Checkin {
  id: string
  title: string           // 菜名(自由填写,可不来自菜谱)
  photos?: string[]
  photo: string           // 本地持久化文件路径(线上版为云存储 fileID)
  date: string            // YYYY-MM-DD
  note: string
  recipeQuery?: string
  recipeId?: string       // 可选:关联菜谱
  createdAt: number
}
