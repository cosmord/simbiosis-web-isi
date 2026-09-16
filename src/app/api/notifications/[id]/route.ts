import { db } from '@/lib/db'
import { ok, fail, requireUser } from '@/lib/api-helpers'

type RouteContext = { params: Promise<{ id: string }> }

// PATCH /api/notifications/[id] — marcar una notificación como leída (propietario)
export async function PATCH(_req: Request, ctx: RouteContext) {
  const { id } = await ctx.params
  const { user, error } = await requireUser()
  if (error) return error

  const notification = await db.notification.findUnique({ where: { id } })
  if (!notification || notification.userId !== user.id)
    return fail('Notificación no encontrada.', 404)

  if (!notification.read) {
    await db.notification.update({ where: { id }, data: { read: true } })
  }

  return ok({ ok: true })
}

// DELETE /api/notifications/[id] — eliminar una notificación (propietario)
export async function DELETE(_req: Request, ctx: RouteContext) {
  const { id } = await ctx.params
  const { user, error } = await requireUser()
  if (error) return error

  const notification = await db.notification.findUnique({ where: { id } })
  if (!notification || notification.userId !== user.id)
    return fail('Notificación no encontrada.', 404)

  await db.notification.delete({ where: { id } })

  return ok({ ok: true })
}
