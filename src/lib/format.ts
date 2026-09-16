import { formatDistanceToNow, format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Role, UserStatus } from './types'

/** "hace 2 días" a partir de una fecha ISO. */
export function relativeTime(iso: string): string {
  try {
    return formatDistanceToNow(parseISO(iso), { locale: es, addSuffix: true })
  } catch {
    return ''
  }
}

/** "12 de marzo de 2025". */
export function longDate(iso: string): string {
  try {
    return format(parseISO(iso), "d 'de' MMMM 'de' yyyy", { locale: es })
  } catch {
    return ''
  }
}

/** "12 mar 2025". */
export function shortDate(iso: string): string {
  try {
    return format(parseISO(iso), 'd MMM yyyy', { locale: es })
  } catch {
    return ''
  }
}

/** Fecha corta para ejes del gráfico: "12 mar". */
export function axisDate(iso: string): string {
  try {
    return format(parseISO(iso), 'd MMM', { locale: es })
  } catch {
    return ''
  }
}

/** Fecha ISO (yyyy-MM-dd) para <input type="date">. */
export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

/** Clases Tailwind por rol (colores sutiles, sin azules ni índigos). */
export const ROLE_COLORS: Record<Role, string> = {
  PATIENT: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  CAREGIVER: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  NUTRITIONIST: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300',
  DOCTOR: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
  COORDINATOR: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300',
}

export const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  ACTIVE: 'Activa',
  SUSPENDED: 'Suspendida',
}

export const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  ACTIVE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  SUSPENDED: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
}

export const PUBLISH_STATUS_LABELS: Record<string, string> = {
  PUBLISHED: 'Publicada',
  REMOVED: 'Retirada',
  VISIBLE: 'Visible',
}

/** Etiqueta descriptiva del nivel de síntomas (0-10). */
export function symptomLabel(value: number): string {
  if (value <= 0) return 'Sin síntomas'
  if (value <= 2) return 'Síntomas muy leves'
  if (value <= 4) return 'Síntomas leves'
  if (value <= 6) return 'Síntomas moderados'
  if (value <= 8) return 'Síntomas intensos'
  return 'Síntomas muy intensos'
}

/** Clases del badge de síntomas según severidad. */
export function symptomBadgeClass(value: number): string {
  if (value <= 2) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
  if (value <= 5) return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
  return 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
}

/** Formatea un número con coma decimal al estilo español. */
export function numEs(value: number, digits = 1): string {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value)
}
