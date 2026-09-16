import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail } from '@/lib/api-helpers'
import { hashPassword, publicUser, type Role } from '@/lib/auth'

const VALID_ROLES: Role[] = ['PATIENT', 'CAREGIVER', 'NUTRITIONIST', 'DOCTOR']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail('El cuerpo de la petición no es válido.', 400)
  }

  const { email, password, name, role, bio } = (body ?? {}) as Record<string, unknown>

  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
  const cleanName = typeof name === 'string' ? name.trim() : ''
  const cleanBio = typeof bio === 'string' && bio.trim().length > 0 ? bio.trim() : null

  if (!cleanEmail || !cleanName || !password || !role) {
    return fail('Debes completar el nombre, el correo electrónico, la contraseña y el rol.', 400)
  }
  if (!EMAIL_RE.test(cleanEmail)) {
    return fail('El correo electrónico no tiene un formato válido.', 400)
  }
  if (typeof password !== 'string' || password.length < 6) {
    return fail('La contraseña debe tener al menos 6 caracteres.', 400)
  }
  if (!VALID_ROLES.includes(role as Role)) {
    return fail('El rol indicado no es válido.', 400)
  }

  const existing = await db.user.findUnique({ where: { email: cleanEmail } })
  if (existing) {
    return fail('Este correo electrónico ya está registrado.', 409)
  }

  const passwordHash = await hashPassword(password)
  const user = await db.user.create({
    data: {
      email: cleanEmail,
      passwordHash,
      name: cleanName,
      role: role as Role,
      bio: cleanBio,
      status: 'PENDING',
    },
  })

  return ok({ user: publicUser(user) }, 201)
}
