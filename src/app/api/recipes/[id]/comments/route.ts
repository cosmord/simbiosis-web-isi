import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser } from '@/lib/api-helpers'

type RouteContext = { params: Promise<{ id: string }> }

// POST /api/recipes/[id]/comments — añadir comentario a una receta (requiere autenticación)
export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params
  const { user, error } = await requireUser()
  if (error) return error

  const recipe = await db.recipe.findUnique({
    where: { id },
    select: { id: true, status: true },
  })
  if (!recipe || recipe.status === 'REMOVED') return fail('Receta no encontrada.', 404)

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return fail('Cuerpo de la petición no válido.', 400)
  }

  const content = typeof body.content === 'string' ? body.content.trim() : ''
  if (!content) return fail('El comentario no puede estar vacío.', 400)

  const comment = await db.comment.create({
    data: { content, userId: user.id, recipeId: id },
    include: { user: { select: { id: true, name: true, role: true } } },
  })

  return ok(
    {
      comment: {
        id: comment.id,
        content: comment.content,
        status: comment.status,
        createdAt: comment.createdAt.toISOString(),
        author: {
          id: comment.user.id,
          name: comment.user.name,
          role: comment.user.role,
        },
      },
    },
    201
  )
}
