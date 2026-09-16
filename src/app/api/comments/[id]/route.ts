import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser } from '@/lib/api-helpers'

type RouteContext = { params: Promise<{ id: string }> }

// DELETE /api/comments/[id] — eliminar comentario (autor o coordinador, borrado físico)
export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params
  const { user, error } = await requireUser()
  if (error) return error

  const comment = await db.comment.findUnique({ where: { id } })
  if (!comment) return fail('Comentario no encontrado.', 404)
  if (comment.userId !== user.id && user.role !== 'COORDINATOR')
    return fail('Solo el autor o el coordinador pueden eliminar este comentario.', 403)

  await db.comment.delete({ where: { id } })
  return ok({ ok: true })
}
