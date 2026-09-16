'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { BadgeCheck, Clock, Heart, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ImageWithFallback } from './image-with-fallback'
import { RatingStars } from './rating-stars'
import { RoleBadge, UserAvatar } from './user-bits'
import { api, jsonBody } from '@/lib/client-api'
import { useSimbiosis } from '@/lib/store'
import { cn } from '@/lib/utils'
import { numEs, relativeTime } from '@/lib/format'
import type { RecipeCardData } from '@/lib/types'

interface RecipeCardProps {
  recipe: RecipeCardData
  /** Filas de favoritos del perfil: no necesita corazón propio. */
  showFavorite?: boolean
}

/** Tarjeta de receta reutilizable (home, listado, favoritos del perfil). */
export function RecipeCard({ recipe, showFavorite = true }: RecipeCardProps) {
  const { user, navigate, setAuthOpen } = useSimbiosis()
  const [favorite, setFavorite] = useState(!!recipe.favoriteByMe)
  const [favCount, setFavCount] = useState(recipe.favoritesCount ?? 0)
  const [favLoading, setFavLoading] = useState(false)

  const isPro = recipe.isProfessional ?? (recipe.author?.role === 'NUTRITIONIST' || recipe.author?.role === 'DOCTOR')

  async function toggleFavorite(e: React.MouseEvent) {
    e.stopPropagation()
    if (!user) {
      toast.info('Inicia sesión para guardar tus recetas favoritas.')
      setAuthOpen(true)
      return
    }
    setFavLoading(true)
    try {
      const res = await api<{ favorite: boolean; favoritesCount: number }>(
        `/api/recipes/${recipe.id}/favorite`,
        jsonBody('POST', {})
      )
      setFavorite(res.favorite)
      setFavCount(res.favoritesCount)
      toast.success(res.favorite ? 'Receta guardada en favoritos.' : 'Receta eliminada de favoritos.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar el favorito.')
    } finally {
      setFavLoading(false)
    }
  }

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.18 }}
      className="h-full"
    >
      <Card
        role="button"
        tabIndex={0}
        aria-label={`Ver receta: ${recipe.title}`}
        className="group h-full cursor-pointer overflow-hidden pt-0 transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => navigate('recipeDetail', { id: recipe.id })}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            navigate('recipeDetail', { id: recipe.id })
          }
        }}
      >
        <div className="relative aspect-[16/9] w-full overflow-hidden">
          <ImageWithFallback src={recipe.image} alt={`Foto de ${recipe.title}`} />
          <Badge className="absolute left-3 top-3 border-transparent bg-background/85 text-foreground shadow-sm backdrop-blur">
            {recipe.category}
          </Badge>
          {isPro && (
            <Badge className="absolute bottom-3 left-3 gap-1 border-transparent bg-primary/90 text-primary-foreground shadow-sm">
              <BadgeCheck aria-hidden="true" className="size-3" />
              Validada por profesional
            </Badge>
          )}
          {showFavorite && (
            <Button
              variant="secondary"
              size="icon"
              aria-label={favorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
              aria-pressed={favorite}
              disabled={favLoading}
              onClick={toggleFavorite}
              className="absolute right-3 top-3 size-9 rounded-full border border-border/60 bg-background/85 shadow-sm backdrop-blur hover:bg-background"
            >
              <Heart
                aria-hidden="true"
                className={cn(
                  'size-4 transition-colors',
                  favorite && 'fill-rose-500 text-rose-500'
                )}
              />
            </Button>
          )}
        </div>

        <CardContent className="flex flex-col gap-2.5 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 font-semibold leading-snug tracking-tight group-hover:text-primary">
              {recipe.title}
            </h3>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {recipe.author && (
              <>
                <UserAvatar name={recipe.author.name} role={recipe.author.role} className="size-6" />
                <span className="truncate font-medium text-foreground/80">
                  {recipe.author.name}
                </span>
                <RoleBadge role={recipe.author.role} />
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <RatingStars value={recipe.avgRating} readOnly size="sm" aria-label={`Valoración media: ${recipe.avgRating} de 5`} />
            <span className="text-xs text-muted-foreground">
              {recipe.ratingCount > 0
                ? `${numEs(recipe.avgRating)} (${recipe.ratingCount})`
                : 'Sin valoraciones'}
            </span>
            {favCount > 0 && (
              <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Heart aria-hidden="true" className="size-3" /> {favCount}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock aria-hidden="true" className="size-3.5" /> {recipe.prepTime} min
            </span>
            <span className="inline-flex items-center gap-1">
              <Users aria-hidden="true" className="size-3.5" /> {recipe.servings}{' '}
              {recipe.servings === 1 ? 'ración' : 'raciones'}
            </span>
            <span className="ml-auto">{relativeTime(recipe.createdAt)}</span>
          </div>

          {recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {recipe.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="px-1.5 py-0 text-[10px] font-normal text-muted-foreground">
                  {tag}
                </Badge>
              ))}
              {recipe.tags.length > 3 && (
                <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal text-muted-foreground">
                  +{recipe.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

/** Esqueleto con la misma forma que RecipeCard para estados de carga. */
export function RecipeCardSkeleton() {
  return (
    <Card className="h-full overflow-hidden pt-0">
      <Skeleton className="aspect-[16/9] w-full rounded-none" />
      <CardContent className="flex flex-col gap-2.5 p-4">
        <Skeleton className="h-5 w-3/4" />
        <div className="flex items-center gap-2">
          <Skeleton className="size-6 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
      </CardContent>
    </Card>
  )
}
