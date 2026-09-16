import { db } from '@/lib/db'
import { ok, requireCoordinator } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

// GET /api/coordinator/emails — bandeja simulada de correos enviados por la plataforma
export async function GET() {
  const { error } = await requireCoordinator()
  if (error) return error

  const emails = await db.emailLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { toUser: { select: { id: true, name: true, role: true } } },
  })

  return ok({
    emails: emails.map((e) => ({
      id: e.id,
      toEmail: e.toEmail,
      toUser: e.toUser
        ? { id: e.toUser.id, name: e.toUser.name, role: e.toUser.role }
        : null,
      subject: e.subject,
      body: e.body,
      kind: e.kind,
      createdAt: e.createdAt.toISOString(),
    })),
  })
}
