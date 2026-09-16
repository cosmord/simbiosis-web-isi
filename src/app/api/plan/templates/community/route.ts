import { db } from '@/lib/db'
import { ok, requireUser } from '@/lib/api-helpers'

/**
 * GET /api/plan/templates/community — galería de plantillas publicadas por
 * profesionales (nutricionistas, médicos/as y coordinación). Cualquier usuario
 * autenticado puede consultarla y aplicar una plantilla a su plan.
 */
export async function GET() {
  const auth = await requireUser()
  if (auth.error) return auth.error

  const templates = await db.planTemplate.findMany({
    where: { isPublic: true },
    include: { user: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return ok({
    templates: templates.map((t) => {
      let days: { day: number }[] = []
      try {
        const parsed: unknown = JSON.parse(t.days)
        if (Array.isArray(parsed)) days = parsed as { day: number }[]
      } catch {
        days = []
      }
      return {
        id: t.id,
        name: t.name,
        description: t.description,
        recipeCount: days.length,
        dayCount: new Set(days.map((d) => d.day)).size,
        appliedCount: t.appliedCount,
        createdAt: t.createdAt.toISOString(),
        author: {
          id: t.user.id,
          name: t.user.name,
          role: t.user.role,
        },
      }
    }),
  })
}
