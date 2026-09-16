import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireCoordinator } from '@/lib/api-helpers'
import {
  removeContent,
  authorOfContent,
  suspendUserAndClearSessions,
} from '@/lib/reports'
import { notifyAsync } from '@/lib/notify'
import { sendEmailAsync } from '@/lib/emails'

const ACTIONS = ['DISMISS', 'REMOVE_CONTENT', 'SUSPEND_USER'] as const
type ReportAction = (typeof ACTIONS)[number]

const CONTENT_LABELS: Record<string, string> = {
  RECIPE: 'receta',
  COMMENT: 'comentario',
  THREAD: 'hilo del foro',
  REPLY: 'respuesta',
  PUBLICATION: 'publicación de salud',
  USER: 'usuario',
}

/** Frases con concordancia de género para el aviso de retirada de contenido. */
const REMOVAL_PHRASES: Record<string, string> = {
  RECIPE: 'Tu receta ha sido retirada tras la revisión de una denuncia.',
  COMMENT: 'Tu comentario ha sido retirado tras la revisión de una denuncia.',
  THREAD: 'Tu hilo del foro ha sido retirado tras la revisión de una denuncia.',
  REPLY: 'Tu respuesta ha sido retirada tras la revisión de una denuncia.',
  PUBLICATION: 'Tu publicación de salud ha sido retirada tras la revisión de una denuncia.',
}

/**
 * PATCH /api/reports/[id] — solo coordinador.
 * Body: { resolution: "DISMISS" | "REMOVE_CONTENT" | "SUSPEND_USER", note? }
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user: coordinator, error } = await requireCoordinator()
  if (error) return error

  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail('El cuerpo de la petición no es válido.', 400)
  }

  const { resolution, note } = (body ?? {}) as Record<string, unknown>
  if (typeof resolution !== 'string' || !ACTIONS.includes(resolution as ReportAction)) {
    return fail('La resolución indicada no es válida.', 400)
  }

  const report = await db.report.findUnique({ where: { id } })
  if (!report) return fail('Denuncia no encontrada.', 404)
  if (report.status !== 'OPEN') {
    return fail('Esta denuncia ya ha sido gestionada.', 400)
  }

  const cleanNote = typeof note === 'string' && note.trim().length > 0 ? note.trim() : null
  let status = 'RESOLVED'
  let resolutionText: string

  if (resolution === 'DISMISS') {
    status = 'DISMISSED'
    resolutionText = cleanNote ?? 'Denuncia desestimada.'
  } else if (resolution === 'REMOVE_CONTENT') {
    if (report.targetType === 'USER') {
      const targetUser = await db.user.findUnique({ where: { id: report.targetId } })
      if (targetUser && targetUser.role === 'COORDINATOR') {
        return fail('No puedes suspender cuentas de coordinador.', 403)
      }
      if (targetUser) {
        await suspendUserAndClearSessions(report.targetId)
        notifyAsync({
          userId: targetUser.id,
          type: 'MODERATION',
          title: 'Cuenta suspendida',
          body: `Tu cuenta ha sido suspendida tras la revisión de una denuncia.${cleanNote ? ` Motivo: ${cleanNote}` : ''}`,
        })
        sendEmailAsync({
          toUserId: targetUser.id,
          toEmail: targetUser.email,
          subject: 'Tu cuenta de Simbiosis ha sido suspendida',
          body: `Hola ${targetUser.name}:

Tu cuenta ha sido suspendida tras la revisión de una denuncia por el coordinador de Simbiosis.${cleanNote ? ` Motivo indicado: ${cleanNote}` : ''}

Si crees que se trata de un error, responde a este correo para que el equipo pueda revisar tu caso.

El equipo de Simbiosis`,
          kind: 'ACCOUNT_SUSPENDED',
        })
      }
    } else {
      await removeContent(report.targetType, report.targetId)
      const authorId = await authorOfContent(report.targetType, report.targetId)
      if (authorId) {
        const base =
          REMOVAL_PHRASES[report.targetType] ??
          `Tu ${CONTENT_LABELS[report.targetType] ?? 'contenido'} ha sido retirado tras la revisión de una denuncia.`
        notifyAsync({
          userId: authorId,
          type: 'MODERATION',
          title: 'Contenido retirado',
          body: `${base}${cleanNote ? ` Motivo: ${cleanNote}` : ''}`,
        })
        const author = await db.user.findUnique({ where: { id: authorId } })
        if (author) {
          sendEmailAsync({
            toUserId: author.id,
            toEmail: author.email,
            subject: 'Se ha retirado tu contenido en Simbiosis',
            body: `Hola ${author.name}:

${base}${cleanNote ? ` Motivo indicado: ${cleanNote}` : ''}

Recuerda las normas de la comunidad: la información de salud debe ser segura y contrastada, y el respeto es imprescindible. Puedes consultar la guía de la comunidad desde la plataforma.

El equipo de Simbiosis`,
            kind: 'CONTENT_REMOVED',
          })
        }
      }
    }
    resolutionText = cleanNote ?? 'Contenido eliminado por el coordinador.'
  } else {
    // SUSPEND_USER: si el objetivo es un usuario se suspende directamente;
    // si es contenido, se suspende a su autor.
    const userId =
      report.targetType === 'USER'
        ? report.targetId
        : await authorOfContent(report.targetType, report.targetId)

    if (userId) {
      const targetUser = await db.user.findUnique({ where: { id: userId } })
      if (targetUser && targetUser.role === 'COORDINATOR') {
        return fail('No puedes suspender cuentas de coordinador.', 403)
      }
      if (targetUser) {
        await suspendUserAndClearSessions(userId)
        notifyAsync({
          userId: targetUser.id,
          type: 'MODERATION',
          title: 'Cuenta suspendida',
          body: `Tu cuenta ha sido suspendida tras la revisión de una denuncia.${cleanNote ? ` Motivo: ${cleanNote}` : ''}`,
        })
        sendEmailAsync({
          toUserId: targetUser.id,
          toEmail: targetUser.email,
          subject: 'Tu cuenta de Simbiosis ha sido suspendida',
          body: `Hola ${targetUser.name}:

Tu cuenta ha sido suspendida tras la revisión de una denuncia por el coordinador de Simbiosis.${cleanNote ? ` Motivo indicado: ${cleanNote}` : ''}

Si crees que se trata de un error, responde a este correo para que el equipo pueda revisar tu caso.

El equipo de Simbiosis`,
          kind: 'ACCOUNT_SUSPENDED',
        })
      }
    }
    resolutionText = cleanNote ?? 'Usuario suspendido por el coordinador.'
  }

  const updated = await db.report.update({
    where: { id },
    data: { status, resolution: resolutionText, resolvedById: coordinator.id },
    include: {
      reporter: { select: { id: true, name: true, role: true } },
      resolver: { select: { id: true, name: true } },
    },
  })

  return ok({
    report: {
      id: updated.id,
      targetType: updated.targetType,
      targetId: updated.targetId,
      reason: updated.reason,
      details: updated.details,
      status: updated.status,
      resolution: updated.resolution,
      createdAt: updated.createdAt.toISOString(),
      reporter: updated.reporter,
      resolvedBy: updated.resolver,
    },
  })
}
