import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser } from '@/lib/api-helpers'

type RouteContext = { params: Promise<{ id: string }> }

// POST /api/forum/threads/[id]/replies — responder a un hilo (requiere autenticación)
export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params
  const { user, error } = await requireUser()
  if (error) return error

  const thread = await db.thread.findUnique({
    where: { id },
    select: { id: true, status: true },
  })
  if (!thread || thread.status === 'REMOVED') return fail('Hilo no encontrado.', 404)

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return fail('Cuerpo de la petición no válido.', 400)
  }

  const content = typeof body.content === 'string' ? body.content.trim() : ''
  if (!content) return fail('La respuesta no puede estar vacía.', 400)

  const reply = await db.reply.create({
    data: { content, threadId: id, userId: user.id },
    include: { user: { select: { id: true, name: true, role: true } } },
  })

  return ok(
    {
      reply: {
        id: reply.id,
        content: reply.content,
        status: reply.status,
        createdAt: reply.createdAt.toISOString(),
        author: { id: reply.user.id, name: reply.user.name, role: reply.user.role },
      },
    },
    201
  )
}
