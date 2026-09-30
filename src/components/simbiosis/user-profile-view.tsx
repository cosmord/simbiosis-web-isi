'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, CalendarDays, Heart, Star, UtensilsCrossed } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ImageWithFallback } from './image-with-fallback'
import { RatingStars } from './rating-stars'
import { RoleBadge, UserAvatar } from './user-bits'
import { EmptyState } from './empty-state'
import { api } from '@/lib/client-api'
import { useSimbiosis } from '@/lib/store'
import { longDate, numEs } from '@/lib/format'
import type { PublicProfileData } from '@/lib/types'

/** Perfil público de un miembro de la comunidad con sus recetas publicadas. */
export function UserProfileView({ id }: { id: string }) {
  const { navigate } = useSimbiosis()
  const [data, setData] = useState<PublicProfileData | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api<PublicProfileData>(`/api/users/${id}`)
      setData(d)
      setNotFound(false)
    } catch (err) {
      setNotFound(true)
      toast.error(err instanceof Error ? err.message : 'No se pudo cargar el perfil.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (notFound || !data) {
    return (
      <EmptyState
        icon={UtensilsCrossed}
        title="Perfil no disponible"
        description="Este perfil no existe o el usuario ha dejado la comunidad."
        actionLabel="Volver al inicio"
        onAction={() => navigate('home')}
      />
    )
  }

  const { user, stats, recipes } = data

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" onClick={() => navigate('recipes')} className="-ml-2 min-h-9">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Volver
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <Card className="overflow-hidden">
          <div className="h-20 w-full bg-gradient-to-r from-emerald-600/80 via-teal-500/70 to-amber-400/70 dark:from-emerald-800 dark:via-teal-800 dark:to-amber-800" />
          <CardContent className="space-y-4 pb-6">
            <div className="-mt-8 flex flex-wrap items-end justify-between gap-3">
              <div className="flex items-end gap-3">
                <UserAvatar name={user.name} role={user.role} className="size-20 ring-4 ring-card" />
                <div className="pb-1">
                  <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight">
                    {user.name}
                    <RoleBadge role={user.role} />
                  </h1>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarDays aria-hidden="true" className="size-3" />
                    Miembro desde {longDate(user.createdAt)}
                  </p>
                </div>
              </div>
            </div>
            {user.bio && (
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{user.bio}</p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium">
                <UtensilsCrossed aria-hidden="true" className="size-3.5 text-primary" />
                {stats.recipes} {stats.recipes === 1 ? 'receta publicada' : 'recetas publicadas'}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium">
                <Star aria-hidden="true" className="size-3.5 text-amber-500" />
                {stats.ratingsCount > 0
                  ? `${numEs(stats.avgRating)} / 5 · ${stats.ratingsCount} valoraciones recibidas`
                  : 'Sin valoraciones recibidas'}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium">
                <Heart aria-hidden="true" className="size-3.5 text-rose-500" />
                {stats.favorites} {stats.favorites === 1 ? 'favorito recibido' : 'favoritos recibidos'}
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <section aria-label="Recetas publicadas por este usuario" className="space-y-3">
        <h2 className="text-lg font-bold tracking-tight">
          Sus recetas {user.isProfessional && <span className="text-sm font-normal text-muted-foreground">— validadas clínicamente</span>}
        </h2>
        {recipes.length === 0 ? (
          <EmptyState
            icon={UtensilsCrossed}
            title="Todavía no ha compartido recetas"
            description="Cuando este usuario publique recetas aparecerán aquí."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.map((recipe) => (
              <motion.button
                key={recipe.id}
                type="button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                onClick={() => navigate('recipeDetail', { id: recipe.id })}
                className="group overflow-hidden rounded-xl border bg-card text-left outline-none transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Ver receta ${recipe.title}`}
              >
                <div className="relative h-36 w-full overflow-hidden">
                  <ImageWithFallback
                    src={recipe.image}
                    alt={`Foto de ${recipe.title}`}
                    sizes="(max-width: 640px) 100vw, 33vw"
                  />
                </div>
                <div className="space-y-1.5 p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {recipe.category}
                    </span>
                    {recipe.isProfessional && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        <Star aria-hidden="true" className="size-2.5" />
                        Profesional
                      </span>
                    )}
                  </div>
                  <p className="line-clamp-2 font-semibold leading-snug group-hover:text-primary">
                    {recipe.title}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <RatingStars value={recipe.avgRating} readOnly size="sm" aria-label={`Valoración media ${recipe.avgRating} de 5`} />
                    <span>
                      {recipe.ratingCount > 0 ? numEs(recipe.avgRating) : '—'} ({recipe.ratingCount})
                    </span>
                    <span className="ml-auto">{recipe.prepTime} min</span>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
