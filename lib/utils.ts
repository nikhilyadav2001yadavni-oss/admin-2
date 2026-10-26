import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-IN').format(num)
}

export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'text-success-600 bg-success-50',
    inactive: 'text-gray-600 bg-gray-50',
    suspended: 'text-danger-600 bg-danger-50',
    pending: 'text-warning-600 bg-warning-50',
    completed: 'text-success-600 bg-success-50',
    rejected: 'text-danger-600 bg-danger-50',
    failed: 'text-danger-600 bg-danger-50',
    win: 'text-success-600 bg-success-50',
    loss: 'text-danger-600 bg-danger-50',
  }
  return colors[status] || 'text-gray-600 bg-gray-50'
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
}
