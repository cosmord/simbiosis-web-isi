import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser } from '@/lib/api-helpers'
import { notifyAsync } from '@/lib/notify'

type RouteContext = { params: Promise<{ id: string }> }

// POST /api/recipes/[id]/favorite — marcar/desmarcar favorito (toggle, requiere autenticación)
export async function POST(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params
  const { user, error } = await requireUser()
  if (error) return error

  const recipe = await db.recipe.findUnique({
    where: { id },
    select: { id: true, status: true, title: true, authorId: true },
  })
  if (!recipe || recipe.status === 'REMOVED') return fail('Receta no encontrada.', 404)

  const existing = await db.favorite.findUnique({
    where: { userId_recipeId: { userId: user.id, recipeId: id } },
  })

  if (existing) {
    await db.favorite.delete({ where: { id: existing.id } })
  } else {
    await db.favorite.create({ data: { userId: user.id, recipeId: id } })
    notifyAsync(
      {
        userId: recipe.authorId,
        type: 'FAVORITE',
        title: 'Han guardado tu receta',
        body: `${user.name} ha añadido "${recipe.title}" a sus favoritos.`,
        linkView: 'recipeDetail',
        linkId: recipe.id,
      },
      user.id
    )
  }

  const favoritesCount = await db.favorite.count({ where: { recipeId: id } })

  return ok({ favorite: !existing, favoritesCount })
}
