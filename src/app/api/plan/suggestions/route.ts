import { db } from '@/lib/db'
import { ok, fail, requireUser } from '@/lib/api-helpers'
import { parseJsonArray } from '@/lib/serialize'
import { computeHealthInsight } from '@/lib/health-insights'

const SLOTS = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'] as const

/** Categoría(s) de receta que encajan con cada franja del plan. */
const SLOT_CATEGORIES: Record<(typeof SLOTS)[number], string[]> = {
  BREAKFAST: ['Desayuno'],
  LUNCH: ['Comida'],
  DINNER: ['Cena'],
  SNACK: ['Snack', 'Postre'],
}

/** Fase de la enfermedad inferida del último registro del diario de salud. */
function phaseFromSymptoms(symptoms: number): 'REMISION' | 'BROTE_LEVE' | 'BROTE_ACTIVO' {
  if (symptoms <= 2) return 'REMISION'
  if (symptoms <= 5) return 'BROTE_LEVE'
  return 'BROTE_ACTIVO'
}

const PHASE_LABELS: Record<string, string> = {
  REMISION: 'Remisión',
  BROTE_LEVE: 'Brote leve',
  BROTE_ACTIVO: 'Brote activo',
}

/** Etiquetas suitableFor equivalentes a cada fase (para emparejar con las recetas). */
const PHASE_SUITABLE: Record<string, string[]> = {
  REMISION: ['Remisión'],
  BROTE_LEVE: ['Brote leve', 'Remisión'],
  BROTE_ACTIVO: ['Brote activo', 'Brote leve'],
}

/** Puntos que suma cada etiqueta coincidente con el consejo de salud (máx. 2 etiquetas cuentan). */
const INSIGHT_TAG_SCORE = 14

/**
 * GET /api/plan/suggestions?slot=LUNCH
 * Sugiere recetas para un hueco del plan combinando:
 *  - la fase actual del usuario (último registro de síntomas del diario), vía suitableFor,
 *  - el consejo de salud personalizado (motor compartido con /api/health/insights):
 *    las recetas cuyas etiquetas encajan con las pautas sugeridas reciben un refuerzo,
 *  - la categoría que encaja con la franja (desayuno/comida/cena/snack),
 *  - valoración media, favoritos y recetas de profesionales como refuerzo.
 * Excluye las recetas que ya están en el plan del usuario.
 */
export async function GET(req: Request) {
  const auth = await requireUser()
  if (auth.error) return auth.error

  const url = new URL(req.url)
  const slot = String(url.searchParams.get('slot') ?? '')
  if (!SLOTS.includes(slot as (typeof SLOTS)[number])) {
    return fail('Franja de comida no válida. Usa BREAKFAST, LUNCH, DINNER o SNACK.')
  }

  // 1) Fase actual según el último registro del diario (si existe).
  const lastEntry = await db.healthEntry.findFirst({
    where: { userId: auth.user.id },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    select: { symptoms: true },
  })
  const phase = lastEntry ? phaseFromSymptoms(lastEntry.symptoms) : null

  // 2) Consejo de salud (motor compartido con el diario): etiquetas pautadas
  //    según la evolución reciente (media, días intensos, tendencia, peso).
  const { hasData, insight } = await computeHealthInsight(auth.user.id)
  const insightTags = insight?.suggestedTags ?? []

  // 3) Recetas publicadas con autor, valoración media y nº de favoritos.
  const recipes = await db.recipe.findMany({
    where: { status: 'PUBLISHED' },
    include: {
      author: { select: { id: true, name: true, role: true } },
      _count: { select: { favorites: true } },
      ratings: { select: { stars: true } },
    },
  })

  // 4) Recetas que el usuario ya tiene en el plan (cualquier hueco) para no repetir.
  const planItems = await db.mealPlanItem.findMany({
    where: { userId: auth.user.id },
    select: { recipeId: true },
  })
  const plannedIds = new Set(planItems.map((p) => p.recipeId))

  const preferred = SLOT_CATEGORIES[slot as (typeof SLOTS)[number]]
  const suitableMatch = phase ? PHASE_SUITABLE[phase] : []

  const scored = recipes
    .map((r) => {
      const suitable = parseJsonArray(r.suitableFor)
      const tags = parseJsonArray(r.tags)
      const avg =
        r.ratings.length > 0
          ? r.ratings.reduce((s, x) => s + x.stars, 0) / r.ratings.length
          : 0
      const favorites = r._count.favorites
      const isPro = r.author.role === 'NUTRITIONIST' || r.author.role === 'DOCTOR'

      const matchesPhase = suitableMatch.some((s) => suitable.includes(s))
      const matchesCategory = preferred.includes(r.category)
      // Etiquetas del consejo que la receta cumple (máx. 2 para no dominar la puntuación).
      const matchedTags = insightTags.filter((t) => tags.includes(t)).slice(0, 2)
      const matchesInsight = matchedTags.length > 0

      let score = 0
      if (matchesPhase) score += 50
      if (matchesCategory) score += 20
      score += matchedTags.length * INSIGHT_TAG_SCORE
      score += avg * 5 // hasta 25
      score += favorites * 2
      if (isPro) score += 5
      // Ligero impulso de frescura para que las recetas nuevas también aparezcan.
      const ageDays = (Date.now() - r.createdAt.getTime()) / 86_400_000
      score += Math.max(0, 5 - ageDays * 0.1)

      return {
        id: r.id,
        title: r.title,
        image: r.image,
        category: r.category,
        suitableFor: suitable,
        tags,
        ingredients: parseJsonArray(r.ingredients),
        prepTime: r.prepTime,
        servings: r.servings,
        author: { id: r.author.id, name: r.author.name, role: r.author.role },
        avgRating: Math.round(avg * 10) / 10,
        ratingCount: r.ratings.length,
        favoritesCount: favorites,
        matchesPhase,
        matchesInsight,
        matchedTags,
        matchesCategory,
        inPlan: plannedIds.has(r.id),
        score: Math.round(score * 10) / 10,
      }
    })
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'es'))

  // Sugerencias: máximo 6, excluyendo las ya planificadas.
  const notPlanned = scored.filter((r) => !r.inPlan)
  const chosen = notPlanned.slice(0, 6)

  return ok({
    phase,
    phaseLabel: phase ? PHASE_LABELS[phase] : null,
    hasHealthData: !!lastEntry,
    insightTags,
    insightLevel: insight?.level ?? null,
    slot,
    categories: preferred,
    suggestions: chosen,
    totalCandidates: notPlanned.length,
  })
}
