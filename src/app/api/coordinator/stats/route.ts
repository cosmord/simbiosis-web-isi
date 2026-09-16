import { db } from '@/lib/db'
import { ok, requireCoordinator } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

// GET /api/coordinator/stats — resumen para el panel del coordinador:
// usuarios por rol/estado, contenidos y actividad de los últimos 14 días.
export async function GET() {
  const { error } = await requireCoordinator()
  if (error) return error

  const SINCE = new Date(Date.now() - 14 * 24 * 3600 * 1000)

  const [users, recipes, threads, publications, openReports, resolvedReports, recentUsers, recentRecipes, recentThreads] =
    await Promise.all([
      db.user.findMany({ select: { role: true, status: true } }),
      db.recipe.count({ where: { status: 'PUBLISHED' } }),
      db.thread.count({ where: { status: 'VISIBLE' } }),
      db.healthPublication.count({ where: { status: 'PUBLISHED' } }),
      db.report.count({ where: { status: 'OPEN' } }),
      db.report.count({ where: { status: { not: 'OPEN' } } }),
      db.user.findMany({ select: { createdAt: true }, where: { createdAt: { gte: SINCE } } }),
      db.recipe.findMany({ select: { createdAt: true }, where: { createdAt: { gte: SINCE } } }),
      db.thread.findMany({ select: { createdAt: true }, where: { createdAt: { gte: SINCE } } }),
    ])

  const byRole: Record<string, number> = {}
  const byStatus: Record<string, number> = {}
  for (const u of users) {
    byRole[u.role] = (byRole[u.role] ?? 0) + 1
    byStatus[u.status] = (byStatus[u.status] ?? 0) + 1
  }

  // Cubetas por día (00:00 local) para los últimos 14 días
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const DAY = 24 * 3600 * 1000
  const dayStarts = Array.from({ length: 14 }, (_, i) => startOfToday.getTime() - (13 - i) * DAY)
  const days = dayStarts.map((start) => ({
    date: new Date(start).toISOString().slice(0, 10),
    label: `${new Date(start).getDate()}/${new Date(start).getMonth() + 1}`,
    users: 0,
    recipes: 0,
    threads: 0,
  }))

  const bucketOf = (d: Date): number | null => {
    const t = d.getTime()
    for (let i = dayStarts.length - 1; i >= 0; i--) {
      if (t >= dayStarts[i] && t < dayStarts[i] + DAY) return i
    }
    return null
  }

  for (const u of recentUsers) {
    const i = bucketOf(u.createdAt)
    if (i !== null) days[i].users += 1
  }
  for (const r of recentRecipes) {
    const i = bucketOf(r.createdAt)
    if (i !== null) days[i].recipes += 1
  }
  for (const t of recentThreads) {
    const i = bucketOf(t.createdAt)
    if (i !== null) days[i].threads += 1
  }

  return ok({
    totals: {
      users: users.length,
      recipes,
      threads,
      publications,
      openReports,
      resolvedReports,
    },
    usersByRole: byRole,
    usersByStatus: byStatus,
    activity: days,
  })
}
