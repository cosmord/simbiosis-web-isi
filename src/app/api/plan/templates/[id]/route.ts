import { db } from '@/lib/db'
import { ok, fail, requireUser } from '@/lib/api-helpers'

const MAX_NAME = 60
const MAX_DESCRIPTION = 200

/** DELETE /api/plan/templates/[id] — elimina una plantilla propia. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser()
  if (auth.error) return auth.error

  const { id } = await ctx.params
  const template = await db.planTemplate.findUnique({ where: { id } })
  if (!template || template.userId !== auth.user.id)
    return fail('La plantilla solicitada no existe.', 404)

  await db.planTemplate.delete({ where: { id } })
  return ok({ ok: true })
}

/**
 * PATCH /api/plan/templates/[id] — renombra y/o edita la descripción de una
 * plantilla propia (incluidas las publicadas en la comunidad, que siempre
 * deben conservar una descripción).
 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser()
  if (auth.error) return auth.error

  const { id } = await ctx.params
  const template = await db.planTemplate.findUnique({ where: { id } })
  if (!template || template.userId !== auth.user.id)
    return fail('La plantilla solicitada no existe.', 404)

  let body: { name?: unknown; description?: unknown }
  try {
    body = await req.json()
  } catch {
    return fail('Cuerpo de la petición no válido.')
  }

  const data: { name?: string; description?: string | null } = {}

  if (body.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : ''
    if (!name) return fail('El nombre de la plantilla no puede quedar vacío.')
    if (name.length > MAX_NAME)
      return fail(`El nombre no puede superar los ${MAX_NAME} caracteres.`)
    // El nombre debe seguir siendo único entre las plantillas del usuario
    const duplicated = await db.planTemplate.findFirst({
      where: { userId: auth.user.id, name: { equals: name }, id: { not: id } },
    })
    if (duplicated) return fail('Ya tienes otra plantilla con ese nombre: elige uno distinto.')
    data.name = name
  }

  if (body.description !== undefined) {
    const description =
      typeof body.description === 'string' ? body.description.trim().replace(/\s+/g, ' ') : ''
    if (description.length > MAX_DESCRIPTION)
      return fail(`La descripción no puede superar los ${MAX_DESCRIPTION} caracteres.`)
    if (template.isPublic && !description)
      return fail(
        'Las plantillas publicadas en la comunidad necesitan una descripción: retírala primero si quieres quitarla.'
      )
    data.description = description || null
  }

  if (Object.keys(data).length === 0)
    return fail('No hay nada que actualizar: indica un nombre o una descripción.')

  const updated = await db.planTemplate.update({ where: { id }, data })

  return ok({
    template: {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      isPublic: updated.isPublic,
    },
  })
}
