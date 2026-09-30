import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser } from '@/lib/api-helpers'
import { publicUser } from '@/lib/auth'

export async function PATCH(req: NextRequest) {
  const { user: auth, error } = await requireUser()
  if (error) return error

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail('El cuerpo de la petición no es válido.', 400)
  }

  const { name, bio } = (body ?? {}) as Record<string, unknown>

  const data: { name?: string; bio?: string | null } = {}

  if (name !== undefined) {
    const cleanName = typeof name === 'string' ? name.trim() : ''
    if (!cleanName) return fail('El nombre no puede estar vacío.', 400)
    data.name = cleanName
  }
  if (bio !== undefined) {
    if (bio !== null && typeof bio !== 'string') {
      return fail('La biografía indicada no es válida.', 400)
    }
    const cleanBio = typeof bio === 'string' ? bio.trim() : ''
    data.bio = cleanBio.length > 0 ? cleanBio : null
  }

  if (Object.keys(data).length === 0) {
    return fail('No hay cambios que guardar.', 400)
  }

  const updated = await db.user.update({ where: { id: auth.id }, data })
  return ok({ user: publicUser(updated) })
}
