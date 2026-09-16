import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser } from '@/lib/api-helpers'
import { averageStars } from '@/lib/serialize'
import { notifyAsync } from '@/lib/notify'

type RouteContext = { params: Promise<{ id: string }> }

// POST /api/recipes/[id]/rate — crear o actualizar la valoración del usuario (upsert)
export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params
  const { user, error } = await requireUser()
  if (error) return error

  const recipe = await db.recipe.findUnique({
    where: { id },
    select: { id: true, status: true, title: true, authorId: true },
  })
  if (!recipe || recipe.status === 'REMOVED') return fail('Receta no encontrada.', 404)

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return fail('Cuerpo de la petición no válido.', 400)
  }

  const stars = Number(body.stars)
  if (!Number.isInteger(stars) || stars < 1 || stars > 5)
    return fail('La valoración debe tener entre 1 y 5 estrellas.', 400)
  const comment =
    typeof body.comment === 'string' && body.comment.trim()
      ? body.comment.trim()
      : null

  const previous = await db.rating.findUnique({
    where: { userId_recipeId: { userId: user.id, recipeId: id } },
    select: { id: true },
  })

  await db.rating.upsert({
    where: { userId_recipeId: { userId: user.id, recipeId: id } },
    update: { stars, comment },
    create: { stars, comment, userId: user.id, recipeId: id },
  })

  if (!previous) {
    notifyAsync(
      {
        userId: recipe.authorId,
        type: 'RATING',
        title: 'Nueva valoración de tu receta',
        body: `${user.name} ha valorado "${recipe.title}" con ${stars} ${stars === 1 ? 'estrella' : 'estrellas'}.`,
        linkView: 'recipeDetail',
        linkId: recipe.id,
      },
      user.id
    )
  }

  const ratings = await db.rating.findMany({
    where: { recipeId: id },
    select: { stars: true, userId: true, comment: true },
  })

  const mine = ratings.find((r) => r.userId === user.id)

  return ok({
    avgRating: averageStars(ratings.map((r) => r.stars)),
    ratingCount: ratings.length,
    myRating: mine ? { stars: mine.stars, comment: mine.comment } : null,
  })
}
