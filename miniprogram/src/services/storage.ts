import Taro from '@tarojs/taro'
import { Checkin } from '../types'

const CHECKIN_KEY = 'checkins'

export function getCheckins(): Checkin[] {
  try {
    const stored = Taro.getStorageSync(CHECKIN_KEY)
    return Array.isArray(stored) ? stored : []
  } catch {
    return []
  }
}

export function addCheckin(c: Checkin) {
  const list = getCheckins()
  list.unshift(c)
  Taro.setStorageSync(CHECKIN_KEY, list)
}

export function todayStr(d = new Date()): string {
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}
