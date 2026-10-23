import { useRef, useState } from 'react'
import { View, Text, Image, Input, Textarea, Button } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { addCheckin, todayStr } from '../../services/storage'
import { persistPhotos, validatePost } from '../../services/diary'
import { decodeRouteParam } from '../../services/route'
import './index.css'

export default function CheckinEdit() {
  const { params } = useRouter()
  const [photos, setPhotos] = useState<string[]>([])
  const [title, setTitle] = useState(() => decodeRouteParam(params.name))
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [posted, setPosted] = useState(false)
  const busy = useRef(false)
  const completed = useRef(false)
  const picking = useRef(false)
  const pickPhotos = async () => {
    if (busy.current || completed.current || picking.current || photos.length >= 9) return
    picking.current = true
    try {
      const res = await Taro.chooseMedia({ count: 9 - photos.length, mediaType: ['image'], sourceType: ['album', 'camera'], sizeType: ['compressed'] })
      setPhotos(previous => previous.concat(res.tempFiles.map(file => file.tempFilePath)).slice(0, 9))
    } catch (error) {
      if (!String((error as { errMsg?: string }).errMsg || '').includes('cancel')) Taro.showToast({ title: '无法打开相机或相册，请检查权限', icon: 'none' })
    } finally { picking.current = false }
  }
  const save = async () => {
    if (completed.current) { Taro.switchTab({ url: '/pages/checkin/index' }); return }
    if (busy.current || picking.current) return
    const message = validatePost(photos)
    if (message) { Taro.showToast({ title: message, icon: 'none' }); return }
    busy.current = true
    setSaving(true)
    const fs = Taro.getFileSystemManager()
    const id = `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    let saved: string[] = []
    const remove = (path: string) => new Promise<void>((resolve, reject) => fs.unlink({ filePath: path, success: () => resolve(), fail: reject }))
    try {
      saved = await persistPhotos(photos, (path, index) => new Promise<string>((resolve, reject) => {
        const destination = `${Taro.env.USER_DATA_PATH}/${id}_${index}.${/\.png(?:$|\?)/i.test(path) ? 'png' : 'jpg'}`
        fs.copyFile({ srcPath: path, destPath: destination, success: () => resolve(destination), fail: reject })
      }), remove)
      addCheckin({ id, title: title.trim(), photo: saved[0], photos: saved, date: todayStr(), note: note.trim(), recipeId: decodeRouteParam(params.recipeId) || undefined, recipeQuery: decodeRouteParam(params.recipeQuery) || undefined, createdAt: Date.now() })
    } catch {
      await Promise.all(saved.map(path => remove(path).catch(() => undefined)))
      busy.current = false; setSaving(false)
      Taro.showToast({ title: '没有保存成功，请检查存储空间后重试', icon: 'none' })
      return
    }
    // Navigation failure must not delete photos belonging to the already-saved record.
    completed.current = true
    setPosted(true)
    Taro.showToast({ title: '这一餐，记下了', icon: 'success' })
    Taro.switchTab({ url: '/pages/checkin/index', fail: () => { busy.current = false; setSaving(false); Taro.showToast({ title: '已保存，可从日记查看', icon: 'none' }) } })
  }
  return <View className='page edit'>
    <Text className='eyebrow'>留住一餐的温度</Text><Text className='page-title'>今天也好好吃饭了</Text><Text className='subtitle'>分享给未来的自己，普通的一餐也值得记录。</Text>
    <Textarea className='edit__note' placeholder='这一餐，想说点什么…' value={note} onInput={e => setNote(e.detail.value)} maxlength={500} disabled={saving || posted} autoHeight />
    <View className='edit__photos'>{photos.map((photo, index) => <View className='edit__tile' key={`${photo}-${index}`}><Image className='edit__photo' src={photo} mode='aspectFill' onClick={() => Taro.previewImage({ current: photo, urls: photos })} /><View className='edit__remove' onClick={() => !busy.current && !completed.current && setPhotos(previous => previous.filter((_, i) => i !== index))}><Text>×</Text></View></View>)}
      {photos.length < 9 && <View className='edit__add' onClick={pickPhotos}><View className='camera-icon' /><Text>{photos.length ? '再加一张' : '拍照 / 选照片'}</Text></View>}
    </View>
    <Text className='edit__count'>{photos.length}/9 张照片 · 点击照片可预览</Text>
    <View className='edit__fields'><Text className='edit__label'>这一餐</Text><Input className='edit__title' placeholder='起个名字吧（选填）' value={title} onInput={e => setTitle(e.detail.value)} maxlength={40} disabled={saving || posted} /></View>
    <View className='edit__fields'><Text className='edit__label'>记录日期</Text><Text className='edit__date'>{todayStr().replace(/-/g, ' / ')}</Text></View>
    <View className='edit__privacy'><Text className='edit__privacy-dot' /><Text>仅自己可见，照片和文字保存在这台设备上</Text></View>
    <View className='edit__footer'><Button className='btn-primary' onClick={save} loading={saving} disabled={saving}>{saving ? '正在留住这一餐…' : posted ? '已保存，查看日记' : '存入我的日记'}</Button></View>
  </View>
}
