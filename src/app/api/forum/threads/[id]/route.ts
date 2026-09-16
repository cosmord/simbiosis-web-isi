import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail } from '@/lib/api-helpers'

type RouteContext = { params: Promise<{ id: string }> }

// GET /api/forum/threads/[id] — detalle público con respuestas; incrementa views en +1
export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params

  const thread = await db.thread.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, role: true, bio: true, createdAt: true } },
      replies: {
        where: { status: 'VISIBLE' },
        include: { user: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!thread || thread.status === 'REMOVED') return fail('Hilo no encontrado.', 404)

  // Incremento de vistas "fire and forget": no bloquea ni falla la respuesta.
  void db.thread
    .update({ where: { id }, data: { views: { increment: 1 } } })
    .catch(() => {})

  return ok({
    thread: {
      id: thread.id,
      title: thread.title,
      content: thread.content,
      category: thread.category,
      views: thread.views,
      status: thread.status,
      createdAt: thread.createdAt.toISOString(),
    },
    author: {
      id: thread.user.id,
      name: thread.user.name,
      role: thread.user.role,
      bio: thread.user.bio,
      createdAt: thread.user.createdAt.toISOString(),
    },
    replies: thread.replies.map((r) => ({
      id: r.id,
      content: r.content,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      author: { id: r.user.id, name: r.user.name, role: r.user.role },
    })),
    repliesCount: thread.replies.length,
  })
}
