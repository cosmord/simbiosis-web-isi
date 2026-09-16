import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser, requireCoordinator } from '@/lib/api-helpers'
import { buildTargetPreview, targetExists } from '@/lib/reports'

const TARGET_TYPES = ['RECIPE', 'COMMENT', 'THREAD', 'REPLY', 'PUBLICATION', 'USER']
const REASONS = ['CONTENIDO_INADECUADO', 'INFO_SALUD_RIESGOSA', 'SPAM', 'ACOSO', 'OTRO']
const REPORT_STATUS = ['OPEN', 'RESOLVED', 'DISMISSED', 'ALL']

/** GET /api/reports?status=OPEN|RESOLVED|DISMISSED|ALL — solo coordinador. */
export async function GET(req: NextRequest) {
  const { error } = await requireCoordinator()
  if (error) return error

  const status = req.nextUrl.searchParams.get('status') ?? 'ALL'
  if (!REPORT_STATUS.includes(status)) {
    return fail('El estado indicado no es válido.', 400)
  }

  const reports = await db.report.findMany({
    where: status === 'ALL' ? {} : { status },
    orderBy: { createdAt: 'desc' },
    include: {
      reporter: { select: { id: true, name: true, role: true } },
      resolver: { select: { id: true, name: true } },
    },
  })

  const enriched = await Promise.all(
    reports.map(async (r) => ({
      id: r.id,
      targetType: r.targetType,
      targetId: r.targetId,
      reason: r.reason,
      details: r.details,
      status: r.status,
      resolution: r.resolution,
      createdAt: r.createdAt.toISOString(),
      reporter: r.reporter,
      targetPreview: await buildTargetPreview(r.targetType, r.targetId),
      resolvedBy: r.resolver,
    }))
  )

  return ok({ reports: enriched })
}

/** POST /api/reports — cualquier usuario con sesión activa. */
export async function POST(req: NextRequest) {
  const { user: auth, error } = await requireUser()
  if (error) return error

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail('El cuerpo de la petición no es válido.', 400)
  }

  const { targetType, targetId, reason, details } = (body ?? {}) as Record<string, unknown>

  if (typeof targetType !== 'string' || !TARGET_TYPES.includes(targetType)) {
    return fail('El tipo de contenido a denunciar no es válido.', 400)
  }
  if (typeof targetId !== 'string' || targetId.length === 0) {
    return fail('Falta el identificador del contenido a denunciar.', 400)
  }
  if (typeof reason !== 'string' || !REASONS.includes(reason)) {
    return fail('El motivo de la denuncia no es válido.', 400)
  }

  const exists = await targetExists(targetType, targetId)
  if (!exists) {
    return fail('El contenido que intentas denunciar no existe.', 404)
  }

  const cleanDetails =
    typeof details === 'string' && details.trim().length > 0 ? details.trim() : null

  const report = await db.report.create({
    data: {
      targetType,
      targetId,
      reason,
      details: cleanDetails,
      reporterId: auth.id,
      status: 'OPEN',
    },
  })

  return ok(
    {
      report: {
        id: report.id,
        targetType: report.targetType,
        targetId: report.targetId,
        reason: report.reason,
        details: report.details,
        status: report.status,
        createdAt: report.createdAt.toISOString(),
      },
    },
    201
  )
}
