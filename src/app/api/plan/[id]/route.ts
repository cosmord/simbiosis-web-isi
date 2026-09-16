import { db } from '@/lib/db'
import { ok, fail, requireUser } from '@/lib/api-helpers'

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
