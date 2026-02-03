const TIMEZONE = "America/Sao_Paulo"

export function getTodayLocal(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TIMEZONE })
}

export function getYesterdayLocal(): string {
  const todayStr = getTodayLocal()
  const [y, m, d] = todayStr.split("-").map(Number)
  const yesterday = new Date(Date.UTC(y, m - 1, d - 1))
  return yesterday.toISOString().slice(0, 10)
}

export function dateStringToUtcStartOfDay(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00.000Z")
}
