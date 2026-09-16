'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Bell,
  CheckCheck,
  Heart,
  MessageCircle,
  MessagesSquare,
  Reply,
  ShieldAlert,
  Star,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { api, jsonBody } from '@/lib/client-api'
import { useSimbiosis, type View } from '@/lib/store'
import type { NotificationData, NotificationType, NotificationsResponse } from '@/lib/types'
import { relativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'

const POLL_INTERVAL = 25_000

const TYPE_META: Record<
  NotificationType,
  { icon: typeof Bell; className: string; ring: string }
> = {
  REPLY: { icon: Reply, className: 'text-sky-700 dark:text-sky-300', ring: 'bg-sky-100 dark:bg-sky-950' },
  COMMENT: { icon: MessageCircle, className: 'text-teal-700 dark:text-teal-300', ring: 'bg-teal-100 dark:bg-teal-950' },
  RATING: { icon: Star, className: 'text-amber-700 dark:text-amber-300', ring: 'bg-amber-100 dark:bg-amber-950' },
  FAVORITE: { icon: Heart, className: 'text-rose-700 dark:text-rose-300', ring: 'bg-rose-100 dark:bg-rose-950' },
  LIKE: { icon: Heart, className: 'text-pink-700 dark:text-pink-300', ring: 'bg-pink-100 dark:bg-pink-950' },
  ACCOUNT: { icon: UserCheck, className: 'text-emerald-700 dark:text-emerald-300', ring: 'bg-emerald-100 dark:bg-emerald-950' },
  MODERATION: { icon: ShieldAlert, className: 'text-orange-700 dark:text-orange-300', ring: 'bg-orange-100 dark:bg-orange-950' },
}

const VALID_LINK_VIEWS: View[] = ['recipeDetail', 'threadDetail', 'publications', 'recipes', 'forum', 'profile']

function castView(view: string | null): View | null {
  if (view && (VALID_LINK_VIEWS as string[]).includes(view)) return view as View
  return null
}

/** Campana de notificaciones con badge, popover y sondeo cada 25 s. */
export function NotificationBell() {
  const { navigate } = useSimbiosis()
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await api<NotificationsResponse>('/api/notifications?limit=20')
      setNotifications(data.notifications)
      setUnread(data.unread)
    } catch {
      // silencio: el sondeo no debe molestar
    }
  }, [])

  useEffect(() => {
    // Carga inicial desacoplada (evita setState síncrono dentro del efecto)
    const initial = setTimeout(() => void load(), 0)
    timer.current = setInterval(() => void load(), POLL_INTERVAL)
    const onFocus = () => void load()
    window.addEventListener('focus', onFocus)
    return () => {
      clearTimeout(initial)
      if (timer.current) clearInterval(timer.current)
      window.removeEventListener('focus', onFocus)
    }
  }, [load])

  async function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setLoading(true)
      await load()
      setLoading(false)
    }
  }

  async function markOne(n: NotificationData) {
    if (n.read) return
    setNotifications((prev) => prev.map((p) => (p.id === n.id ? { ...p, read: true } : p)))
    setUnread((u) => Math.max(0, u - 1))
    try {
      await api(`/api/notifications/${n.id}`, jsonBody('PATCH', {}))
    } catch {
      // best effort
    }
  }

  function openNotification(n: NotificationData) {
    void markOne(n)
    const view = castView(n.linkView)
    if (view) navigate(view, n.linkId ? { id: n.linkId } : {})
    setOpen(false)
  }

  async function markAll() {
    try {
      await api('/api/notifications', jsonBody('PATCH', {}))
      setNotifications((prev) => prev.map((p) => ({ ...p, read: true })))
      setUnread(0)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudieron marcar las notificaciones.')
    }
  }

  async function clearRead() {
    try {
      await api('/api/notifications', { method: 'DELETE' })
      setNotifications((prev) => prev.filter((p) => !p.read))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudieron borrar las notificaciones.')
    }
  }

  async function dismissOne(e: React.MouseEvent, n: NotificationData) {
    e.stopPropagation()
    setNotifications((prev) => prev.filter((p) => p.id !== n.id))
    if (!n.read) setUnread((u) => Math.max(0, u - 1))
    try {
      await api(`/api/notifications/${n.id}`, { method: 'DELETE' })
    } catch {
      // best effort
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={
            unread > 0 ? `Notificaciones: ${unread} sin leer` : 'Notificaciones'
          }
          className="relative rounded-full"
        >
          <Bell className="size-5" />
          {unread > 0 && (
            <span
              className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm"
              aria-hidden="true"
            >
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] p-0 sm:w-96" role="region" aria-label="Notificaciones">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Notificaciones</h2>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2 text-xs"
              onClick={() => void markAll()}
              disabled={unread === 0}
            >
              <CheckCheck aria-hidden="true" className="size-3.5" />
              Marcar leídas
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Borrar notificaciones leídas"
              title="Borrar las leídas"
              className="size-8 text-muted-foreground hover:text-destructive"
              onClick={() => void clearRead()}
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </Button>
          </div>
        </div>

        {loading && notifications.length === 0 ? (
          <div className="space-y-3 p-4" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="size-9 shrink-0 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-full animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Bell aria-hidden="true" className="size-5 text-muted-foreground" />
            </span>
            <p className="text-sm font-medium">Todo tranquilo</p>
            <p className="text-xs text-muted-foreground">
              Aquí verás las respuestas a tus hilos, comentarios y valoraciones de tus
              recetas y avisos del coordinador.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[26rem]">
            <ul className="divide-y">
              {notifications.map((n) => {
                const meta = TYPE_META[n.type] ?? TYPE_META.COMMENT
                const Icon = meta.icon
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => openNotification(n)}
                      className={cn(
                        'group flex w-full items-start gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-muted/60 focus-visible:bg-muted/60',
                        !n.read && 'bg-primary/[0.04]'
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full',
                          meta.ring,
                          meta.className
                        )}
                        aria-hidden="true"
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className={cn('truncate text-sm', n.read ? 'font-medium' : 'font-semibold')}>
                            {n.title}
                          </span>
                          {!n.read && (
                            <span className="size-2 shrink-0 rounded-full bg-rose-500" aria-label="Sin leer" />
                          )}
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-muted-foreground">
                          {n.body}
                        </span>
                        <span className="mt-1 block text-[11px] text-muted-foreground/70">
                          {relativeTime(n.createdAt)}
                        </span>
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label={`Eliminar notificación: ${n.title}`}
                        onClick={(e) => void dismissOne(e, n)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            void dismissOne(e as unknown as React.MouseEvent, n)
                          }
                        }}
                        className="mt-1 hidden size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground/50 transition-colors hover:bg-muted hover:text-destructive group-hover:flex"
                      >
                        <X className="size-3.5" aria-hidden="true" />
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  )
}
