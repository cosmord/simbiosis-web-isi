import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import crypto from 'crypto'

export { hashPassword, verifyPassword } from '@/lib/password'

export type Role = 'PATIENT' | 'CAREGIVER' | 'NUTRITIONIST' | 'DOCTOR' | 'COORDINATOR'

export const PROFESSIONAL_ROLES: Role[] = ['NUTRITIONIST', 'DOCTOR']

export const ROLE_LABELS: Record<Role, string> = {
  PATIENT: 'Paciente',
  CAREGIVER: 'Cuidador/a',
  NUTRITIONIST: 'Nutricionista',
  DOCTOR: 'Médico/a',
  COORDINATOR: 'Coordinador/a',
}

export const SESSION_COOKIE = 'simbiosis_session'
const SESSION_DAYS = 30

export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
  await db.session.create({ data: { id: token, userId, expiresAt } })
  return token
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  })
}

export async function clearSession(): Promise<void> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (token) {
    await db.session.deleteMany({ where: { id: token } })
  }
  store.delete(SESSION_COOKIE)
}

export type SafeUser = {
  id: string
  email: string
  name: string
  role: Role
  status: string
  bio: string | null
  createdAt: string
}

export function publicUser(u: {
  id: string
  email: string
  name: string
  role: string
  status: string
  bio: string | null
  createdAt: Date
}): SafeUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role as Role,
    status: u.status,
    bio: u.bio,
    createdAt: u.createdAt.toISOString(),
  }
}

/** Lee la cookie de sesión y devuelve el usuario autenticado (o null). */
export async function getAuthUser(): Promise<SafeUser | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null
  const session = await db.session.findUnique({
    where: { id: token },
    include: { user: true },
  })
  if (!session) return null
  if (session.expiresAt.getTime() < Date.now()) {
    await db.session.delete({ where: { id: token } }).catch(() => {})
    return null
  }
  return publicUser(session.user)
}

export function isProfessional(role: string): boolean {
  return PROFESSIONAL_ROLES.includes(role as Role)
}
