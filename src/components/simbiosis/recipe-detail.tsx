'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlarmClock,
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Check,
  Clock,
  Flag,
  Heart,
  ListChecks,
  Loader2,
  Pencil,
  Trash2,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { ImageWithFallback } from './image-with-fallback'
import { RatingStars } from './rating-stars'
import { RoleBadge, UserAvatar } from './user-bits'
import { EmptyState } from './empty-state'
import { api, jsonBody } from '@/lib/client-api'
import { useSimbiosis } from '@/lib/store'
import { longDate, numEs, relativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { RecipeDetailData, RecipeSummary } from '@/lib/types'

/** Respuesta anidada real de GET /api/recipes/[id] (ver worklog). */
interface RecipeDetailResponse {
  recipe: Omit<RecipeSummary, 'author' | 'isProfessional'>
  author: RecipeDetailData['author']
  comments: RecipeDetailData['comments']
  ratings: RecipeDetailData['ratings']
  avgRating: number
  ratingCount: number
  favoritesCount: number
  myRating: RecipeDetailData['myRating']
  favoriteByMe: boolean
}

/** Normaliza la respuesta anidada a la forma plana que usa la vista. */
function toDetailData(d: RecipeDetailResponse): RecipeDetailData {
  return {
    ...d.recipe,
    author: d.author,
    isProfessional: d.author.role === 'NUTRITIONIST' || d.author.role === 'DOCTOR',
    comments: d.comments,
    ratings: d.ratings,
    avgRating: d.avgRating,
    ratingCount: d.ratingCount,
    favoritesCount: d.favoritesCount,
    myRating: d.myRating,
    favoriteByMe: d.favoriteByMe,
  }
}

/** Detalle de receta: preparación, valoraciones, comentarios y acciones. */
export function RecipeDetail({ id }: { id: string }) {
  const { user, navigate, setAuthOpen, openReport, bumpRefresh } = useSimbiosis()

  const [data, setData] = useState<RecipeDetailData | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)

  const [ratingStars, setRatingStars] = useState(0)
  const [ratingComment, setRatingComment] = useState('')
  const [savingRating, setSavingRating] = useState(false)
  const [comment, setComment] = useState('')
  const [postingComment, setPostingComment] = useState(false)
  const [favorite, setFavorite] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api<RecipeDetailResponse>(`/api/recipes/${id}`)
      setData(toDetailData(d))
      setNotFound(false)
      setFavorite(d.favoriteByMe)
      if (d.myRating) {
        setRatingStars(d.myRating.stars)
        setRatingComment(d.myRating.comment ?? '')
      }
    } catch (err) {
      setNotFound(true)
      toast.error(err instanceof Error ? err.message : 'No se pudo cargar la receta.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  async function toggleFavorite() {
    if (!user) {
      toast.info('Inicia sesión para guardar favoritos.')
      setAuthOpen(true)
      return
    }
    try {
      const res = await api<{ favorite: boolean; favoritesCount: number }>(
        `/api/recipes/${id}/favorite`,
        jsonBody('POST', {})
      )
      setFavorite(res.favorite)
      setData((d) => (d ? { ...d, favoritesCount: res.favoritesCount, favoriteByMe: res.favorite } : d))
      toast.success(res.favorite ? 'Añadida a tus favoritos.' : 'Eliminada de tus favoritos.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar el favorito.')
    }
  }

  async function submitRating() {
    if (!user) {
      toast.info('Inicia sesión para valorar recetas.')
      setAuthOpen(true)
      return
    }
    if (ratingStars < 1) {
      toast.warning('Selecciona de 1 a 5 estrellas para valorar.')
      return
    }
    setSavingRating(true)
    try {
      await api(`/api/recipes/${id}/rate`, jsonBody('POST', {
        stars: ratingStars,
        comment: ratingComment.trim() || undefined,
      }))
      toast.success('¡Gracias por tu valoración!')
      await load()
      bumpRefresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar la valoración.')
    } finally {
      setSavingRating(false)
    }
  }

  async function submitComment() {
    if (!user) {
      toast.info('Inicia sesión para comentar.')
      setAuthOpen(true)
      return
    }
    if (!comment.trim()) {
      toast.warning('Escribe un comentario antes de publicarlo.')
      return
    }
    setPostingComment(true)
    try {
      await api(`/api/recipes/${id}/comments`, jsonBody('POST', { content: comment.trim() }))
      setComment('')
      toast.success('Comentario publicado.')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo publicar el comentario.')
    } finally {
      setPostingComment(false)
    }
  }

  async function deleteComment(commentId: string) {
    try {
      await api(`/api/comments/${commentId}`, jsonBody('DELETE', {}))
      toast.success('Comentario eliminado.')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar el comentario.')
    }
  }

  async function deleteRecipe() {
    try {
      await api(`/api/recipes/${id}`, jsonBody('DELETE', {}))
      toast.success('Receta eliminada.')
      bumpRefresh()
      navigate('recipes')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar la receta.')
    }
  }

  if (loading) {
    return <RecipeDetailSkeleton />
  }

  if (notFound || !data) {
    return (
      <EmptyState
        icon={AlarmClock}
        title="No se encontró esta receta"
        description="Puede que haya sido eliminada por su autor o retirada por moderación."
        actionLabel="Volver a recetas"
        onAction={() => navigate('recipes')}
      />
    )
  }

  const isOwner = user?.id === data.author.id
  const canDelete = user && (isOwner || user.role === 'COORDINATOR')

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" onClick={() => navigate('recipes')} className="-ml-2 min-h-9">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Volver a recetas
      </Button>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Columna principal */}
        <div className="space-y-5 lg:col-span-3">
          <div className="relative h-60 overflow-hidden rounded-2xl border sm:h-80 lg:h-96">
            <ImageWithFallback
              src={data.image}
              alt={`Foto de ${data.title}`}
              sizes="(max-width: 1024px) 100vw, 60vw"
              priority
            />
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-transparent bg-secondary text-secondary-foreground">
                {data.category}
              </Badge>
              {data.isProfessional && (
                <Badge className="gap-1 border-transparent bg-primary/10 text-primary">
                  <BadgeCheck aria-hidden="true" className="size-3.5" />
                  Validada por profesional
                </Badge>
              )}
              {data.status === 'REMOVED' && (
                <Badge variant="destructive">Retirada por moderación</Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{data.title}</h1>
            <p className="leading-relaxed text-muted-foreground">{data.description}</p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Clock aria-hidden="true" className="size-4 text-primary" />
                {data.prepTime} min de preparación
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users aria-hidden="true" className="size-4 text-primary" />
                {data.servings} {data.servings === 1 ? 'ración' : 'raciones'}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays aria-hidden="true" className="size-4 text-primary" />
                {longDate(data.createdAt)}
              </span>
            </div>

            {(data.tags.length > 0 || data.suitableFor.length > 0) && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {data.tags.map((t) => (
                  <Badge key={t} variant="outline">
                    {t}
                  </Badge>
                ))}
                {data.suitableFor.map((s) => (
                  <Badge key={s} variant="outline" className="border-primary/30 bg-primary/5 text-primary">
                    {s}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Ingredientes y pasos */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ListChecks aria-hidden="true" className="size-4.5 text-primary" />
                  Ingredientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5">
                  {data.ingredients.map((ing, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <span
                        aria-hidden="true"
                        className="mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10"
                      >
                        <Check className="size-3 text-primary" />
                      </span>
                      <span className="leading-snug">{ing}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Preparación</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3.5">
                  {data.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <span
                        aria-hidden="true"
                        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
                      >
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>

          {/* Valoraciones de la comunidad */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Valoraciones ({data.ratingCount})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.ratings.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Esta receta todavía no tiene valoraciones. ¡Sé la primera persona en valorarla!
                </p>
              ) : (
                <ul className="max-h-80 space-y-3 overflow-y-auto pr-1">
                  {data.ratings.map((r) => (
                    <li key={r.id} className="flex gap-3 rounded-lg border p-3">
                      <UserAvatar name={r.author.name} role={r.author.role} className="size-8 shrink-0" />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="text-sm font-medium">{r.author.name}</span>
                          <RoleBadge role={r.author.role} />
                          <span className="ml-auto text-xs text-muted-foreground">
                            {relativeTime(r.createdAt)}
                          </span>
                        </div>
                        <RatingStars value={r.stars} readOnly size="sm" aria-label={`${r.stars} de 5 estrellas`} />
                        {r.comment && (
                          <p className="text-sm leading-relaxed text-muted-foreground">{r.comment}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Comentarios */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Comentarios ({data.comments.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {user ? (
                <div className="flex gap-3">
                  <UserAvatar name={user.name} role={user.role} className="size-8 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Textarea
                      rows={2}
                      placeholder="Comparte tu experiencia con esta receta…"
                      aria-label="Escribir un comentario"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                    <div className="flex justify-end">
                      <Button size="sm" onClick={() => void submitComment()} disabled={postingComment} className="min-h-9">
                        {postingComment && <Loader2 className="size-4 animate-spin" />}
                        Publicar comentario
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="rounded-lg border border-dashed px-3 py-2.5 text-sm text-muted-foreground">
                  Inicia sesión para participar en los comentarios.
                </p>
              )}

              <Separator />

              {data.comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aún no hay comentarios.</p>
              ) : (
                <ul className="space-y-4">
                  {data.comments.map((c) => (
                    <li key={c.id} className="flex gap-3">
                      <UserAvatar name={c.author.name} role={c.author.role} className="size-8 shrink-0" />
                      <div className="min-w-0 flex-1 space-y-1 rounded-lg bg-muted/50 px-3 py-2.5">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="text-sm font-medium">{c.author.name}</span>
                          <RoleBadge role={c.author.role} />
                          <span className="ml-auto text-xs text-muted-foreground">
                            {relativeTime(c.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed">{c.content}</p>
                        <div className="flex gap-3 pt-0.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => openReport('COMMENT', c.id)}
                            aria-label={`Denunciar el comentario de ${c.author.name}`}
                          >
                            <Flag aria-hidden="true" className="size-3" />
                            Denunciar
                          </Button>
                          {user && (user.id === c.author.id || user.role === 'COORDINATOR') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive"
                              onClick={() => void deleteComment(c.id)}
                              aria-label={`Eliminar el comentario de ${c.author.name}`}
                            >
                              <Trash2 aria-hidden="true" className="size-3" />
                              Eliminar
                            </Button>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Columna lateral */}
        <div className="space-y-4 lg:col-span-2">
          {/* Autoría */}
          <Card>
            <CardContent className="flex items-start gap-3 p-4">
              <UserAvatar name={data.author.name} role={data.author.role} className="size-11" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="font-semibold">{data.author.name}</p>
                  <RoleBadge role={data.author.role} />
                </div>
                {data.author.bio && (
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{data.author.bio}</p>
                )}
                <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarDays aria-hidden="true" className="size-3" />
                  Miembro desde {longDate(data.author.createdAt)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Acciones */}
          <Card>
            <CardContent className="space-y-2 p-4">
              <Button
                variant={favorite ? 'secondary' : 'outline'}
                className="w-full min-h-11 justify-start"
                onClick={() => void toggleFavorite()}
              >
                <Heart aria-hidden="true" className={cn('size-4', favorite && 'fill-rose-500 text-rose-500')} />
                {favorite ? 'Guardada en favoritos' : 'Guardar en favoritos'}
                <span className="ml-auto text-xs text-muted-foreground">{data.favoritesCount}</span>
              </Button>
              <Button
                variant="ghost"
                className="w-full min-h-11 justify-start text-muted-foreground hover:text-foreground"
                onClick={() => openReport('RECIPE', data.id)}
              >
                <Flag aria-hidden="true" className="size-4" />
                Denunciar receta
              </Button>
              {isOwner && (
                <Button
                  variant="outline"
                  className="w-full min-h-11 justify-start"
                  onClick={() => navigate('newRecipe', { recipe: data })}
                >
                  <Pencil aria-hidden="true" className="size-4" />
                  Editar receta
                </Button>
              )}
              {canDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full min-h-11 justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 aria-hidden="true" className="size-4" />
                      Eliminar receta
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar esta receta?</AlertDialogTitle>
                      <AlertDialogDescription>
                        La receta «{data.title}» se eliminará junto con sus valoraciones y
                        comentarios. Esta acción no se puede deshacer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => void deleteRecipe()}
                        className="bg-destructive text-white hover:bg-destructive/90"
                      >
                        Sí, eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </CardContent>
          </Card>

          {/* Widget de valoración */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {data.myRating ? 'Tu valoración' : 'Valora esta receta'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <RatingStars
                  value={ratingStars}
                  onChange={setRatingStars}
                  size="lg"
                  aria-label="Tu valoración en estrellas"
                />
                <span className="text-sm text-muted-foreground">
                  {ratingStars > 0 ? `${ratingStars} de 5` : 'Sin puntuar'}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold">
                    {data.ratingCount > 0 ? `${numEs(data.avgRating)} / 5` : 'Sin valoraciones'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    media de {data.ratingCount} {data.ratingCount === 1 ? 'valoración' : 'valoraciones'}
                  </p>
                </div>
                <RatingStars value={data.avgRating} readOnly size="sm" aria-label="Media de valoraciones" />
              </div>
              <Textarea
                rows={2}
                placeholder="¿Algún consejo o cómo te fue? (opcional)"
                aria-label="Comentario de la valoración"
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
              />
              <Button className="w-full min-h-11" onClick={() => void submitRating()} disabled={savingRating}>
                {savingRating && <Loader2 className="size-4 animate-spin" />}
                {data.myRating ? 'Actualizar mi valoración' : 'Enviar valoración'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function RecipeDetailSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-60 w-full rounded-2xl sm:h-80 lg:h-96" />
      <div className="space-y-3">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  )
}
