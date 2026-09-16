import { db } from '@/lib/db'
import { ok } from '@/lib/api-helpers'
import { getAuthUser } from '@/lib/auth'
import { serializeRecipe } from '@/lib/serialize'

/** Número de semana ISO (lunes como primer día) para rotar la receta destacada. */
function isoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

/**
 * GET /api/recipes/featured — receta destacada de la semana.
 *
 * Selección determinista y rotativa: entre las recetas PUBLISHED se ordena por
 * valoración media, favoritos y fecha; se rota una posición cada semana ISO para
 * que la comunidad tenga una propuesta distinta (o repetida si solo hay una).
 */
export async function GET() {
  const me = await getAuthUser()

  const recipes = await db.recipe.findMany({
    where: { status: 'PUBLISHED' },
    include: {
      author: { select: { id: true, name: true, role: true } },
      ratings: { select: { stars: true } },
      favorites: { select: { userId: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (recipes.length === 0) {
    return ok({ recipe: null, week: null })
  }

  const items = recipes.map((r) => serializeRecipe(r, me?.id))

  const ranked = [...items].sort(
    (a, b) =>
      b.avgRating - a.avgRating ||
      b.ratingCount - a.ratingCount ||
      b.favoritesCount - a.favoritesCount ||
      b.createdAt.localeCompare(a.createdAt)
  )

  const week = isoWeekNumber(new Date())
  const featured = ranked[(week - 1) % ranked.length]

  return ok({
    recipe: featured,
    week,
    candidates: ranked.length,
  })
}
