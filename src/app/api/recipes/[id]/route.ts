import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser } from '@/lib/api-helpers'
import { getAuthUser } from '@/lib/auth'
import { parseJsonArray, averageStars, serializeRecipe } from '@/lib/serialize'

type RouteContext = { params: Promise<{ id: string }> }

/** Lee y valida el cuerpo JSON de la petición. Devuelve null si no es un objeto válido. */
async function readJson(req: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await req.json()
    if (typeof body !== 'object' || body === null || Array.isArray(body)) return null
    return body as Record<string, unknown>
  } catch {
    return null
  }
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : []
}

// GET /api/recipes/[id] — detalle público con comentarios, valoraciones y estado del usuario
export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params
  const me = await getAuthUser()

  const recipe = await db.recipe.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true, role: true, bio: true, createdAt: true } },
      ratings: {
        include: { user: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'desc' },
      },
      comments: {
        where: { status: 'VISIBLE' },
        include: { user: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'asc' },
      },
      favorites: { select: { userId: true } },
    },
  })

  if (!recipe || recipe.status === 'REMOVED') {
    return fail('Receta no encontrada.', 404)
  }

  const mine = me ? recipe.ratings.find((r) => r.userId === me.id) : undefined

  return ok({
    recipe: {
      id: recipe.id,
      title: recipe.title,
      description: recipe.description,
      image: recipe.image,
      category: recipe.category,
      ingredients: parseJsonArray(recipe.ingredients),
      steps: parseJsonArray(recipe.steps),
      tags: parseJsonArray(recipe.tags),
      suitableFor: parseJsonArray(recipe.suitableFor),
      prepTime: recipe.prepTime,
      servings: recipe.servings,
      createdAt: recipe.createdAt.toISOString(),
      status: recipe.status,
    },
    author: {
      id: recipe.author.id,
      name: recipe.author.name,
      role: recipe.author.role,
      bio: recipe.author.bio,
      createdAt: recipe.author.createdAt.toISOString(),
    },
    comments: recipe.comments.map((c) => ({
      id: c.id,
      content: c.content,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
      author: { id: c.user.id, name: c.user.name, role: c.user.role },
    })),
    ratings: recipe.ratings.map((r) => ({
      id: r.id,
      stars: r.stars,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
      author: { id: r.user.id, name: r.user.name, role: r.user.role },
    })),
    avgRating: averageStars(recipe.ratings.map((r) => r.stars)),
    ratingCount: recipe.ratings.length,
    favoritesCount: recipe.favorites.length,
    myRating: mine ? { stars: mine.stars, comment: mine.comment } : null,
    favoriteByMe: me ? recipe.favorites.some((f) => f.userId === me.id) : false,
  })
}

// PATCH /api/recipes/[id] — editar receta (solo el autor)
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params
  const { user, error } = await requireUser()
  if (error) return error

  const recipe = await db.recipe.findUnique({ where: { id } })
  if (!recipe || recipe.status === 'REMOVED') return fail('Receta no encontrada.', 404)
  if (recipe.authorId !== user.id)
    return fail('Solo el autor puede editar esta receta.', 403)

  const body = await readJson(req)
  if (!body) return fail('Cuerpo de la petición no válido.', 400)

  const data: {
    title?: string
    description?: string
    image?: string
    category?: string
    ingredients?: string
    steps?: string
    tags?: string
    suitableFor?: string
    prepTime?: number
    servings?: number
  } = {}

  if (body.title !== undefined) {
    const title = String(body.title).trim()
    if (!title) return fail('El título de la receta es obligatorio.', 400)
    data.title = title
  }
  if (body.description !== undefined) {
    const description = String(body.description).trim()
    if (!description) return fail('La descripción de la receta es obligatoria.', 400)
    data.description = description
  }
  if (body.image !== undefined) data.image = String(body.image).trim()
  if (body.category !== undefined) {
    const category = String(body.category).trim()
    if (!category) return fail('La categoría de la receta no es válida.', 400)
    data.category = category
  }
  if (body.ingredients !== undefined) {
    const ingredients = toStringArray(body.ingredients)
    if (ingredients.length === 0)
      return fail('La receta debe tener al menos un ingrediente.', 400)
    data.ingredients = JSON.stringify(ingredients)
  }
  if (body.steps !== undefined) {
    const steps = toStringArray(body.steps)
    if (steps.length === 0)
      return fail('La receta debe tener al menos un paso de preparación.', 400)
    data.steps = JSON.stringify(steps)
  }
  if (body.tags !== undefined) data.tags = JSON.stringify(toStringArray(body.tags))
  if (body.suitableFor !== undefined)
    data.suitableFor = JSON.stringify(toStringArray(body.suitableFor))
  if (body.prepTime !== undefined) {
    const prepTime = Number(body.prepTime)
    if (!Number.isFinite(prepTime) || prepTime <= 0)
      return fail('El tiempo de preparación debe ser un número mayor que 0.', 400)
    data.prepTime = Math.round(prepTime)
  }
  if (body.servings !== undefined) {
    const servings = Number(body.servings)
    if (!Number.isFinite(servings) || servings <= 0)
      return fail('El número de raciones debe ser un número mayor que 0.', 400)
    data.servings = Math.round(servings)
  }

  const updated = await db.recipe.update({
    where: { id },
    data,
    include: {
      author: { select: { id: true, name: true, role: true } },
      ratings: { select: { stars: true } },
      favorites: { select: { userId: true } },
    },
  })

  return ok({ recipe: serializeRecipe(updated, user.id) })
}

// DELETE /api/recipes/[id] — eliminar receta (autor o coordinador, borrado físico)
export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params
  const { user, error } = await requireUser()
  if (error) return error

  const recipe = await db.recipe.findUnique({ where: { id } })
  if (!recipe) return fail('Receta no encontrada.', 404)
  if (recipe.authorId !== user.id && user.role !== 'COORDINATOR')
    return fail('Solo el autor o el coordinador pueden eliminar esta receta.', 403)

  await db.recipe.delete({ where: { id } })
  return ok({ ok: true })
}
