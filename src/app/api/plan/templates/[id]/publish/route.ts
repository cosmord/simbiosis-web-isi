import { db } from '@/lib/db'
import { ok, fail, requireUser } from '@/lib/api-helpers'
import { isProfessional } from '@/lib/auth'
import { notifyManyAsync } from '@/lib/notify'
import { sendEmailAsync } from '@/lib/emails'

const MAX_DESCRIPTION = 200

/**
 * POST /api/plan/templates/[id]/publish — publica (o retira) una plantilla
 * propia en la galería de la comunidad.
 *
 * Reglas:
 * - Solo el propietario de la plantilla puede publicarla o retirarla.
 * - Para publicar, el autor debe ser profesional (NUTRITIONIST/DOCTOR) o coordinador:
 *   así la galería garantiza plantillas validadas desde el punto de vista clínico.
 * - Al publicar se puede añadir una descripción breve (≤200 caracteres).
 * - Al publicar por primera vez (o tras retirarla) se avisa a toda la comunidad
 *   con una notificación in-app y un correo simulado (bandeja EmailLog).
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser()
  if (auth.error) return auth.error

  const { id } = await ctx.params
  const template = await db.planTemplate.findUnique({ where: { id } })
  if (!template || template.userId !== auth.user.id)
    return fail('La plantilla solicitada no existe.', 404)

  let body: { isPublic?: unknown; description?: unknown }
  try {
    body = await req.json()
  } catch {
    return fail('Cuerpo de la petición no válido.')
  }

  const publish = body.isPublic === true
  const unpublish = body.isPublic === false
  if (!publish && !unpublish)
    return fail('Indica si quieres publicar (isPublic: true) o retirar (isPublic: false) la plantilla.')

  let description = template.description
  if (publish) {
    if (!isProfessional(auth.user.role) && auth.user.role !== 'COORDINATOR')
      return fail(
        'Solo las plantillas creadas por profesionales (nutricionistas, médicos/as o coordinación) pueden publicarse en la comunidad.',
        403
      )

    if (typeof body.description === 'string' && body.description.trim()) {
      description = body.description.trim().replace(/\s+/g, ' ')
      if (description.length > MAX_DESCRIPTION)
        return fail(`La descripción no puede superar los ${MAX_DESCRIPTION} caracteres.`)
    }
    if (!description)
      return fail('Añade una breve descripción para que la comunidad sepa para quién es esta plantilla.')

    // No publicar plantillas vacías
    let count = 0
    try {
      const parsed: unknown = JSON.parse(template.days)
      if (Array.isArray(parsed)) count = parsed.length
    } catch {
      count = 0
    }
    if (count === 0)
      return fail('Esta plantilla no tiene recetas guardadas y no se puede publicar.')
  }

  const wasPublic = template.isPublic

  const updated = await db.planTemplate.update({
    where: { id },
    data: { isPublic: publish, description, publishedAt: publish ? new Date() : template.publishedAt },
  })

  // Al publicar (transición a público) se avisa a toda la comunidad activa:
  // notificación in-app + correo simulado. Fire-and-forget, nunca rompe la respuesta.
  if (publish && !wasPublic) {
    const audience = await db.user.findMany({
      where: { status: 'ACTIVE', id: { not: auth.user.id } },
      select: { id: true, email: true, name: true },
    })
    const shortDesc = updated.description && updated.description.length > 120
      ? `${updated.description.slice(0, 117)}…`
      : updated.description ?? ''
    const roleLabel =
      auth.user.role === 'NUTRITIONIST'
        ? 'nutricionista'
        : auth.user.role === 'DOCTOR'
          ? 'médico/a'
          : 'coordinación'
    notifyManyAsync(
      audience.map((u) => ({
        userId: u.id,
        type: 'TEMPLATE' as const,
        title: 'Nueva plantilla de menú en la comunidad',
        body: `${auth.user.name} (${roleLabel}) ha publicado la plantilla «${updated.name}»${shortDesc ? `: ${shortDesc}` : '.'} Ya puedes aplicarla a tu plan semanal con un clic.`,
        linkView: 'plan',
      })),
      auth.user.id
    )
    for (const u of audience) {
      sendEmailAsync({
        toUserId: u.id,
        toEmail: u.email,
        subject: `Nueva plantilla de menú en la comunidad: «${updated.name}»`,
        body: `Hola ${u.name}:

${auth.user.name} ha publicado una nueva plantilla de menú en la comunidad de Simbiosis:

«${updated.name}»${shortDesc ? `\n${shortDesc}` : ''}

Puedes aplicarla a tu plan semanal desde «Mi plan semanal» → «Mis plantillas» → pestaña «Comunidad».

Un saludo,
El equipo de Simbiosis`,
        kind: 'TEMPLATE_PUBLISHED',
      })
    }
  }

  return ok({ id: updated.id, isPublic: updated.isPublic, description: updated.description })
}
