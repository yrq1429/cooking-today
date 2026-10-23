import Taro from '@tarojs/taro'
import { createRecipeClient } from './recipe-client'
import { createRecipeTransport } from './recipe-transport'

const client = createRecipeClient(createRecipeTransport({
  base: typeof __RECIPE_API_BASE__ === 'string' ? __RECIPE_API_BASE__ : '',
  useHttp: typeof __RECIPE_USE_HTTP__ !== 'undefined' && __RECIPE_USE_HTTP__,
  cloudEnv: typeof __RECIPE_CLOUD_ENV__ === 'string' ? __RECIPE_CLOUD_ENV__ : ''
}, Taro))
export const searchOnlineRecipes = client.search
export const loadOnlineRecipe = client.detail
