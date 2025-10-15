/**
 * Formats a transaction date into a relative label
 * Used for grouping transactions by day
 * - Today
 * - Yesterday
 * - Day of week (for dates within the past 7 days)
 * - Actual date (for dates older than 7 days)
 */
export function formatTransactionDateLabel(date: string | Date): string {
  const transactionDate = typeof date === 'string' ? new Date(date) : date
  const today = new Date()

  // Reset time to midnight for accurate day comparison
  today.setHours(0, 0, 0, 0)
  const compareDate = new Date(transactionDate)
  compareDate.setHours(0, 0, 0, 0)

  const diffMs = today.getTime() - compareDate.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  // Today
  if (diffDays === 0) {
    return 'Today'
  }

  // Yesterday
  if (diffDays === 1) {
    return 'Yesterday'
  }

  // Within the past 7 days: show day of week
  if (diffDays > 1 && diffDays < 7) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return dayNames[transactionDate.getDay()]
  }

  // Older than 7 days: show actual date
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = monthNames[transactionDate.getMonth()]
  const day = transactionDate.getDate()

  // Same year: just month and day
  if (transactionDate.getFullYear() === today.getFullYear()) {
    return `${month} ${day}${getDaySuffix(day)}`
  }

  // Different year: include year
  return `${month} ${day}${getDaySuffix(day)}, ${transactionDate.getFullYear()}`
}

export function formatExchangeRateTimestamp(date: string | Date): string {
  const rateDate = typeof date === 'string' ? new Date(date) : date
  const now = new Date()

  const diffMs = now.getTime() - rateDate.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  const hours = rateDate.getHours()
  const minutes = rateDate.getMinutes()
  const period = hours >= 12 ? 'pm' : 'am'
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  const timeString = `${displayHour}:${minutes.toString().padStart(2, '0')}${period}`

  if (diffMinutes < 1) {
    return 'just now'
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`
  }

  if (diffHours < 24 && rateDate.getDate() === now.getDate()) {
    return `today, ${timeString}`
  }

  if (diffDays === 1 || (diffHours < 48 && rateDate.getDate() === now.getDate() - 1)) {
    return `yesterday, ${timeString}`
  }

  if (diffDays < 7) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayName = dayNames[rateDate.getDay()]
    return `last ${dayName}, ${timeString}`
  }

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = monthNames[rateDate.getMonth()]
  const day = rateDate.getDate()

  if (rateDate.getFullYear() === now.getFullYear()) {
    return `${month} ${day}${getDaySuffix(day)}`
  }

  return `${month} ${day}${getDaySuffix(day)}, ${rateDate.getFullYear()}`
}

function getDaySuffix(day: number): string {
  if (day >= 11 && day <= 13) return 'th'
  switch (day % 10) {
    case 1: return 'st'
    case 2: return 'nd'
    case 3: return 'rd'
    default: return 'th'
  }
}