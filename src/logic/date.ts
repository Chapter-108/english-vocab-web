/** 返回设备本地日期的 YYYY-MM-DD（按本地时区 0 点归一）。 */
export function today(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 在 YYYY-MM-DD 上加 n 天，返回 YYYY-MM-DD。 */
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + n)
  return today(dt)
}

/** dueDate <= today 即到期。 */
export function isDue(dueDate: string, todayStr: string): boolean {
  return dueDate <= todayStr
}
