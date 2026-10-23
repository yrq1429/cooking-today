import { useEffect, useState } from 'react'
import { View, Text, Image } from '@tarojs/components'
import { Recipe } from '../types'
import './RecipeCover.css'

export default function RecipeCover({ recipe, height = 330 }: { recipe: Recipe; height?: number }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [recipe.id, recipe.cover])
  return <View className='cover' style={{ height: `${height}rpx` }}>
    {recipe.cover && !failed
      ? <Image className='cover__img' src={recipe.cover} mode='aspectFill' lazyLoad onError={() => setFailed(true)} />
      : <View className='cover__empty'><Text className='cover__line' /><Text>图片暂未加载</Text></View>}
  </View>
}
