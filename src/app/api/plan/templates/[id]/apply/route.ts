import { db } from '@/lib/db'
import { ok, fail, requireUser } from '@/lib/api-helpers'
import { parseJsonArray } from '@/lib/serialize'

const SLOTS = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'] as const
const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

interface TemplateDay {
  day: number
  slot: string
  recipeId: string
}

/** Resumen de receta con los campos que espera el planificador. */
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

/**
 * POST /api/plan/templates/[id]/apply — aplica la plantilla al plan semanal,
 * sustituyendo el contenido actual. Las recetas retiradas de la plataforma se omiten.
 * Permite aplicar plantillas propias o publicadas en la comunidad por profesionales.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser()
  if (auth.error) return auth.error

  const { id } = await ctx.params
  const template = await db.planTemplate.findUnique({ where: { id } })
  if (!template || (template.userId !== auth.user.id && !template.isPublic))
    return fail('La plantilla solicitada no existe o no está disponible.', 404)

  let days: TemplateDay[] = []
  try {
    const parsed: unknown = JSON.parse(template.days)
    if (Array.isArray(parsed)) days = parsed as TemplateDay[]
  } catch {
    days = []
  }

  const valid = days.filter(
    (d) =>
      Number.isInteger(d.day) &&
      d.day >= 0 &&
      d.day <= 6 &&
      SLOTS.includes(d.slot as (typeof SLOTS)[number]) &&
      typeof d.recipeId === 'string' &&
      d.recipeId
  )
  // Nos quedamos con la última receta por hueco (day+slot) en caso de duplicados
  const bySlot = new Map<string, TemplateDay>()
  for (const d of valid) bySlot.set(`${d.day}:${d.slot}`, d)

  if (bySlot.size === 0)
    return fail('Esta plantilla no tiene recetas guardadas y no se puede aplicar.')

  const recipeIds = [...new Set([...bySlot.values()].map((d) => d.recipeId))]
  const recipes = await db.recipe.findMany({
    where: { id: { in: recipeIds }, status: 'PUBLISHED' },
    include: { author: { select: { id: true, name: true, role: true } } },
  })
  const recipeMap = new Map(recipes.map((r) => [r.id, r]))

  const usable = [...bySlot.values()].filter((d) => recipeMap.has(d.recipeId))
  if (usable.length === 0)
    return fail('Ninguna receta de esta plantilla sigue disponible en la comunidad.')

  const removedCount = bySlot.size - usable.length

  // Sustituye el plan actual por el contenido de la plantilla (atómico)
  const applied = await db.$transaction(async (tx) => {
    await tx.mealPlanItem.deleteMany({ where: { userId: auth.user.id } })
    await tx.mealPlanItem.createMany({
      data: usable.map((d) => ({
        userId: auth.user.id,
        day: d.day,
        slot: d.slot,
        recipeId: d.recipeId,
      })),
    })
    return tx.mealPlanItem.findMany({
      where: { userId: auth.user.id },
      include: {
        recipe: {
          include: { author: { select: { id: true, name: true, role: true } } },
        },
      },
      orderBy: [{ day: 'asc' }, { createdAt: 'asc' }],
    })
  })

  return ok({
    applied: applied.length,
    removed: removedCount,
    templateName: template.name,
    items: applied.map((it) => ({
      id: it.id,
      day: it.day,
      slot: it.slot,
      recipe: recipeSummary(it.recipe),
    })),
    dayNames: DAY_NAMES,
  })
}
