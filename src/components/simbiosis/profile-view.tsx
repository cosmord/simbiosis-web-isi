'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  ChefHat,
  Eye,
  Heart,
  Loader2,
  Mail,
  MessagesSquare,
  Pencil,
  Star,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { RecipeCard } from './recipe-card'
import { RatingStars } from './rating-stars'
import { EmptyState } from './empty-state'
import { RoleBadge, UserAvatar } from './user-bits'
import { api, jsonBody } from '@/lib/client-api'
import { useSimbiosis } from '@/lib/store'
import { longDate, numEs, relativeTime } from '@/lib/format'
import {
  THREAD_CATEGORIES,
  type ProfileData,
  type RecipeCardData,
  type RecipeDetailData,
  type ThreadCardData,
} from '@/lib/types'

interface MyRatingItem {
  recipeId: string
  recipeTitle: string
  stars: number
  comment: string | null
}

/** Perfil del usuario: datos personales, estadísticas y actividad propia. */
export function ProfileView() {
  const { viewParams, setUser, setAuthOpen, navigate, bumpRefresh } = useSimbiosis()
  const [data, setData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [myRatings, setMyRatings] = useState<MyRatingItem[] | null>(null)

  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editBio, setEditBio] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  const initialTab = viewParams.tab === 'favorites' ? 'favorites' : viewParams.tab === 'threads' ? 'threads' : viewParams.tab === 'ratings' ? 'ratings' : 'recipes'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api<ProfileData>('/api/users/me/profile')
      setData(d)
      setEditName(d.user.name)
      setEditBio(d.user.bio ?? '')
      // Recopilar mis valoraciones a partir de las recetas que puedo haber valorado
      const candidates = new Map<string, string>()
      for (const r of d.myRecipes) candidates.set(r.id, r.title)
      for (const r of d.myFavorites) {
        if (!candidates.has(r.id)) candidates.set(r.id, r.title)
      }
      const ids = Array.from(candidates.keys()).slice(0, 12)
      if (ids.length > 0) {
        const details = await Promise.all(
          ids.map((id) =>
            api<{ recipe: RecipeDetailData; myRating: RecipeDetailData['myRating'] }>(
              `/api/recipes/${id}`
            )
              .then((res) => ({ id, title: candidates.get(id)!, myRating: res.myRating }))
              .catch(() => null)
          )
        )
        const items: MyRatingItem[] = []
        for (const d2 of details) {
          if (d2?.myRating) {
            items.push({
              recipeId: d2.id,
              recipeTitle: d2.title,
              stars: d2.myRating.stars,
              comment: d2.myRating.comment,
            })
          }
        }
        setMyRatings(items)
      } else {
        setMyRatings([])
      }
    } catch (err) {
      if (err instanceof Error && /401|no autenticado|sesión/i.test(err.message)) {
        setAuthOpen(true)
      } else {
        toast.error(err instanceof Error ? err.message : 'No se pudo cargar tu perfil.')
      }
    } finally {
      setLoading(false)
    }
  }, [setAuthOpen])

  useEffect(() => {
    void load()
  }, [load])

  async function saveProfile() {
    if (!editName.trim()) {
      toast.warning('El nombre no puede estar vacío.')
      return
    }
    setSavingProfile(true)
    try {
      const res = await api<{ user: ProfileData['user'] }>('/api/users/me', jsonBody('PATCH', {
        name: editName.trim(),
        bio: editBio.trim(),
      }))
      setUser(res.user)
      setData((d) => (d ? { ...d, user: res.user } : d))
      setEditOpen(false)
      toast.success('Perfil actualizado correctamente.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar el perfil.')
    } finally {
      setSavingProfile(false)
    }
  }

  async function deleteRecipe(id: string) {
    try {
      await api(`/api/recipes/${id}`, jsonBody('DELETE', {}))
      toast.success('Receta eliminada.')
      await load()
      bumpRefresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar la receta.')
    }
  }

  if (loading || !data) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  const u = data.user
  const stats = [
    { icon: ChefHat, label: 'Recetas publicadas', value: String(data.stats.recipes) },
    {
      icon: Star,
      label: 'Valoración media recibida',
      value: data.stats.ratingsCount > 0 ? `${numEs(data.stats.avgRatingReceived)} / 5` : '—',
    },
    { icon: Heart, label: 'Favoritos guardados', value: String(data.stats.favorites) },
    { icon: MessagesSquare, label: 'Hilos abiertos', value: String(data.stats.threads) },
  ]

  const favoriteCards: RecipeCardData[] = data.myFavorites.map((f) => ({
    ...f,
    status: 'PUBLISHED',
  }))

  const threadCards: ThreadCardData[] = data.myThreads

  return (
    <div className="space-y-5">
      {/* Tarjeta de perfil */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
          <UserAvatar
            name={u.name}
            role={u.role}
            className="size-16 border-2"
            fallbackClassName="text-xl"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">{u.name}</h1>
              <RoleBadge role={u.role} />
              {u.status !== 'ACTIVE' && (
                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  {u.status === 'PENDING' ? 'Cuenta pendiente de aprobación' : 'Cuenta suspendida'}
                </Badge>
              )}
            </div>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Mail aria-hidden="true" className="size-3.5" />
              {u.email}
            </p>
            {u.bio && <p className="text-sm leading-relaxed text-foreground/85">{u.bio}</p>}
            <p className="text-xs text-muted-foreground">
              Miembro de la comunidad desde {longDate(u.createdAt)}
            </p>
          </div>
          <Button variant="outline" className="min-h-11 shrink-0" onClick={() => setEditOpen(true)}>
            <Pencil aria-hidden="true" className="size-4" />
            Editar perfil
          </Button>
        </CardContent>
      </Card>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ icon: Icon, label, value }) => (
          <Card key={label} className="py-4">
            <CardContent className="flex items-center gap-3 px-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-lg font-bold leading-tight">{value}</p>
                <p className="truncate text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actividad */}
      <Tabs defaultValue={initialTab}>
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="recipes" className="min-h-9">Mis recetas</TabsTrigger>
          <TabsTrigger value="favorites" className="min-h-9">Mis favoritos</TabsTrigger>
          <TabsTrigger value="threads" className="min-h-9">Mis hilos</TabsTrigger>
          <TabsTrigger value="ratings" className="min-h-9">Mis valoraciones</TabsTrigger>
        </TabsList>

        <TabsContent value="recipes" className="mt-4">
          {data.myRecipes.length === 0 ? (
            <EmptyState
              icon={UtensilsCrossed}
              title="Aún no has publicado ninguna receta"
              description="Comparte ese plato que te sienta bien: ayudará a más gente de la que imaginas."
              actionLabel="Compartir receta"
              onAction={() => navigate('newRecipe')}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.myRecipes.map((r) => (
                  <div key={r.id} className="space-y-2">
                    <RecipeCard recipe={r} showFavorite={false} />
                    <div className="flex items-center gap-1.5 px-1">
                      {r.status === 'REMOVED' && (
                        <Badge variant="destructive" className="text-[10px]">
                          Retirada por moderación
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 min-h-8 gap-1 px-2 text-xs"
                        onClick={() => navigate('newRecipe', { recipe: r })}
                      >
                        <Pencil aria-hidden="true" className="size-3" />
                        Editar
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 min-h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 aria-hidden="true" className="size-3" />
                            Eliminar
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar esta receta?</AlertDialogTitle>
                            <AlertDialogDescription>
                              «{r.title}» se eliminará junto con sus valoraciones y
                              comentarios. Esta acción no se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => void deleteRecipe(r.id)}
                              className="bg-destructive text-white hover:bg-destructive/90"
                            >
                              Sí, eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="favorites" className="mt-4">
          {data.myFavorites.length === 0 ? (
            <EmptyState
              icon={Heart}
              title="No tienes recetas favoritas todavía"
              description="Guarda con el corazón las recetas que quieras cocinar de nuevo."
              actionLabel="Explorar recetas"
              onAction={() => navigate('recipes')}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {favoriteCards.map((r) => (
                <RecipeCard key={r.id} recipe={r} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="threads" className="mt-4">
          {threadCards.length === 0 ? (
            <EmptyState
              icon={MessagesSquare}
              title="No has abierto ningún hilo"
              description="Comparte tus dudas o experiencias en el foro de la comunidad."
              actionLabel="Ir al foro"
              onAction={() => navigate('forum')}
            />
          ) : (
            <div className="space-y-3">
              {threadCards.map((t) => {
                const catLabel = THREAD_CATEGORIES.find((c) => c.value === t.category)?.label
                return (
                  <Card
                    key={t.id}
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer py-4 transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => navigate('threadDetail', { id: t.id })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') navigate('threadDetail', { id: t.id })
                    }}
                    aria-label={`Abrir hilo: ${t.title}`}
                  >
                    <CardContent className="space-y-1 px-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {catLabel && (
                          <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
                            {catLabel}
                          </Badge>
                        )}
                        <h3 className="font-medium">{t.title}</h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Eye aria-hidden="true" className="size-3.5" /> {t.views} visitas
                        </span>
                        <span>{t.repliesCount} respuestas</span>
                        <span className="ml-auto">{relativeTime(t.createdAt)}</span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ratings" className="mt-4">
          {myRatings === null ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : myRatings.length === 0 ? (
            <EmptyState
              icon={Star}
              title="Aún no has valorado ninguna receta"
              description="Valora las recetas que pruebes: ayudan a los demás a elegir."
              actionLabel="Explorar recetas"
              onAction={() => navigate('recipes')}
            />
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Valoraciones que has publicado</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="max-h-96 space-y-3 overflow-y-auto pr-1">
                  {myRatings.map((r) => (
                    <li key={r.recipeId} className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
                      <RatingStars value={r.stars} readOnly size="sm" aria-label={`${r.stars} de 5 estrellas`} />
                      <button
                        type="button"
                        className="text-sm font-medium underline-offset-2 hover:text-primary hover:underline"
                        onClick={() => navigate('recipeDetail', { id: r.recipeId })}
                      >
                        {r.recipeTitle}
                      </button>
                      {r.comment && (
                        <p className="w-full text-sm text-muted-foreground">«{r.comment}»</p>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Diálogo de edición de perfil */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar perfil</DialogTitle>
            <DialogDescription>
              Actualiza tu nombre y presentación para la comunidad.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="profile-name">Nombre</Label>
              <Input
                id="profile-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-bio">Presentación</Label>
              <Textarea
                id="profile-bio"
                rows={3}
                placeholder="Cuéntale a la comunidad un poco sobre ti…"
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={savingProfile}>
              Cancelar
            </Button>
            <Button onClick={() => void saveProfile()} disabled={savingProfile}>
              {savingProfile && <Loader2 className="size-4 animate-spin" />}
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Separator className="opacity-0" />
    </div>
  )
}
