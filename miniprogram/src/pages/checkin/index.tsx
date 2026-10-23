import { useState } from 'react'
import { View, Text, Image, ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { getCheckins } from '../../services/storage'
import { checkinPhotos, diaryEntries, diaryMonths } from '../../services/diary'
import { Checkin } from '../../types'
import './index.css'

export default function Diary() {
  const [entries, setEntries] = useState<Checkin[]>([])
  const [month, setMonth] = useState('')
  useDidShow(() => setEntries(getCheckins()))
  const months = diaryMonths(entries)
  const visible = diaryEntries(entries, month)
  const days = new Set(entries.map(entry => entry.date)).size
  const compose = () => Taro.navigateTo({ url: '/pages/checkin-edit/index' })
  return <View className='page diary'>
    <View className='diary__header'><Text className='eyebrow'>自己的烟火，值得记录</Text><Text className='page-title'>我的开火日记</Text><Text className='subtitle'>{entries.length ? `${days} 个好好吃饭的日子，${entries.length} 份生活的小满足。` : '不必做得多厉害，认真吃饭就很可爱。'}</Text><Text className='diary__private'>仅自己可见 · 记录保存在本机</Text></View>
    <View className='diary__compose' onClick={compose}><View className='diary__compose-icon'><View className='camera-icon' /></View><View><Text className='diary__compose-title'>今天吃了什么？</Text><Text className='diary__compose-sub'>拍张照，记下这一餐的好滋味</Text></View><Text className='diary__arrow'>↗</Text></View>
    {!!entries.length && <ScrollView scrollX className='diary__months' showScrollbar={false}><View className='diary__month-row'><Text className={`diary__month ${!month ? 'diary__month--on' : ''}`} onClick={() => setMonth('')}>全部日记</Text>{months.map(m => <Text key={m} className={`diary__month ${m === month ? 'diary__month--on' : ''}`} onClick={() => setMonth(m)}>{m.replace('-', '年')}月</Text>)}</View></ScrollView>}
    <View className='diary__feed'>{visible.map((entry, index) => {
      const photos = checkinPhotos(entry)
      const showDate = index === 0 || visible[index - 1].date !== entry.date
      return <View key={entry.id} className='moment'>
        <View className='moment__date'>{showDate && <><Text className='moment__day'>{entry.date.slice(8)}</Text><Text className='moment__month'>{Number(entry.date.slice(5, 7))}月</Text><Text className='moment__year'>{entry.date.slice(0, 4)}</Text></>}</View>
        <View className='moment__body'>
          <View className='moment__byline'><View className='moment__avatar'><Text>我</Text></View><View><Text className='moment__author'>我的小厨房</Text><Text className='moment__time'>{new Date(entry.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })} · 好好吃饭的一天</Text></View></View>
          {entry.title && <Text className='moment__title'>{entry.title}</Text>}
          {entry.note && <Text className='moment__note' userSelect>{entry.note}</Text>}
          <View className={`moment__photos moment__photos--${photos.length === 1 ? 'single' : photos.length === 4 ? 'four' : 'grid'}`}>
            {photos.map((photo, i) => <Image key={`${photo}-${i}`} className='moment__photo' src={photo} mode='aspectFill' lazyLoad onClick={() => Taro.previewImage({ current: photo, urls: photos })} />)}
          </View>
          {entry.recipeId && <Text className='moment__recipe' onClick={() => Taro.navigateTo({ url: `/pages/recipe/index?id=${encodeURIComponent(entry.recipeId!)}&query=${encodeURIComponent(entry.recipeQuery || entry.title || '')}` })}>查看这餐的菜谱 ↗</Text>}
          <Text className='moment__signature'>一餐一记，都是生活。</Text>
        </View>
      </View>
    })}</View>
    {!entries.length && <View className='empty diary__empty'><Text className='empty__mark'>“</Text><Text className='empty__title'>第一餐，从今天开始</Text><Text className='empty__text'>一碗热面，一桌家常菜。{ '\n' }那些认真生活的瞬间，都值得留下来。</Text><Text className='diary__start' onClick={compose}>记下我的第一餐 →</Text></View>}
    {!!entries.length && !visible.length && <View className='empty'><Text className='empty__text'>这个月还没有日记</Text></View>}
    {!!visible.length && <Text className='diary__end'>日子有滋味，回忆有迹可循。</Text>}
    {!!entries.length && <View className='compose-fab' onClick={compose}><View className='camera-icon' /><Text>记一餐</Text></View>}
  </View>
}
