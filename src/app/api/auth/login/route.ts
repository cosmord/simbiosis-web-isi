import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail } from '@/lib/api-helpers'
import { verifyPassword, createSession, setSessionCookie, publicUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail('El cuerpo de la petición no es válido.', 400)
  }

  const { email, password } = (body ?? {}) as Record<string, unknown>
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''

  if (!cleanEmail || typeof password !== 'string' || password.length === 0) {
    return fail('Debes indicar el correo electrónico y la contraseña.', 400)
  }

  const user = await db.user.findUnique({ where: { email: cleanEmail } })
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return fail('Correo o contraseña incorrectos.', 401)
  }

  if (user.status === 'PENDING') {
    return fail('Tu cuenta está pendiente de aprobación por el coordinador.', 403)
  }
  if (user.status === 'SUSPENDED') {
    return fail('Tu cuenta ha sido suspendida. Contacta con el coordinador.', 403)
  }

  const token = await createSession(user.id)
  await setSessionCookie(token)

  return ok({ user: publicUser(user) })
}
