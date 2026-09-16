'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  Apple,
  BookOpenCheck,
  CalendarDays,
  Heart,
  Loader2,
  Pill,
  Plus,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RoleBadge, UserAvatar } from './user-bits'
import { EmptyState } from './empty-state'
import { api, jsonBody } from '@/lib/client-api'
import { useSimbiosis } from '@/lib/store'
import { longDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  PUBLICATION_CATEGORIES,
  type PublicationCardData,
  type PublicationCategory,
} from '@/lib/types'

const CATEGORY_META: Record<
  PublicationCategory,
  { icon: typeof Apple; classes: string; iconClasses: string }
> = {
  NUTRICION: {
    icon: Apple,
    classes: 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40',
    iconClasses: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  },
  ESTILO_DE_VIDA: {
    icon: Activity,
    classes: 'border-teal-200 bg-teal-50 dark:border-teal-900 dark:bg-teal-950/40',
    iconClasses: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300',
  },
  BIENESTAR_EMOCIONAL: {
    icon: Heart,
    classes: 'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40',
    iconClasses: 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300',
  },
  TRATAMIENTO: {
    icon: Pill,
    classes: 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40',
    iconClasses: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  },
}

/** Consejos de salud publicados por profesionales, con me gusta y lectura completa. */
export function PublicationsView() {
  const { user, setAuthOpen, refreshKey } = useSimbiosis()
  const [publications, setPublications] = useState<PublicationCardData[] | null>(null)
  const [loading, setLoading] = useState(true)

  const [reading, setReading] = useState<PublicationCardData | null>(null)
  const [publishOpen, setPublishOpen] = useState(false)
  const [pubTitle, setPubTitle] = useState('')
  const [pubCategory, setPubCategory] = useState<PublicationCategory>('NUTRICION')
  const [pubContent, setPubContent] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [likedIds, setLikedIds] = useState<Record<string, { liked: boolean; count: number }>>({})

  const isProfessional = user?.role === 'NUTRITIONIST' || user?.role === 'DOCTOR'

  useEffect(() => {
    let active = true
    setLoading(true)
    api<{ publications: PublicationCardData[] }>('/api/publications')
      .then((d) => active && setPublications(d.publications))
      .catch((err) => {
        if (!active) return
        setPublications([])
        toast.error(err instanceof Error ? err.message : 'No se pudieron cargar los consejos.')
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [refreshKey])

  async function toggleLike(pub: PublicationCardData) {
    if (!user) {
      toast.info('Inicia sesión para marcar que te gusta un consejo.')
      setAuthOpen(true)
      return
    }
    try {
      const res = await api<{ liked: boolean; likesCount: number }>(
        `/api/publications/${pub.id}/like`,
        jsonBody('POST', {})
      )
      setLikedIds((prev) => ({ ...prev, [pub.id]: { liked: res.liked, count: res.likesCount } }))
      setReading((r) =>
        r && r.id === pub.id
          ? { ...r, likedByMe: res.liked, likesCount: res.likesCount }
          : r
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar el «me gusta».')
    }
  }

  async function publish() {
    if (!pubTitle.trim() || !pubContent.trim()) {
      toast.warning('Completa el título y el contenido del consejo.')
      return
    }
    setPublishing(true)
    try {
      await api('/api/publications', jsonBody('POST', {
        title: pubTitle.trim(),
        category: pubCategory,
        content: pubContent.trim(),
      }))
      setPublishOpen(false)
      setPubTitle('')
      setPubContent('')
      toast.success('Consejo publicado. ¡Gracias por compartir tu conocimiento!')
      // Recargar listado
      const d = await api<{ publications: PublicationCardData[] }>('/api/publications')
      setPublications(d.publications)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo publicar el consejo.')
    } finally {
      setPublishing(false)
    }
  }

  function likesFor(pub: PublicationCardData) {
    return likedIds[pub.id] ?? { liked: pub.likedByMe, count: pub.likesCount }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <BookOpenCheck aria-hidden="true" className="size-6 text-primary" />
            Consejos de salud
          </h1>
          <p className="mt-0.5 max-w-xl text-sm text-muted-foreground">
            Artículos divulgativos publicados por los nutricionistas y médicos de la
            comunidad para cuidar tu día a día con EII.
          </p>
        </div>
        {isProfessional && (
          <Button onClick={() => setPublishOpen(true)} className="min-h-11">
            <Plus aria-hidden="true" className="size-4" />
            Publicar consejo
          </Button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="mt-3 h-5 w-3/4" />
              <Skeleton className="mt-3 h-16 w-full" />
            </Card>
          ))}
        </div>
      ) : publications && publications.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {publications.map((pub) => {
            const meta = CATEGORY_META[pub.category]
            const Icon = meta.icon
            const likes = likesFor(pub)
            return (
              <motion.div key={pub.id} whileHover={{ y: -4 }} transition={{ duration: 0.18 }} className="h-full">
                <Card className={cn('flex h-full flex-col border', meta.classes)}>
                  <CardHeader className="space-y-2.5 pb-3">
                    <div className="flex items-center justify-between">
                      <span className={cn('flex size-9 items-center justify-center rounded-lg', meta.iconClasses)}>
                        <Icon aria-hidden="true" className="size-4.5" />
                      </span>
                      <Badge variant="outline" className="border-border/70 bg-background/60">
                        {PUBLICATION_CATEGORIES.find((c) => c.value === pub.category)?.label}
                      </Badge>
                    </div>
                    <h2 className="line-clamp-2 font-semibold leading-snug tracking-tight">
                      {pub.title}
                    </h2>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-3">
                    <p className="line-clamp-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                      {pub.content}
                    </p>
                    <div className="mt-auto space-y-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <UserAvatar name={pub.author.name} role={pub.author.role} className="size-6" />
                        <span className="truncate font-medium text-foreground/80">{pub.author.name}</span>
                        <RoleBadge role={pub.author.role} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-pressed={likes.liked}
                          aria-label={likes.liked ? 'Quitar me gusta' : 'Marcar me gusta'}
                          onClick={() => void toggleLike(pub)}
                          className="min-h-9 gap-1.5"
                        >
                          <Heart
                            aria-hidden="true"
                            className={cn('size-4', likes.liked && 'fill-rose-500 text-rose-500')}
                          />
                          {likes.count}
                        </Button>
                        <Button variant="outline" size="sm" className="min-h-9" onClick={() => setReading(pub)}>
                          Leer más
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={BookOpenCheck}
          title="Todavía no hay consejos publicados"
          description="Cuando los profesionales de la comunidad publiquen, los verás aquí."
        />
      )}

      {/* Diálogo de lectura completa */}
      <Dialog open={!!reading} onOpenChange={(o) => !o && setReading(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          {reading && (() => {
            const meta = CATEGORY_META[reading.category]
            const Icon = meta.icon
            const likes = likesFor(reading)
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2.5 pb-1">
                    <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', meta.iconClasses)}>
                      <Icon aria-hidden="true" className="size-4.5" />
                    </span>
                    <Badge variant="outline" className="border-border/70">
                      {PUBLICATION_CATEGORIES.find((c) => c.value === reading.category)?.label}
                    </Badge>
                  </div>
                  <DialogTitle className="text-left text-xl leading-snug">{reading.title}</DialogTitle>
                  <DialogDescription className="flex flex-wrap items-center gap-2 text-left">
                    <UserAvatar name={reading.author.name} role={reading.author.role} className="size-6" />
                    <span className="font-medium text-foreground">{reading.author.name}</span>
                    <RoleBadge role={reading.author.role} />
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays aria-hidden="true" className="size-3.5" />
                      {longDate(reading.createdAt)}
                    </span>
                  </DialogDescription>
                </DialogHeader>
                <div className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                  {reading.content}
                </div>
                <DialogFooter className="items-center justify-between gap-2 sm:justify-between">
                  <Button
                    variant={likes.liked ? 'secondary' : 'outline'}
                    onClick={() => void toggleLike(reading)}
                    className="min-h-11"
                    aria-pressed={likes.liked}
                  >
                    <Heart
                      aria-hidden="true"
                      className={cn('size-4', likes.liked && 'fill-rose-500 text-rose-500')}
                    />
                    {likes.liked ? 'Te gusta' : 'Me gusta'} · {likes.count}
                  </Button>
                  <Button variant="outline" onClick={() => setReading(null)} className="min-h-11">
                    Cerrar
                  </Button>
                </DialogFooter>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Diálogo de publicación (solo profesionales) */}
      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Publicar un consejo de salud</DialogTitle>
            <DialogDescription>
              Tu publicación aparecerá firmada con tu perfil profesional y podrá ser
              valorada por la comunidad.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pub-title">Título</Label>
              <Input
                id="pub-title"
                placeholder="Ej.: Hidratación en EII: claves prácticas"
                value={pubTitle}
                onChange={(e) => setPubTitle(e.target.value)}
                maxLength={150}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pub-category">Categoría</Label>
              <Select value={pubCategory} onValueChange={(v) => setPubCategory(v as PublicationCategory)}>
                <SelectTrigger id="pub-category" className="min-h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PUBLICATION_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pub-content">Contenido</Label>
              <Textarea
                id="pub-content"
                rows={8}
                placeholder="Escribe el consejo completo. Puedes usar saltos de línea para organizarlo…"
                value={pubContent}
                onChange={(e) => setPubContent(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishOpen(false)} disabled={publishing}>
              Cancelar
            </Button>
            <Button onClick={() => void publish()} disabled={publishing}>
              {publishing && <Loader2 className="size-4 animate-spin" />}
              Publicar consejo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
