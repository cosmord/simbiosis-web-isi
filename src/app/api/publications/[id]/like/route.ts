import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser } from '@/lib/api-helpers'

type RouteContext = { params: Promise<{ id: string }> }

// POST /api/publications/[id]/like — dar/quitar like (toggle, requiere autenticación)
export async function POST(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params
  const { user, error } = await requireUser()
  if (error) return error

  const publication = await db.healthPublication.findUnique({
    where: { id },
    select: { id: true, status: true },
  })
  if (!publication || publication.status === 'REMOVED')
    return fail('Publicación no encontrada.', 404)

  const existing = await db.publicationLike.findUnique({
    where: { publicationId_userId: { publicationId: id, userId: user.id } },
  })

  if (existing) {
    await db.publicationLike.delete({ where: { id: existing.id } })
  } else {
    await db.publicationLike.create({ data: { publicationId: id, userId: user.id } })
  }

  const likesCount = await db.publicationLike.count({ where: { publicationId: id } })

  return ok({ liked: !existing, likesCount })
}
