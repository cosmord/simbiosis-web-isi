import { db } from '@/lib/db'
import { ok, fail, requireUser } from '@/lib/api-helpers'
import { parseJsonArray } from '@/lib/serialize'

const SLOTS = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'] as const
const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

/** Resumen de receta con campos necesarios para el plan y la lista de la compra. */
function recipeSummary(recipe: {
  id: string
  title: string
  image: string
  category: string
  ingredients: string
  prepTime: number
  servings: number
  author: { id: string; name: string; role: string }
}) {
  return {
    id: recipe.id,
    title: recipe.title,
    image: recipe.image,
    category: recipe.category,
    ingredients: parseJsonArray(recipe.ingredients),
    prepTime: recipe.prepTime,
    servings: recipe.servings,
    author: { id: recipe.author.id, name: recipe.author.name, role: recipe.author.role },
  }
}

/** GET /api/plan — devuelve el plan semanal del usuario autenticado. */
export async function GET() {
  const auth = await requireUser()
  if (auth.error) return auth.error

  const items = await db.mealPlanItem.findMany({
    where: { userId: auth.user.id },
    include: {
      recipe: {
        include: { author: { select: { id: true, name: true, role: true } } },
      },
    },
    orderBy: [{ day: 'asc' }, { createdAt: 'asc' }],
  })

  return ok({
    items: items.map((it) => ({
      id: it.id,
      day: it.day,
      slot: it.slot,
      recipe: recipeSummary(it.recipe),
    })),
  })
}

/** PUT /api/plan — asigna (o sustituye) una receta en un hueco del plan. */
export async function PUT(req: Request) {
  const auth = await requireUser()
  if (auth.error) return auth.error

  let body: { day?: unknown; slot?: unknown; recipeId?: unknown }
  try {
    body = await req.json()
  } catch {
    return fail('Cuerpo de la petición no válido.')
  }

  const day = Number(body.day)
  const slot = String(body.slot ?? '')
  const recipeId = String(body.recipeId ?? '')

  if (!Number.isInteger(day) || day < 0 || day > 6) return fail('El día debe estar entre 0 (Lunes) y 6 (Domingo).')
  if (!SLOTS.includes(slot as (typeof SLOTS)[number])) return fail('Franja de comida no válida.')

  const recipe = await db.recipe.findUnique({ where: { id: recipeId } })
  if (!recipe || recipe.status !== 'PUBLISHED') return fail('La receta seleccionada no existe o no está publicada.', 404)

  const item = await db.mealPlanItem.upsert({
    where: { userId_day_slot: { userId: auth.user.id, day, slot } },
    create: { userId: auth.user.id, day, slot, recipeId },
    update: { recipeId },
    include: {
      recipe: {
        include: { author: { select: { id: true, name: true, role: true } } },
      },
    },
  })

  return ok({
    item: {
      id: item.id,
      day: item.day,
      slot: item.slot,
      recipe: recipeSummary(item.recipe),
    },
    dayName: DAY_NAMES[day],
  })
}

/** DELETE /api/plan — vacía todo el plan semanal del usuario. */
export async function DELETE() {
  const auth = await requireUser()
  if (auth.error) return auth.error

  const res = await db.mealPlanItem.deleteMany({ where: { userId: auth.user.id } })
  return ok({ ok: true, removed: res.count })
}
