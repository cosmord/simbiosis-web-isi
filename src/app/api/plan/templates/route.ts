import { db } from '@/lib/db'
import { ok, fail, requireUser } from '@/lib/api-helpers'

const SLOTS = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'] as const
const MAX_TEMPLATES = 20
const MAX_NAME = 60

interface TemplateDay {
  day: number
  slot: string
  recipeId: string
}

/** GET /api/plan/templates — plantillas de menú del usuario autenticado. */
export async function GET() {
  const auth = await requireUser()
  if (auth.error) return auth.error

  const templates = await db.planTemplate.findMany({
    where: { userId: auth.user.id },
    orderBy: { createdAt: 'desc' },
  })

  return ok({
    templates: templates.map((t) => {
      let days: TemplateDay[] = []
      try {
        const parsed: unknown = JSON.parse(t.days)
        if (Array.isArray(parsed)) days = parsed as TemplateDay[]
      } catch {
        days = []
      }
      return {
        id: t.id,
        name: t.name,
        description: t.description,
        isPublic: t.isPublic,
        appliedCount: t.appliedCount,
        recipeCount: days.length,
        createdAt: t.createdAt.toISOString(),
      }
    }),
  })
}

/** POST /api/plan/templates — guarda el plan semanal actual como plantilla con nombre. */
export async function POST(req: Request) {
  const auth = await requireUser()
  if (auth.error) return auth.error

  let body: { name?: unknown }
  try {
    body = await req.json()
  } catch {
    return fail('Cuerpo de la petición no válido.')
  }

  const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : ''
  if (!name) return fail('Ponle un nombre a la plantilla para reconocerla después.')
  if (name.length > MAX_NAME)
    return fail(`El nombre no puede superar los ${MAX_NAME} caracteres.`)

  const items = await db.mealPlanItem.findMany({
    where: { userId: auth.user.id },
    orderBy: [{ day: 'asc' }, { createdAt: 'asc' }],
  })
  if (items.length === 0)
    return fail('Tu plan semanal está vacío: añade recetas antes de guardarlo como plantilla.')

  const existing = await db.planTemplate.count({ where: { userId: auth.user.id } })
  if (existing >= MAX_TEMPLATES)
    return fail(`Has alcanzado el máximo de ${MAX_TEMPLATES} plantillas. Elimina alguna para crear otra.`)

  // Si ya existe una plantilla con el mismo nombre, se actualiza con el plan actual
  const duplicated = await db.planTemplate.findFirst({
    where: { userId: auth.user.id, name: { equals: name } },
  })

  const days: TemplateDay[] = items.map((it) => ({ day: it.day, slot: it.slot, recipeId: it.recipeId }))

  const template = duplicated
    ? await db.planTemplate.update({
        where: { id: duplicated.id },
        data: { days: JSON.stringify(days), name },
      })
    : await db.planTemplate.create({
        data: { userId: auth.user.id, name, days: JSON.stringify(days) },
      })

  return ok(
    {
      template: {
        id: template.id,
        name: template.name,
        recipeCount: days.length,
        createdAt: template.createdAt.toISOString(),
      },
      updated: !!duplicated,
    },
    duplicated ? 200 : 201
  )
}
