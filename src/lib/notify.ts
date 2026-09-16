import { db } from '@/lib/db'

export type NotificationType =
  | 'REPLY'
  | 'COMMENT'
  | 'RATING'
  | 'FAVORITE'
  | 'LIKE'
  | 'ACCOUNT'
  | 'MODERATION'
  | 'PLAN'
  | 'TEMPLATE'

export interface NotifyInput {
  /** Usuario que recibe la notificación. */
  userId: string
  type: NotificationType
  title: string
  body: string
  /** Vista SPA destino (ver src/lib/store.ts View). */
  linkView?: string
  /** Id del recurso para la vista destino. */
  linkId?: string
}

/**
 * Crea una notificación in-app (fire-and-forget). Los errores se tragan para no
 * afectar a la petición principal. Es silenciosa si userId coincide con el actor
 * (no nos notificamos a nosotros mismos).
 */
export async function notify(input: NotifyInput, actorId?: string): Promise<void> {
  try {
    if (actorId && actorId === input.userId) return
    await db.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        linkView: input.linkView ?? null,
        linkId: input.linkId ?? null,
      },
    })
  } catch {
    // fire-and-forget: nunca romper la petición principal por una notificación
  }
}

/** Variante "void-safe" para usar inline sin await. */
export function notifyAsync(input: NotifyInput, actorId?: string): void {
  void notify(input, actorId)
}

/**
 * Crea notificaciones in-app para varios usuarios de una vez (fire-and-forget).
 * Se salta al actor para no notificarse a sí mismo. Errores silenciosos.
 */
export async function notifyMany(inputs: NotifyInput[], actorId?: string): Promise<void> {
  try {
    const filtered = actorId ? inputs.filter((i) => i.userId !== actorId) : inputs
    if (filtered.length === 0) return
    await db.notification.createMany({
      data: filtered.map((i) => ({
        userId: i.userId,
        type: i.type,
        title: i.title,
        body: i.body,
        linkView: i.linkView ?? null,
        linkId: i.linkId ?? null,
      })),
    })
  } catch {
    // fire-and-forget: nunca romper la petición principal
  }
}

/** Variante "void-safe" de notifyMany. */
export function notifyManyAsync(inputs: NotifyInput[], actorId?: string): void {
  void notifyMany(inputs, actorId)
}
