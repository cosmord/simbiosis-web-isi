import { db } from '@/lib/db'
import { ok } from '@/lib/api-helpers'

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

export const dynamic = 'force-dynamic'

/** GET /api/stats — público. Estadísticas de la comunidad para la home. */
export async function GET() {
  const [users, recipes, proRecipes, ratingAgg, satisfied, threads, publications] =
    await Promise.all([
      db.user.count({ where: { status: 'ACTIVE' } }),
      db.recipe.count({ where: { status: 'PUBLISHED' } }),
      db.recipe.count({
        where: {
          status: 'PUBLISHED',
          author: { role: { in: ['NUTRITIONIST', 'DOCTOR'] } },
        },
      }),
      db.rating.aggregate({
        _avg: { stars: true },
        _count: true,
        where: { recipe: { status: 'PUBLISHED' } },
      }),
      db.rating.count({
        where: { stars: { gte: 4 }, recipe: { status: 'PUBLISHED' } },
      }),
      db.thread.count({ where: { status: { not: 'REMOVED' } } }),
      db.healthPublication.count({ where: { status: 'PUBLISHED' } }),
    ])

  const ratingsCount = ratingAgg._count
  const avgRating = ratingAgg._avg.stars ? round1(ratingAgg._avg.stars) : 0
  const professionalRecipesPct = recipes > 0 ? round1((proRecipes / recipes) * 100) : 0
  const satisfactionPct = ratingsCount > 0 ? round1((satisfied / ratingsCount) * 100) : 0

  return ok({
    users,
    recipes,
    professionalRecipesPct,
    avgRating,
    ratingsCount,
    threads,
    publications,
    satisfactionPct,
  })
}
