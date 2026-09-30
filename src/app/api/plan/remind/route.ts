import { db } from '@/lib/db'
import { ok, requireUser } from '@/lib/api-helpers'

const SLOT_LABELS: Record<string, string> = {
  BREAKFAST: 'Desayuno',
  LUNCH: 'Comida',
  DINNER: 'Cena',
  SNACK: 'Snack',
}
const SLOT_ORDER = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']

/**
 * POST /api/plan/remind — recordatorio diario del menú.
 *
 * Llamado por el widget «Tu menú de hoy» al abrir la aplicación. Si el usuario
 * tiene recetas planificadas para hoy y todavía no se le ha recordado hoy,
 * crea una notificación tipo PLAN con el resumen del menú del día. El
 * deduplicado diario evita notificaciones repetidas (máximo 1 por día).
 */
export async function POST() {
  const auth = await requireUser()
  if (auth.error) return auth.error

  // Día actual con lunes = 0 (misma convención que el planificador).
  const now = new Date()
  const today = (now.getDay() + 6) % 7
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const items = await db.mealPlanItem.findMany({
    where: { userId: auth.user.id, day: today },
    include: { recipe: { select: { title: true } } },
    orderBy: [{ createdAt: 'asc' }],
  })

  if (items.length === 0) {
    return ok({ created: false, reason: 'EMPTY_TODAY' as const })
  }

  const already = await db.notification.findFirst({
    where: {
      userId: auth.user.id,
      type: 'PLAN',
      createdAt: { gte: startOfToday },
    },
    select: { id: true },
  })

  if (already) {
    return ok({ created: false, reason: 'ALREADY_NOTIFIED' as const })
  }

  const ordered = SLOT_ORDER.map((slot) => ({
    slot,
    label: SLOT_LABELS[slot],
    recipe: items.find((it) => it.slot === slot)?.recipe.title ?? null,
  })).filter((s) => s.recipe !== null)

  const body = ordered.map((s) => `${s.label}: ${s.recipe}`).join(' · ')

  const notification = await db.notification.create({
    data: {
      userId: auth.user.id,
      type: 'PLAN',
      title: 'Tu menú de hoy',
      body,
      linkView: 'plan',
      linkId: null,
    },
  })

  return ok({
    created: true,
    notification: {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      linkView: notification.linkView,
      linkId: notification.linkId,
      read: notification.read,
      createdAt: notification.createdAt.toISOString(),
    },
  })
}
