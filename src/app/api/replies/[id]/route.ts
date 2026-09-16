import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser } from '@/lib/api-helpers'

type RouteContext = { params: Promise<{ id: string }> }

// DELETE /api/replies/[id] — eliminar respuesta (autor o coordinador, borrado físico)
export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params
  const { user, error } = await requireUser()
  if (error) return error

  const reply = await db.reply.findUnique({ where: { id } })
  if (!reply) return fail('Respuesta no encontrada.', 404)
  if (reply.userId !== user.id && user.role !== 'COORDINATOR')
    return fail('Solo el autor o el coordinador pueden eliminar esta respuesta.', 403)

  await db.reply.delete({ where: { id } })
  return ok({ ok: true })
}
