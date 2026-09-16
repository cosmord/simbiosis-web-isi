import { db } from '@/lib/db'
import { ok, fail, requireUser } from '@/lib/api-helpers'

/** PATCH /api/plan/[id] — marca o desmarca una comida del plan como «cocinada». */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser()
  if (auth.error) return auth.error
  const { id } = await params

  let body: { done?: unknown }
  try {
    body = await req.json()
  } catch {
    return fail('Cuerpo de la petición no válido.')
  }
  if (typeof body.done !== 'boolean') {
    return fail('El campo «done» debe ser true o false.')
  }

  const existing = await db.mealPlanItem.findUnique({ where: { id } })
  if (!existing || existing.userId !== auth.user.id) return fail('Elemento del plan no encontrado.', 404)

  const item = await db.mealPlanItem.update({
    where: { id },
    data: { done: body.done },
    select: { id: true, done: true },
  })
  return ok({ item })
}

/** DELETE /api/plan/[id] — elimina un elemento del propio plan. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser()
  if (auth.error) return auth.error
  const { id } = await params

  const item = await db.mealPlanItem.findUnique({ where: { id } })
  if (!item || item.userId !== auth.user.id) return fail('Elemento del plan no encontrado.', 404)

  await db.mealPlanItem.delete({ where: { id } })
  return ok({ ok: true })
}
