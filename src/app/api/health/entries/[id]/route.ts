import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser } from '@/lib/api-helpers'

type RouteContext = { params: Promise<{ id: string }> }

// DELETE /api/health/entries/[id] — eliminar registro de salud (solo el propietario)
export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params
  const { user, error } = await requireUser()
  if (error) return error

  const entry = await db.healthEntry.findUnique({ where: { id } })
  if (!entry) return fail('Registro de salud no encontrado.', 404)
  if (entry.userId !== user.id)
    return fail('Solo puedes eliminar tus propios registros de salud.', 403)

  await db.healthEntry.delete({ where: { id } })
  return ok({ ok: true })
}
