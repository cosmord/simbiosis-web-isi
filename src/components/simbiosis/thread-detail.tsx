'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft,
  Eye,
  Flag,
  Loader2,
  MessagesSquare,
  Send,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { RoleBadge, UserAvatar } from './user-bits'
import { EmptyState } from './empty-state'
import { api, jsonBody } from '@/lib/client-api'
import { useSimbiosis } from '@/lib/store'
import { longDate, relativeTime } from '@/lib/format'
import { THREAD_CATEGORIES, type ThreadDetailData } from '@/lib/types'

/** Detalle de un hilo del foro con sus respuestas. */
export function ThreadDetail({ id }: { id: string }) {
  const { user, navigate, setAuthOpen, openReport } = useSimbiosis()
  const [data, setData] = useState<ThreadDetailData | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api<ThreadDetailData>(`/api/forum/threads/${id}`)
      setData(d)
      setNotFound(false)
    } catch (err) {
      setNotFound(true)
      toast.error(err instanceof Error ? err.message : 'No se pudo cargar el hilo.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  async function sendReply() {
    if (!user) {
      toast.info('Inicia sesión para responder en el foro.')
      setAuthOpen(true)
      return
    }
    if (!reply.trim()) {
      toast.warning('Escribe tu respuesta antes de enviarla.')
      return
    }
    setSending(true)
    try {
      await api(`/api/forum/threads/${id}/replies`, jsonBody('POST', { content: reply.trim() }))
      setReply('')
      toast.success('Respuesta publicada. ¡Gracias por aportar!')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo publicar la respuesta.')
    } finally {
      setSending(false)
    }
  }

  async function deleteReply(replyId: string) {
    try {
      await api(`/api/replies/${replyId}`, jsonBody('DELETE', {}))
      toast.success('Respuesta eliminada.')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar la respuesta.')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-44" />
        <Card className="p-6">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="mt-4 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-3/4" />
        </Card>
        <Skeleton className="h-40 rounded-xl" />
      </div>
    )
  }

  if (notFound || !data) {
    return (
      <EmptyState
        icon={MessagesSquare}
        title="No se encontró este hilo"
        description="Puede que haya sido eliminado por su autor o retirado por moderación."
        actionLabel="Volver al foro"
        onAction={() => navigate('forum')}
      />
    )
  }

  const catLabel = THREAD_CATEGORIES.find((c) => c.value === data.thread.category)?.label

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Button variant="ghost" size="sm" onClick={() => navigate('forum')} className="-ml-2 min-h-9">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Volver al foro
      </Button>

      {/* Hilo original */}
      <Card>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            {catLabel && (
              <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
                {catLabel}
              </Badge>
            )}
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Eye aria-hidden="true" className="size-3.5" />
              {data.thread.views} visitas
            </span>
          </div>
          <h1 className="text-xl font-bold leading-snug tracking-tight sm:text-2xl">
            {data.thread.title}
          </h1>
            <div className="flex items-center gap-2.5">
            <UserAvatar name={data.author.name} role={data.author.role} className="size-9" />
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  className="text-sm font-semibold outline-none hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => navigate('userProfile', { id: data.author.id })}
                  aria-label={`Ver el perfil público de ${data.author.name}`}
                >
                  {data.author.name}
                </button>
                <RoleBadge role={data.author.role} />
              </div>
              <p className="text-xs text-muted-foreground">{relativeTime(data.thread.createdAt)}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto min-h-9 gap-1.5 text-muted-foreground"
              onClick={() => openReport('THREAD', data.thread.id)}
              aria-label="Denunciar este hilo"
            >
              <Flag aria-hidden="true" className="size-3.5" />
              Denunciar
            </Button>
          </div>
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
            {data.thread.content}
          </p>
        </CardContent>
      </Card>

      {/* Respuestas */}
      <section aria-label="Respuestas del hilo" className="space-y-3">
        <h2 className="text-base font-semibold">
          Respuestas ({data.repliesCount})
        </h2>

        {data.replies.length === 0 ? (
          <EmptyState
            icon={MessagesSquare}
            title="Todavía no hay respuestas"
            description="Sé la primera persona en responder y echar una mano."
          />
        ) : (
          <ul className="space-y-3">
            {data.replies.map((r) => (
              <li key={r.id}>
                <Card className="py-4">
                  <CardContent className="space-y-2 px-4">
                    <div className="flex items-center gap-2.5">
                      <UserAvatar name={r.author.name} role={r.author.role} className="size-8" />
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          className="text-sm font-medium outline-none hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() => navigate('userProfile', { id: r.author.id })}
                          aria-label={`Ver el perfil público de ${r.author.name}`}
                        >
                          {r.author.name}
                        </button>
                        <RoleBadge role={r.author.role} />
                      </div>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {relativeTime(r.createdAt)}
                      </span>
                    </div>
                    <p className="whitespace-pre-line text-sm leading-relaxed">{r.content}</p>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 px-2 text-xs text-muted-foreground"
                        onClick={() => openReport('REPLY', r.id)}
                        aria-label={`Denunciar la respuesta de ${r.author.name}`}
                      >
                        <Flag aria-hidden="true" className="size-3" />
                        Denunciar
                      </Button>
                      {user && (user.id === r.author.id || user.role === 'COORDINATOR') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive"
                          onClick={() => void deleteReply(r.id)}
                          aria-label={`Eliminar la respuesta de ${r.author.name}`}
                        >
                          <Trash2 aria-hidden="true" className="size-3" />
                          Eliminar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}

        <Separator className="my-4" />

        {user ? (
          <Card className="p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <UserAvatar name={user.name} role={user.role} className="size-8" />
                <p className="text-sm font-medium">Responder como {user.name}</p>
              </div>
              <Textarea
                rows={3}
                placeholder="Escribe tu respuesta con empatía y rigor…"
                aria-label="Escribir una respuesta"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
              />
              <div className="flex justify-end">
                <Button onClick={() => void sendReply()} disabled={sending} className="min-h-11">
                  {sending ? <Loader2 className="size-4 animate-spin" /> : <Send aria-hidden="true" className="size-4" />}
                  Publicar respuesta
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed p-4">
            <p className="text-sm text-muted-foreground">
              Inicia sesión para unirte a la conversación.
            </p>
            <Button variant="outline" className="min-h-11" onClick={() => setAuthOpen(true)}>
              Iniciar sesión
            </Button>
          </div>
        )}
      </section>
    </div>
  )
}
