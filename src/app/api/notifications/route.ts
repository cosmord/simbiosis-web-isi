import { db } from '@/lib/db'
import { ok, requireUser } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

// GET /api/notifications — notificaciones del usuario autenticado + contador de no leídas
export async function GET(req: Request) {
  const { user, error } = await requireUser()
  if (error) return error

  const limitParam = Number(new URL(req.url).searchParams.get('limit'))
  const limit = Number.isInteger(limitParam) && limitParam > 0 && limitParam <= 50 ? limitParam : 20

  const [notifications, unread] = await Promise.all([
    db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    db.notification.count({ where: { userId: user.id, read: false } }),
  ])

  return ok({
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      linkView: n.linkView,
      linkId: n.linkId,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    })),
    unread,
  })
}

// PATCH /api/notifications — marcar todas como leídas
export async function PATCH() {
  const { user, error } = await requireUser()
  if (error) return error

  const result = await db.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  })

  return ok({ ok: true, updated: result.count })
}

// DELETE /api/notifications — eliminar todas las notificaciones leídas
export async function DELETE() {
  const { user, error } = await requireUser()
  if (error) return error

  const result = await db.notification.deleteMany({
    where: { userId: user.id, read: true },
  })

  return ok({ ok: true, deleted: result.count })
}
