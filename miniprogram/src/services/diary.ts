import type { Checkin } from '../types'

export function checkinPhotos(entry: Pick<Checkin, 'photo' | 'photos'>): string[] {
  return entry.photos?.length ? entry.photos : (entry.photo ? [entry.photo] : [])
}
export function diaryMonths(entries: Checkin[]): string[] {
  return Array.from(new Set(entries.map(entry => entry.date.slice(0, 7)))).sort().reverse()
}
export function diaryEntries(entries: Checkin[], month: string): Checkin[] {
  return entries.filter(entry => !month || entry.date.startsWith(month)).sort((a, b) => b.createdAt - a.createdAt)
}
export function validatePost(photos: string[]): string {
  return !photos.length ? '选几张今天的照片吧' : photos.length > 9 ? '最多选择9张照片' : ''
}
export async function persistPhotos(
  photos: string[], save: (path: string, index: number) => Promise<string>, remove: (path: string) => Promise<unknown>
): Promise<string[]> {
  const saved: string[] = []
  try {
    for (let i = 0; i < photos.length; i++) saved.push(await save(photos[i], i))
    return saved
  } catch (error) {
    await Promise.all(saved.map(path => remove(path).catch(() => undefined)))
    throw error
  }
}
