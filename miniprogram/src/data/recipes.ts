import { Recipe } from '../types'
import data from './open-recipes.json'
export const RECIPES = data as Recipe[]
export const CATEGORY_OPTIONS = ['荤菜', '素菜', '汤', '主食', '凉菜', '甜品']
