import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser } from '@/lib/api-helpers'
import { getAuthUser } from '@/lib/auth'
import { serializeRecipe } from '@/lib/serialize'

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

// GET /api/recipes — listado público con filtros y ordenación
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const q = (searchParams.get('q') ?? '').trim().toLowerCase()
  const category = (searchParams.get('category') ?? '').trim()
  const tag = (searchParams.get('tag') ?? '').trim()
  const suitable = (searchParams.get('suitable') ?? '').trim()
  const authorRole = (searchParams.get('authorRole') ?? 'ALL').trim().toUpperCase()
  const sort = (searchParams.get('sort') ?? 'RECENT').trim().toUpperCase()

  const me = await getAuthUser()

  // SQLite no soporta "contains" case-insensitive: se filtra en JS (escala demo).
  const recipes = await db.recipe.findMany({
    where: { status: 'PUBLISHED' },
    include: {
      author: { select: { id: true, name: true, role: true } },
      ratings: { select: { stars: true } },
      favorites: { select: { userId: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  let items = recipes.map((r) => serializeRecipe(r, me?.id))

  if (q) {
    items = items.filter(
      (r) =>
        r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
    )
  }
  if (category && category.toUpperCase() !== 'ALL') {
    const cat = category.toLowerCase()
    items = items.filter((r) => r.category.toLowerCase() === cat)
  }
  if (tag) {
    const t = tag.toLowerCase()
    items = items.filter((r) => r.tags.some((x) => x.toLowerCase() === t))
  }
  if (suitable) {
    const s = suitable.toLowerCase()
    items = items.filter((r) => r.suitableFor.some((x) => x.toLowerCase() === s))
  }
  if (authorRole === 'PRO') {
    items = items.filter((r) => r.isProfessional)
  } else if (authorRole === 'COMMUNITY') {
    items = items.filter((r) => !r.isProfessional)
  }

  // Ordenación por valores computados (media/favoritos): se ordena en JS.
  if (sort === 'RATING') {
    items.sort(
      (a, b) =>
        b.avgRating - a.avgRating ||
        b.ratingCount - a.ratingCount ||
        b.createdAt.localeCompare(a.createdAt)
    )
  } else if (sort === 'FAVORITES') {
    items.sort(
      (a, b) =>
        b.favoritesCount - a.favoritesCount || b.createdAt.localeCompare(a.createdAt)
    )
  }

  return ok({ recipes: items })
}

// POST /api/recipes — crear receta (requiere autenticación)
export async function POST(req: NextRequest) {
  const { user, error } = await requireUser()
  if (error) return error

  const body = await readJson(req)
  if (!body) return fail('Cuerpo de la petición no válido.', 400)

  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const description = typeof body.description === 'string' ? body.description.trim() : ''
  const image = typeof body.image === 'string' ? body.image.trim() : ''
  const category =
    typeof body.category === 'string' && body.category.trim()
      ? body.category.trim()
      : 'Comida'
  const ingredients = toStringArray(body.ingredients)
  const steps = toStringArray(body.steps)
  const tags = toStringArray(body.tags)
  const suitableFor = toStringArray(body.suitableFor)
  const prepTime = body.prepTime === undefined ? 30 : Number(body.prepTime)
  const servings = body.servings === undefined ? 2 : Number(body.servings)

  if (!title) return fail('El título de la receta es obligatorio.', 400)
  if (!description) return fail('La descripción de la receta es obligatoria.', 400)
  if (ingredients.length === 0)
    return fail('La receta debe tener al menos un ingrediente.', 400)
  if (steps.length === 0)
    return fail('La receta debe tener al menos un paso de preparación.', 400)
  if (!Number.isFinite(prepTime) || prepTime <= 0)
    return fail('El tiempo de preparación debe ser un número mayor que 0.', 400)
  if (!Number.isFinite(servings) || servings <= 0)
    return fail('El número de raciones debe ser un número mayor que 0.', 400)

  const recipe = await db.recipe.create({
    data: {
      title,
      description,
      image,
      category,
      ingredients: JSON.stringify(ingredients),
      steps: JSON.stringify(steps),
      tags: JSON.stringify(tags),
      suitableFor: JSON.stringify(suitableFor),
      prepTime: Math.round(prepTime),
      servings: Math.round(servings),
      authorId: user.id,
    },
    include: {
      author: { select: { id: true, name: true, role: true } },
      ratings: { select: { stars: true } },
      favorites: { select: { userId: true } },
    },
  })

  return ok({ recipe: serializeRecipe(recipe, user.id) }, 201)
}
