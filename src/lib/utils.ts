import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { differenceInDays, differenceInHours } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getDaysInRecon(enteredAt: string): number {
  return differenceInDays(new Date(), new Date(enteredAt))
}

export function getHoursInStage(stageEnteredAt: string): number {
  return differenceInHours(new Date(), new Date(stageEnteredAt))
}

export function formatDaysHours(enteredAt: string): string {
  const hours = getHoursInStage(enteredAt)
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  if (days === 0) return `${remainingHours}h`
  if (remainingHours === 0) return `${days}d`
  return `${days}d ${remainingHours}h`
}

export function formatDays(days: number): string {
  if (days === 0) return '< 1d'
  return `${days}d`
}

export function formatMileage(mileage: number | null | undefined): string {
  if (mileage == null) return '—'
  return mileage.toLocaleString()
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount)
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    in_recon: 'In Recon', front_line_ready: 'Front Line Ready',
    sold: 'Sold', wholesale: 'Wholesale', archived: 'Archived',
  }
  return map[status] || status
}
