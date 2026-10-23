import { useEffect, useState } from 'react'
import { View, Text, ScrollView, Input, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { searchOnlineRecipes } from '../../services/recipes'
import { Recipe } from '../../types'
import RecipeCover from '../../components/RecipeCover'
import './index.css'

const TOPICS = ['推荐', '下饭菜', '快手菜', '鸡翅', '豆腐', '汤', '面条']
export default function Home() {
  const [topic, setTopic] = useState('推荐')
  const [query, setQuery] = useState('')
  const [list, setList] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [resolvedQuery, setResolvedQuery] = useState('')
  const term = query.trim() || (topic === '推荐' ? '家常菜' : topic)
  useEffect(() => {
    let active = true
    setLoading(true); setError(''); setList([])
    const timer = setTimeout(() => {
      searchOnlineRecipes(term).then(result => {
        if (!active) return
        setList(result.recipes); setResolvedQuery(result.query); setLoading(false)
      }).catch(cause => {
        if (!active) return
        setError(cause.message || '菜谱暂时没加载出来，请重试'); setLoading(false)
      })
    }, query.trim() ? 450 : 0)
    return () => { active = false; clearTimeout(timer) }
  }, [term, refresh])
  const open = (recipe: Recipe) => Taro.navigateTo({ url: `/pages/recipe/index?id=${encodeURIComponent(recipe.id)}&query=${encodeURIComponent(recipe.searchQuery || resolvedQuery)}` })
  const featured = list[0]
  const browsing = !query.trim() && topic === '推荐' && !loading && !error && featured
  return <View className='page home'>
    <View className='home__header'><Text className='eyebrow'>一日三餐 · 好好吃饭</Text><Text className='page-title'>今天，开火了吗？</Text><Text className='subtitle'>找一道想吃的菜，跟着图文慢慢做。</Text></View>
    <View className='home__search'>
      <View className='home__search-icon' />
      <Input className='home__search-input' placeholder='搜菜名，如可乐鸡翅、糖醋排骨' value={query} onInput={e => setQuery(e.detail.value)} onConfirm={() => setRefresh(value => value + 1)} confirmType='search' maxlength={40} />
      {query && <Text className='home__clear' onClick={() => setQuery('')}>清除</Text>}
    </View>
    <ScrollView scrollX className='home__categories' showScrollbar={false}><View className='home__category-row'>{TOPICS.map(value => <Text key={value} className={`home__category ${!query.trim() && topic === value ? 'home__category--on' : ''}`} onClick={() => { setTopic(value); setQuery('') }}>{value}</Text>)}</View></ScrollView>
    {browsing && <View className='home__feature' onClick={() => open(featured)}><RecipeCover recipe={featured} height={440} /><View className='home__feature-shade' /><View className='home__feature-copy'><Text className='home__feature-label'>今日餐桌灵感 · 图文做法</Text><Text className='home__feature-title'>{featured.name}</Text><Text className='home__feature-desc'>{featured.steps.length} 个步骤，每一步都有实拍参考</Text></View><Text className='home__feature-link'>跟着做 ↗</Text></View>}
    <View className='home__section-head'><Text className='section-title'>{query.trim() ? '找到这些好味道' : '把家常菜做好吃'}</Text><Text className='home__online'>在线图文菜谱</Text></View>
    {loading && <View className='home__loading'><View className='home__loading-dot' /><Text>正在找「{term}」的图文做法…</Text></View>}
    {error && <View className='empty'><Text className='empty__title'>这次没有加载出来</Text><Text className='empty__text'>{error}</Text><Button className='btn-primary' onClick={() => setRefresh(value => value + 1)}>重新加载</Button></View>}
    {!loading && !error && <>
      <View className='home__grid'>{list.map(recipe => <View className='recipe-card' key={recipe.id} onClick={() => open(recipe)}><RecipeCover recipe={recipe} height={310} /><View className='recipe-card__body'><Text className='recipe-card__name'>{recipe.name}</Text><Text className='recipe-card__desc'>{recipe.duration || '跟着步骤慢慢做'}</Text><View className='recipe-card__meta'><Text>{recipe.steps.length}步做法</Text><Text className='recipe-card__photo-count'>{Object.keys(recipe.stepImages || {}).length}张步骤图</Text></View></View></View>)}</View>
      {!list.length && <View className='empty'><Text className='empty__title'>换个菜名试试看</Text><Text className='empty__text'>暂时没有找到用料完整、带步骤图的做法。{ '\n' }试试「可乐鸡翅」「红烧肉」或「番茄炒蛋」。</Text><Text className='home__reset' onClick={() => { setQuery(''); setTopic('推荐') }}>看看家常菜 →</Text></View>}
      {!!list.length && <Text className='home__end'>{list.length} 份「{resolvedQuery}」图文做法{ '\n' }已优先筛选完整用料和步骤配图</Text>}
    </>}
    <View className='compose-fab' onClick={() => Taro.navigateTo({ url: '/pages/checkin-edit/index' })}><View className='camera-icon' /><Text>记一餐</Text></View>
  </View>
}
