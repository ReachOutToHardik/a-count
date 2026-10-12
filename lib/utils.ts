import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { Transaction, MonthlyStats, CategoryStat } from '@/lib/types'

export function formatCurrency(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: string): string {
  try {
    return format(parseISO(date), 'dd MMM yyyy')
  } catch {
    return date
  }
}

export function formatDateShort(date: string): string {
  try {
    return format(parseISO(date), 'dd MMM')
  } catch {
    return date
  }
}

export function getMonthKey(date: string): string {
  try {
    return format(parseISO(date), 'yyyy-MM')
  } catch {
    return date.substring(0, 7)
  }
}

export function getMonthLabel(monthKey: string): string {
  try {
    return format(parseISO(monthKey + '-01'), 'MMM yyyy')
  } catch {
    return monthKey
  }
}

export function computeMonthlyStats(
  transactions: Transaction[] = [],
  months = 12
): MonthlyStats[] {
  const stats: Record<string, MonthlyStats> = {}
  const txList = transactions || []
  const now = new Date()

  // First, check if transactions exist and find their date range
  const validDates = txList
    .map(t => t?.date?.substring(0, 7))
    .filter((d): d is string => Boolean(d && d.length === 7))
    .sort()

  if (validDates.length > 0) {
    // If transactions span a specific window, ensure every transaction's month is present
    for (const key of Array.from(new Set(validDates))) {
      stats[key] = { month: key, income: 0, expense: 0, net: 0 }
    }
  } else {
    // Initialize default last N months
    for (let i = months - 1; i >= 0; i--) {
      const d = subMonths(now, i)
      const key = format(d, 'yyyy-MM')
      stats[key] = { month: key, income: 0, expense: 0, net: 0 }
    }
  }

  for (const tx of txList) {
    if (!tx?.date) continue
    const key = getMonthKey(tx.date)
    if (!stats[key]) {
      stats[key] = { month: key, income: 0, expense: 0, net: 0 }
    }
    if (tx.type === 'credit') {
      stats[key].income += (Number(tx.amount) || 0)
    } else {
      stats[key].expense += (Number(tx.amount) || 0)
    }
    stats[key].net = stats[key].income - stats[key].expense
  }

  return Object.values(stats).sort((a, b) => a.month.localeCompare(b.month))
}

export function computeCategoryStats(
  transactions: Transaction[] = [],
  tagColors: Record<string, string> = {}
): CategoryStat[] {
  const stats: Record<string, CategoryStat> = {}
  const txList = transactions || []

  for (const tx of txList) {
    if (!tx || tx.type !== 'debit') continue
    const tags = (Array.isArray(tx.tags) && tx.tags.length > 0) ? tx.tags : ['untagged']
    const primaryTag = tags[0]

    if (!stats[primaryTag]) {
      stats[primaryTag] = {
        tag: primaryTag,
        amount: 0,
        count: 0,
        color: tagColors[primaryTag] || '#6b7280',
      }
    }
    stats[primaryTag].amount += (Number(tx.amount) || 0)
    stats[primaryTag].count += 1
  }

  return Object.values(stats).sort((a, b) => b.amount - a.amount)
}

export { cn } from './cn'

export function truncate(str: string, n: number): string {
  return str.length > n ? str.slice(0, n - 1) + '…' : str
}

export function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}
