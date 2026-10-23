/* Browser bridge for reviewing the actual Taro page components. No recipe fixtures. */
import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
const filesPrefix = 'cooking-preview-file:'
const styleForBrowser = (style: any) => style ? Object.fromEntries(Object.entries(style).map(([key, value]) => [key, typeof value === 'string' && value.endsWith('rpx') ? `${parseFloat(value) / 2}px` : value])) : undefined
export const View = ({ children, style, ...props }: any) => {
  const node = <div {...props} style={styleForBrowser(style)}>{children}</div>
  const layer = document.getElementById('overlays')
  return layer && /(?:compose-fab|recipe__footer|edit__footer)/.test(props.className || '') ? createPortal(node, layer) : node
}
export const Text = ({ children, userSelect, ...props }: any) => <span {...props}>{children}</span>
export const Image = ({ mode, lazyLoad, src, ...props }: any) => <img {...props} src={src?.startsWith('/browser-diary/') ? localStorage.getItem(filesPrefix + src) || '' : src} loading={lazyLoad ? 'lazy' : 'eager'} style={{ ...props.style, objectFit: mode === 'aspectFill' ? 'cover' : 'contain', height: mode === 'widthFix' ? 'auto' : undefined }} />
export const ScrollView = ({ scrollX, showScrollbar, ...props }: any) => <div {...props} style={{ overflowX: 'auto', ...props.style }} />
export const Input = ({ onInput, onConfirm, confirmType, maxlength, ...props }: any) => <input {...props} maxLength={maxlength} onChange={event => onInput?.({ detail: { value: event.target.value } })} onKeyDown={event => event.key === 'Enter' && onConfirm?.({ detail: { value: event.currentTarget.value } })} />
export const Textarea = ({ onInput, autoHeight, maxlength, ...props }: any) => <textarea {...props} maxLength={maxlength} onChange={event => onInput?.({ detail: { value: event.target.value } })} />
export const Button = ({ loading, ...props }: any) => <button {...props} />
export const useDidShow = (fn: any) => useEffect(() => { fn() }, [])
export const useDidHide = () => {}
export const useUnload = () => {}
export const useRouter = () => ({ params: Object.fromEntries(new URLSearchParams(location.search)) })
const go = (url: string) => { const [route, query] = url.split('?'); location.href = `/?page=${route.split('/')[2]}${query ? '&' + query : ''}` }
const Taro = {
  request: async ({ url, data, method, timeout }: any) => {
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeout || 25000)
    try { const response = await fetch(url, { method: method || 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), signal: controller.signal }); return { statusCode: response.status, data: await response.json() } }
    finally { clearTimeout(timer) }
  },
  getStorageSync: (key: string) => { try { return JSON.parse(localStorage.getItem('cooking-preview:' + key) || 'null') } catch { return null } },
  setStorageSync: (key: string, value: any) => localStorage.setItem('cooking-preview:' + key, JSON.stringify(value)),
  navigateTo: ({ url }: any) => go(url), switchTab: ({ url }: any) => go(url), redirectTo: ({ url }: any) => go(url),
  previewImage: ({ current }: any) => window.open(current?.startsWith('/browser-diary/') ? localStorage.getItem(filesPrefix + current) || '' : current, '_blank'),
  setKeepScreenOn: async () => {}, setClipboardData: ({ data }: any) => navigator.clipboard.writeText(data),
  showToast: ({ title }: any) => { const toast = document.createElement('div'); toast.textContent = title; toast.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#333e;color:white;padding:12px 20px;border-radius:9px;z-index:999;font-size:14px'; document.body.append(toast); setTimeout(() => toast.remove(), 2500) },
  env: { USER_DATA_PATH: '/browser-diary' },
  getFileSystemManager: () => ({ copyFile: ({ srcPath, destPath, success, fail }: any) => { try { localStorage.setItem(filesPrefix + destPath, srcPath); success() } catch (error) { fail(error) } }, unlink: ({ filePath, success }: any) => { localStorage.removeItem(filesPrefix + filePath); success() } }),
  chooseMedia: ({ count }: any) => new Promise((resolve, reject) => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.multiple = count > 1
    input.oncancel = () => reject({ errMsg: 'cancel' })
    input.onchange = async () => {
      const files = Array.from(input.files || []).slice(0, count)
      const tempFiles = await Promise.all(files.map(file => new Promise(resolveFile => { const reader = new FileReader(); reader.onload = () => resolveFile({ tempFilePath: reader.result }); reader.readAsDataURL(file) })))
      resolve({ tempFiles })
    }
    input.click()
  })
}
export default Taro
