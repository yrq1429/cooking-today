// WeChat options retain URL encoding; the browser preview may already decode it.
export function decodeRouteParam(value: string | undefined): string {
  try { return decodeURIComponent(value || '') } catch { return value || '' }
}
