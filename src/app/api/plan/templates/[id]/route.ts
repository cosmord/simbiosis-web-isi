import { db } from '@/lib/db'
import { ok, fail, requireUser } from '@/lib/api-helpers'

/** DELETE /api/plan/templates/[id] — elimina una plantilla propia. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser()
  if (auth.error) return auth.error

  const { id } = await ctx.params
  const template = await db.planTemplate.findUnique({ where: { id } })
  if (!template || template.userId !== auth.user.id)
    return fail('La plantilla solicitada no existe.', 404)

  await db.planTemplate.delete({ where: { id } })
  return ok({ ok: true })
}
