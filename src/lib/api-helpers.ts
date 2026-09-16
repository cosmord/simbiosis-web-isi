import { NextResponse } from 'next/server'
import { getAuthUser, type SafeUser } from '@/lib/auth'

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status })
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

/** Devuelve el usuario autenticado o null si no hay sesión válida. */
export async function currentUser(): Promise<SafeUser | null> {
  return getAuthUser()
}

export async function requireUser(): Promise<
  { user: SafeUser; error: null } | { user: null; error: NextResponse }
> {
  const user = await getAuthUser()
  if (!user) return { user: null, error: fail('Debes iniciar sesión para realizar esta acción.', 401) }
  if (user.status === 'PENDING')
    return { user: null, error: fail('Tu cuenta está pendiente de aprobación por el coordinador.', 403) }
  if (user.status === 'SUSPENDED')
    return { user: null, error: fail('Tu cuenta ha sido suspendida. Contacta con el coordinador.', 403) }
  return { user, error: null }
}

export async function requireCoordinator(): Promise<
  { user: SafeUser; error: null } | { user: null; error: NextResponse }
> {
  const res = await requireUser()
  if (res.error) return res
  if (res.user.role !== 'COORDINATOR')
    return { user: null, error: fail('Esta acción requiere permisos de coordinador.', 403) }
  return res
}

export async function requireProfessional(): Promise<
  { user: SafeUser; error: null } | { user: null; error: NextResponse }
> {
  const res = await requireUser()
  if (res.error) return res
  if (res.user.role !== 'NUTRITIONIST' && res.user.role !== 'DOCTOR')
    return { user: null, error: fail('Esta acción requiere rol de profesional de la salud (nutricionista o médico).', 403) }
  return res
}
