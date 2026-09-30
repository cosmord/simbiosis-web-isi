import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireProfessional } from '@/lib/api-helpers'
import { getAuthUser } from '@/lib/auth'

const PUBLICATION_CATEGORIES = [
  'NUTRICION',
  'ESTILO_DE_VIDA',
  'BIENESTAR_EMOCIONAL',
  'TRATAMIENTO',
]

// GET /api/publications — listado público con filtro de categoría y estado de like del usuario
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const category = (searchParams.get('category') ?? 'ALL').trim().toUpperCase()

  const me = await getAuthUser()

  const publications = await db.healthPublication.findMany({
    where: { status: 'PUBLISHED' },
    include: {
      user: { select: { id: true, name: true, role: true } },
      likes: { select: { userId: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  let items = publications.map((p) => ({
    id: p.id,
    title: p.title,
    content: p.content,
    category: p.category,
    createdAt: p.createdAt.toISOString(),
    status: p.status,
    author: { id: p.user.id, name: p.user.name, role: p.user.role },
    likesCount: p.likes.length,
    likedByMe: me ? p.likes.some((l) => l.userId === me.id) : false,
  }))

  if (category !== 'ALL' && PUBLICATION_CATEGORIES.includes(category)) {
    items = items.filter((p) => p.category === category)
  }

  return ok({ publications: items })
}

// POST /api/publications — crear publicación de salud (solo NUTRITIONIST o DOCTOR)
export async function POST(req: NextRequest) {
  const { user, error } = await requireProfessional()
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

  if (!title) return fail('El título de la publicación es obligatorio.', 400)
  if (!content) return fail('El contenido de la publicación es obligatorio.', 400)
  if (!PUBLICATION_CATEGORIES.includes(category))
    return fail('La categoría de la publicación no es válida.', 400)

  const publication = await db.healthPublication.create({
    data: { title, content, category, userId: user.id },
    include: { user: { select: { id: true, name: true, role: true } } },
  })

  return ok(
    {
      publication: {
        id: publication.id,
        title: publication.title,
        content: publication.content,
        category: publication.category,
        createdAt: publication.createdAt.toISOString(),
        status: publication.status,
        author: {
          id: publication.user.id,
          name: publication.user.name,
          role: publication.user.role,
        },
        likesCount: 0,
        likedByMe: false,
      },
    },
    201
  )
}
