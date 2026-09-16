import { db } from '@/lib/db'

export function snippetOf(text: string, max = 140): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max).trimEnd()}…` : clean
}

export type TargetPreview = {
  title?: string
  name?: string
  snippet: string
  image?: string
  role?: string
  status?: string
}

/** Busca el contenido denunciado y devuelve una vista previa (o null si ya no existe). */
export async function buildTargetPreview(
  targetType: string,
  targetId: string
): Promise<TargetPreview | null> {
  switch (targetType) {
    case 'RECIPE': {
      const recipe = await db.recipe.findUnique({ where: { id: targetId } })
      if (!recipe) return null
      return {
        title: recipe.title,
        snippet: snippetOf(recipe.description),
        image: recipe.image || undefined,
      }
    }
    case 'COMMENT': {
      const comment = await db.comment.findUnique({
        where: { id: targetId },
        include: { recipe: true },
      })
      if (!comment) return null
      return {
        title: comment.recipe.title,
        snippet: snippetOf(comment.content),
        image: comment.recipe.image || undefined,
      }
    }
    case 'THREAD': {
      const thread = await db.thread.findUnique({ where: { id: targetId } })
      if (!thread) return null
      return { title: thread.title, snippet: snippetOf(thread.content) }
    }
    case 'REPLY': {
      const reply = await db.reply.findUnique({
        where: { id: targetId },
        include: { thread: true },
      })
      if (!reply) return null
      return { title: reply.thread.title, snippet: snippetOf(reply.content) }
    }
    case 'PUBLICATION': {
      const publication = await db.healthPublication.findUnique({ where: { id: targetId } })
      if (!publication) return null
      return { title: publication.title, snippet: snippetOf(publication.content) }
    }
    case 'USER': {
      const user = await db.user.findUnique({ where: { id: targetId } })
      if (!user) return null
      return {
        name: user.name,
        role: user.role,
        status: user.status,
        snippet: user.bio ? snippetOf(user.bio) : '',
      }
    }
    default:
      return null
  }
}

/** Comprueba si el contenido denunciado sigue existiendo. */
export async function targetExists(targetType: string, targetId: string): Promise<boolean> {
  switch (targetType) {
    case 'RECIPE':
      return (await db.recipe.count({ where: { id: targetId } })) > 0
    case 'COMMENT':
      return (await db.comment.count({ where: { id: targetId } })) > 0
    case 'THREAD':
      return (await db.thread.count({ where: { id: targetId } })) > 0
    case 'REPLY':
      return (await db.reply.count({ where: { id: targetId } })) > 0
    case 'PUBLICATION':
      return (await db.healthPublication.count({ where: { id: targetId } })) > 0
    case 'USER':
      return (await db.user.count({ where: { id: targetId } })) > 0
    default:
      return false
  }
}

/** Marca el contenido denunciado como REMOVED (sin fallo si ya no existe). */
export async function removeContent(targetType: string, targetId: string): Promise<void> {
  switch (targetType) {
    case 'RECIPE':
      await db.recipe.updateMany({ where: { id: targetId }, data: { status: 'REMOVED' } })
      break
    case 'COMMENT':
      await db.comment.updateMany({ where: { id: targetId }, data: { status: 'REMOVED' } })
      break
    case 'THREAD':
      await db.thread.updateMany({ where: { id: targetId }, data: { status: 'REMOVED' } })
      break
    case 'REPLY':
      await db.reply.updateMany({ where: { id: targetId }, data: { status: 'REMOVED' } })
      break
    case 'PUBLICATION':
      await db.healthPublication.updateMany({
        where: { id: targetId },
        data: { status: 'REMOVED' },
      })
      break
  }
}

/** Devuelve el id del autor del contenido denunciado (o null). */
export async function authorOfContent(
  targetType: string,
  targetId: string
): Promise<string | null> {
  switch (targetType) {
    case 'RECIPE': {
      const recipe = await db.recipe.findUnique({
        where: { id: targetId },
        select: { authorId: true },
      })
      return recipe?.authorId ?? null
    }
    case 'COMMENT': {
      const comment = await db.comment.findUnique({
        where: { id: targetId },
        select: { userId: true },
      })
      return comment?.userId ?? null
    }
    case 'THREAD': {
      const thread = await db.thread.findUnique({
        where: { id: targetId },
        select: { userId: true },
      })
      return thread?.userId ?? null
    }
    case 'REPLY': {
      const reply = await db.reply.findUnique({
        where: { id: targetId },
        select: { userId: true },
      })
      return reply?.userId ?? null
    }
    case 'PUBLICATION': {
      const publication = await db.healthPublication.findUnique({
        where: { id: targetId },
        select: { userId: true },
      })
      return publication?.userId ?? null
    }
    default:
      return null
  }
}

/** Suspende a un usuario y borra sus sesiones activas. */
export async function suspendUserAndClearSessions(userId: string): Promise<void> {
  await Promise.all([
    db.user.update({ where: { id: userId }, data: { status: 'SUSPENDED' } }),
    db.session.deleteMany({ where: { userId } }),
  ])
}
