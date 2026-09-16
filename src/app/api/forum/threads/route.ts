import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser } from '@/lib/api-helpers'

const THREAD_CATEGORIES = [
  'DIETA_Y_SINTOMAS',
  'RECETAS_Y_COCINA',
  'APOYO_EMOCIONAL',
  'DUDAS_GENERALES',
]

// GET /api/forum/threads — listado público de hilos con filtro por categoría y orden RECENT|ACTIVE
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const category = (searchParams.get('category') ?? 'ALL').trim().toUpperCase()
  const sort = (searchParams.get('sort') ?? 'RECENT').trim().toUpperCase()

  const threads = await db.thread.findMany({
    where: { status: 'VISIBLE' },
    include: {
      user: { select: { id: true, name: true, role: true } },
      replies: {
        where: { status: 'VISIBLE' },
        select: { createdAt: true },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  let items = threads.map((t) => {
    const lastReplyAt = t.replies[0]?.createdAt
    const lastActivityAt =
      lastReplyAt && lastReplyAt.getTime() > t.createdAt.getTime()
        ? lastReplyAt
        : t.createdAt
    return {
      id: t.id,
      title: t.title,
      content: t.content,
      category: t.category,
      views: t.views,
      createdAt: t.createdAt.toISOString(),
      author: { id: t.user.id, name: t.user.name, role: t.user.role },
      repliesCount: t.replies.length,
      lastActivityAt: lastActivityAt.toISOString(),
    }
  })

  if (category !== 'ALL' && THREAD_CATEGORIES.includes(category)) {
    items = items.filter((t) => t.category === category)
  }

  // ACTIVE: ordenar por última actividad (respuestas + createdAt del hilo)
  if (sort === 'ACTIVE') {
    items.sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt))
  }

  // Paginación (offset/limit) aplicada tras ordenar; sin límite si no se pide.
  const total = items.length
  const offsetParam = Number(searchParams.get('offset'))
  const limitParam = Number(searchParams.get('limit'))
  const offset = Number.isInteger(offsetParam) && offsetParam > 0 ? offsetParam : 0
  const limit =
    Number.isInteger(limitParam) && limitParam > 0 && limitParam <= 48 ? limitParam : null
  if (offset > 0) items = items.slice(offset)
  if (limit !== null) items = items.slice(0, limit)

  return ok({ threads: items, total, hasMore: limit !== null ? offset + items.length < total : false })
}

// POST /api/forum/threads — crear hilo (requiere autenticación)
export async function POST(req: NextRequest) {
  const { user, error } = await requireUser()
  if (error) return error

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return fail('Cuerpo de la petición no válido.', 400)
  }

  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const content = typeof body.content === 'string' ? body.content.trim() : ''
  const category = typeof body.category === 'string' ? body.category.trim().toUpperCase() : ''

  if (!title) return fail('El título del hilo es obligatorio.', 400)
  if (!content) return fail('El contenido del hilo es obligatorio.', 400)
  if (!THREAD_CATEGORIES.includes(category))
    return fail('La categoría del hilo no es válida.', 400)

  const thread = await db.thread.create({
    data: { title, content, category, userId: user.id },
    include: { user: { select: { id: true, name: true, role: true } } },
  })

  return ok(
    {
      thread: {
        id: thread.id,
        title: thread.title,
        content: thread.content,
        category: thread.category,
        views: thread.views,
        status: thread.status,
        createdAt: thread.createdAt.toISOString(),
        author: {
          id: thread.user.id,
          name: thread.user.name,
          role: thread.user.role,
        },
        repliesCount: 0,
        lastActivityAt: thread.createdAt.toISOString(),
      },
    },
    201
  )
}
