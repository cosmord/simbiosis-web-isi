import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireCoordinator } from '@/lib/api-helpers'
import { publicUser } from '@/lib/auth'
import { notifyAsync } from '@/lib/notify'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireCoordinator()
  if (error) return error

  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail('El cuerpo de la petición no es válido.', 400)
  }

  const { action } = (body ?? {}) as Record<string, unknown>
  if (action !== 'ACTIVATE' && action !== 'SUSPEND' && action !== 'DELETE') {
    return fail('Acción no válida. Debe ser ACTIVATE, SUSPEND o DELETE.', 400)
  }

  const target = await db.user.findUnique({ where: { id } })
  if (!target) return fail('Usuario no encontrado.', 404)
  if (target.role === 'COORDINATOR') {
    return fail('No puedes gestionar otras cuentas de coordinador.', 403)
  }

  if (action === 'ACTIVATE') {
    const user = await db.user.update({ where: { id }, data: { status: 'ACTIVE' } })
    notifyAsync({
      userId: user.id,
      type: 'ACCOUNT',
      title: 'Cuenta aprobada',
      body: '¡Bienvenido/a a Simbiosis! Tu cuenta ha sido aprobada por el coordinador y ya puedes iniciar sesión.',
    })
    return ok({ user: publicUser(user) })
  }

  if (action === 'SUSPEND') {
    const [user] = await Promise.all([
      db.user.update({ where: { id }, data: { status: 'SUSPENDED' } }),
      db.session.deleteMany({ where: { userId: id } }),
    ])
    notifyAsync({
      userId: user.id,
      type: 'ACCOUNT',
      title: 'Cuenta suspendida',
      body: 'Tu cuenta ha sido suspendida por el coordinador. Contacta con el equipo de Simbiosis si crees que se trata de un error.',
    })
    return ok({ user: publicUser(user) })
  }

  // DELETE: las relaciones tienen onDelete: Cascade, así que Prisma elimina
  // en cascada sesiones, recetas, comentarios, hilos, etc.
  await db.user.delete({ where: { id } })
  return ok({ ok: true })
}
