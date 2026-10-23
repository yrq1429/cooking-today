import { useEffect, useState } from 'react'
import { View, Text, Button, Image } from '@tarojs/components'
import Taro, { useRouter, useDidHide, useUnload } from '@tarojs/taro'
import { loadOnlineRecipe, searchOnlineRecipes } from '../../services/recipes'
import legacyNames from '../../data/legacy-recipe-names.json'
import { Recipe } from '../../types'
import RecipeCover from '../../components/RecipeCover'
import { decodeRouteParam } from '../../services/route'
import './index.css'

export default function RecipeDetail() {
  const { params } = useRouter()
  const id = decodeRouteParam(params.id)
  const query = decodeRouteParam(params.query)
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true); setError(''); setRecipe(null)
    const read = async () => {
      if (id.startsWith('ip13:')) return loadOnlineRecipe(id, query)
      const oldName = (legacyNames as Record<string, string>)[id]
      if (!oldName) throw new Error('这道菜暂时找不到了，返回搜索试试')
      const result = await searchOnlineRecipes(oldName)
      const online = result.recipes.find(row => row.name === oldName) || result.recipes[0]
      if (!online) throw new Error('暂时没找到这道菜的图文做法，返回搜索试试')
      return online
    }
    read().then(value => { if (active) { setRecipe(value); setLoading(false) } }).catch(cause => { if (active) { setError(cause.message); setLoading(false) } })
    return () => { active = false }
  }, [id, query, refresh])
  const [checked, setChecked] = useState<string[]>([])
  const [cooking, setCooking] = useState(false)
  const releaseScreen = () => { if (cooking) { Taro.setKeepScreenOn({ keepScreenOn: false }).catch(() => undefined); setCooking(false) } }
  useDidHide(releaseScreen)
  useUnload(releaseScreen)
  if (loading) return <View className='empty'><Text className='empty__title'>正在打开图文菜谱…</Text><Text className='empty__text'>食材、做法和步骤图片马上就好</Text></View>
  if (!recipe) return <View className='empty'><Text className='empty__title'>菜谱暂时没加载出来</Text><Text className='empty__text'>{error || '返回搜索，看看别的好味道。'}</Text><Button className='btn-primary' onClick={() => setRefresh(value => value + 1)}>重试</Button><Text className='recipe__back' onClick={() => Taro.switchTab({ url: '/pages/home/index' })}>返回搜菜谱 →</Text></View>
  const preview = (photo: string) => Taro.previewImage({ current: photo, urls: recipe.gallery?.length ? recipe.gallery : [photo] })
  const toggleCooking = async () => {
    const next = !cooking
    try { await Taro.setKeepScreenOn({ keepScreenOn: next }); setCooking(next) }
    catch { Taro.showToast({ title: '暂时无法设置常亮，请稍后再试', icon: 'none' }) }
  }
  return <View className='recipe'>
    <View className='recipe__hero' onClick={() => recipe.cover && preview(recipe.cover)}><RecipeCover recipe={recipe} height={570} /></View>
    <View className='recipe__content'>
      <View className='recipe__intro'><Text className='eyebrow'>在线图文 · {recipe.category}</Text><Text className='recipe__name'>{recipe.name}</Text>{recipe.desc && <Text className='recipe__desc'>{recipe.desc}</Text>}<View className='recipe__meta'><View><Text className='recipe__meta-main recipe__meta-main--small'>{recipe.duration || '见步骤'}</Text><Text className='recipe__meta-label'>原文用时</Text></View><View><Text className='recipe__meta-main recipe__meta-main--small'>{recipe.difficultyLabel || '见做法'}</Text><Text className='recipe__meta-label'>原文难度</Text></View><View><Text className='recipe__meta-main'>{recipe.steps.length}步</Text><Text className='recipe__meta-label'>每步都有配图</Text></View></View></View>
      <View className='recipe__section'><View className='recipe__section-head'><Text className='section-title'>准备食材</Text><Text className='recipe__hint'>点一下，备好一项</Text></View>{recipe.ingredientNote && <Text className='recipe__ingredient-note'>{recipe.ingredientNote}</Text>}{recipe.ingredients.map((ingredient, i) => {
        const key = `${i}`; const done = checked.includes(key)
        return <View key={key} className={`recipe__ingredient ${done ? 'recipe__ingredient--done' : ''}`} onClick={() => setChecked(previous => done ? previous.filter(x => x !== key) : previous.concat(key))}><View className='recipe__checkbox'>{done && <Text>✓</Text>}</View><Text className='recipe__ingredient-name'>{ingredient.name}</Text><Text className='recipe__ingredient-amount'>{ingredient.amount}</Text></View>
      })}</View>
      <View className='recipe__section'><View className='recipe__section-head'><Text className='section-title'>开始下厨</Text><Text className={`recipe__screen ${cooking ? 'recipe__screen--on' : ''}`} onClick={toggleCooking}>{cooking ? '屏幕常亮中 ✓' : '开启屏幕常亮'}</Text></View>{recipe.steps.map((step, i) => <View className='recipe__step' key={i}><Text className='recipe__step-number'>{String(i + 1).padStart(2, '0')}</Text><View className='recipe__step-body'><Text className='recipe__step-text' userSelect>{step}</Text>{recipe.stepImages?.[i] && <Image className='recipe__step-image' src={recipe.stepImages[i]} mode='widthFix' lazyLoad onClick={() => preview(recipe.stepImages![i])} />}</View></View>)}</View>
      {!!recipe.tips?.length && <View className='recipe__tips'><Text className='recipe__tips-title'>下厨小贴士</Text>{recipe.tips.map((tip, i) => <Text className='recipe__tip' key={i}>{tip}</Text>)}</View>}
      {recipe.source && <View className='recipe__source' onClick={() => Taro.setClipboardData({ data: recipe.source!.url })}><Text>菜谱与图片来自 {recipe.source.name}</Text><Text>点击复制菜谱来源链接 ↗</Text></View>}
      <Text className='recipe__end'>做完别忘了，给今天留一张照片。</Text>
    </View>
    <View className='recipe__footer'><Button className='btn-primary' onClick={() => Taro.navigateTo({ url: `/pages/checkin-edit/index?name=${encodeURIComponent(recipe.name)}&recipeId=${encodeURIComponent(recipe.id)}&recipeQuery=${encodeURIComponent(recipe.searchQuery || query)}` })}>做了这道，记一餐</Button></View>
  </View>
}
