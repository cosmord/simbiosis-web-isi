'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Eye,
  MessageSquarePlus,
  MessagesSquare,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UserAvatar } from './user-bits'
import { RoleBadge } from './user-bits'
import { EmptyState } from './empty-state'
import { api, jsonBody } from '@/lib/client-api'
import { useSimbiosis } from '@/lib/store'
import { relativeTime } from '@/lib/format'
import {
  THREAD_CATEGORIES,
  type ThreadCardData,
  type ThreadCategory,
} from '@/lib/types'

/** Foro de la comunidad: hilos por categoría con orden por actividad. */
export function ForumView() {
  const { user, navigate, setAuthOpen, refreshKey } = useSimbiosis()
  const [category, setCategory] = useState<string>('ALL')
  const [sort, setSort] = useState('RECENT')
  const [threads, setThreads] = useState<ThreadCardData[] | null>(null)
  const [loading, setLoading] = useState(true)

  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [newCategory, setNewCategory] = useState<ThreadCategory>('DUDAS_GENERALES')
  const [content, setContent] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    api<{ threads: ThreadCardData[] }>(
      `/api/forum/threads?category=${category}&sort=${sort}`
    )
      .then((d) => active && setThreads(d.threads))
      .catch((err) => {
        if (!active) return
        setThreads([])
        toast.error(err instanceof Error ? err.message : 'No se pudo cargar el foro.')
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [category, sort, refreshKey])

  function openNewThread() {
    if (!user) {
      toast.info('Inicia sesión para abrir un hilo en el foro.')
      setAuthOpen(true)
      return
    }
    setOpen(true)
  }

  async function createThread() {
    if (!title.trim() || !content.trim()) {
      toast.warning('Completa el título y el contenido del hilo.')
      return
    }
    setCreating(true)
    try {
      const res = await api<{ thread: { id: string } }>('/api/forum/threads', jsonBody('POST', {
        title: title.trim(),
        category: newCategory,
        content: content.trim(),
      }))
      setOpen(false)
      setTitle('')
      setContent('')
      toast.success('Hilo publicado. ¡Gracias por abrir la conversación!')
      navigate('threadDetail', { id: res.thread.id })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo publicar el hilo.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <MessagesSquare aria-hidden="true" className="size-6 text-primary" />
            Foro de la comunidad
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Comparte dudas, experiencias y apoyo con personas que entienden tu día a día.
          </p>
        </div>
        <Button onClick={openNewThread} className="min-h-11">
          <MessageSquarePlus aria-hidden="true" className="size-4" />
          Crear hilo
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={category} onValueChange={setCategory}>
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 sm:w-auto">
            <TabsTrigger value="ALL" className="min-h-9">Todos</TabsTrigger>
            {THREAD_CATEGORIES.map((c) => (
              <TabsTrigger key={c.value} value={c.value} className="min-h-9">
                {c.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="w-full sm:w-44">
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger aria-label="Ordenar hilos" className="min-h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="RECENT">Más recientes</SelectItem>
              <SelectItem value="ACTIVE">Más activos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="mt-3 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-1/3" />
            </Card>
          ))}
        </div>
      ) : threads && threads.length > 0 ? (
        <div className="space-y-3">
          {threads.map((t) => {
            const catLabel = THREAD_CATEGORIES.find((c) => c.value === t.category)?.label ?? t.category
            return (
              <motion.div key={t.id} whileHover={{ x: 3 }} transition={{ duration: 0.15 }}>
                <Card
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer py-4 transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => navigate('threadDetail', { id: t.id })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      navigate('threadDetail', { id: t.id })
                    }
                  }}
                  aria-label={`Abrir hilo: ${t.title}`}
                >
                  <CardContent className="space-y-2 px-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
                        {catLabel}
                      </Badge>
                      <h2 className="font-semibold leading-snug">{t.title}</h2>
                    </div>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{t.content}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {t.author && (
                        <span className="inline-flex items-center gap-1.5">
                          <UserAvatar name={t.author.name} role={t.author.role} className="size-5" />
                          <span className="font-medium text-foreground/80">{t.author.name}</span>
                          <RoleBadge role={t.author.role} />
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Eye aria-hidden="true" className="size-3.5" />
                        {t.views} visitas
                      </span>
                      <span>{t.repliesCount} respuestas</span>
                      <span className="ml-auto">
                        Última actividad: {relativeTime(t.lastActivityAt ?? t.createdAt)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={MessagesSquare}
          title="No hay hilos en esta categoría todavía"
          description="Anímate a abrir el primero: tu experiencia puede ayudar a mucha gente."
          actionLabel="Crear hilo"
          onAction={openNewThread}
        />
      )}

      {/* Diálogo: crear hilo */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Crear un hilo</DialogTitle>
            <DialogDescription>
              Sé claro y amable: recuerda que detrás de cada pregunta hay una persona.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="thread-title">Título</Label>
              <Input
                id="thread-title"
                placeholder="Ej.: ¿Qué desayunos toleráis mejor en brote leve?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={150}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="thread-category">Categoría</Label>
              <Select value={newCategory} onValueChange={(v) => setNewCategory(v as ThreadCategory)}>
                <SelectTrigger id="thread-category" className="min-h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {THREAD_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="thread-content">Contenido</Label>
              <Textarea
                id="thread-content"
                rows={5}
                placeholder="Cuenta tu situación o pregunta con detalle…"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={creating}>
              Cancelar
            </Button>
            <Button onClick={() => void createThread()} disabled={creating}>
              {creating && <Loader2 className="size-4 animate-spin" />}
              Publicar hilo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
