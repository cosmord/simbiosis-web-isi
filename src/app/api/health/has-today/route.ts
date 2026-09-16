import { db } from '@/lib/db'
import { ok, requireUser } from '@/lib/api-helpers'

/**
 * GET /api/health/has-today — indica si el usuario ya registró una entrada en su
 * diario de salud con fecha de hoy. Lo usa el planificador para proponer registrar
 * el día justo cuando marca una comida como «cocinada».
 */
export async function GET() {
  const auth = await requireUser()
  if (auth.error) return auth.error

  const now = new Date()
  const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

  // Las fechas del diario se guardan a medianoche (UTC): comparamos por día local
  // sobre los últimos registros para no depender de la zona horaria del servidor.
  const latest = await db.healthEntry.findMany({
    where: { userId: auth.user.id },
    orderBy: { date: 'desc' },
    take: 5,
    select: { date: true },
  })

  const hasToday = latest.some((e) => dayStart(e.date) === dayStart(now))

  return ok({ hasToday })
}
