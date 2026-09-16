'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  CalendarHeart,
  ChefHat,
  Eye,
  HeartPulse,
  MessagesSquare,
  Search,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { RecipeCard, RecipeCardSkeleton } from './recipe-card'
import { StatsBanner } from './stats-banner'
import { EmptyState } from './empty-state'
import { UserAvatar } from './user-bits'
import { api } from '@/lib/client-api'
import { useSimbiosis } from '@/lib/store'
import { PUBLICATION_CATEGORIES, type PublicationCardData, type RecipeCardData, type ThreadCardData } from '@/lib/types'
import { relativeTime } from '@/lib/format'

const STEPS = [
  {
    icon: Search,
    title: '1 · Explora',
    description: 'Busca recetas adaptadas a tu fase y tolerancias con filtros pensados para la EII.',
  },
  {
    icon: ChefHat,
    title: '2 · Cocina y valora',
    description: 'Prueba las recetas, valora con estrellas y deja comentarios con tus trucos.',
  },
  {
    icon: MessagesSquare,
    title: '3 · Comparte',
    description: 'Publica tus propias recetas y participa en el foro con otras personas de la comunidad.',
  },
  {
    icon: HeartPulse,
    title: '4 · Registra tu bienestar',
    description: 'Anota peso y síntomas en tu diario privado para descubrir patrones con el tiempo.',
  },
]

/** Página de inicio: hero, estadísticas, destacados y accesos a cada módulo. */
export function HomeView() {
  const { user, navigate, setAuthOpen, setGuideOpen } = useSimbiosis()
  const [recipes, setRecipes] = useState<RecipeCardData[] | null>(null)
  const [publications, setPublications] = useState<PublicationCardData[] | null>(null)
  const [threads, setThreads] = useState<ThreadCardData[] | null>(null)

  useEffect(() => {
    let active = true
    api<{ recipes: RecipeCardData[] }>('/api/recipes?sort=RATING')
      .then((d) => active && setRecipes(d.recipes.slice(0, 4)))
      .catch(() => active && setRecipes([]))
    api<{ publications: PublicationCardData[] }>('/api/publications')
      .then((d) => active && setPublications(d.publications.slice(0, 3)))
      .catch(() => active && setPublications([]))
    api<{ threads: ThreadCardData[] }>('/api/forum/threads')
      .then((d) => active && setThreads(d.threads.slice(0, 4)))
      .catch(() => active && setThreads([]))
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section aria-label="Presentación de Simbiosis" className="relative">
        <div className="relative h-72 overflow-hidden rounded-2xl sm:h-80 lg:h-96">
          <Image
            src="/images/hero.png"
            alt="Mesa con platos coloridos y saludables preparados por la comunidad"
            fill
            priority
            sizes="(max-width: 1152px) 100vw, 1152px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/45 to-stone-950/10" />

          {/* Chips flotantes decorativos (solo pantallas grandes) */}
          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="absolute right-6 top-6 hidden items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3.5 py-1.5 text-xs font-medium text-white shadow-sm backdrop-blur-md lg:flex"
          >
            <BadgeCheck aria-hidden="true" className="size-3.5 text-emerald-300" />
            Recetas validadas por profesionales
          </motion.div>
          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="absolute right-24 top-16 hidden items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3.5 py-1.5 text-xs font-medium text-white shadow-sm backdrop-blur-md lg:flex"
          >
            <CalendarHeart aria-hidden="true" className="size-3.5 text-amber-300" />
            Planifica tu menú semanal
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-x-0 bottom-0 p-5 sm:p-8"
          >
            <Badge className="mb-3 gap-1 border-transparent bg-accent text-accent-foreground">
              <Sparkles aria-hidden="true" className="size-3" />
              Comunidad colaborativa de cocina y EII
            </Badge>
            <h1 className="max-w-xl text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">
              Comunidad de recetas para vivir mejor con EII
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
              Descubre platos adaptados a brote y remisión, comparte tus recetas y
              aprende de nutricionistas, médicos y personas que lo viven como tú.
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <Button size="lg" onClick={() => navigate('recipes')} className="min-h-11">
                <UtensilsCrossed aria-hidden="true" className="size-4" />
                Explorar recetas
              </Button>
              {!user && (
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => setAuthOpen(true)}
                  className="min-h-11 bg-white/90 text-stone-900 hover:bg-white"
                >
                  Únete a la comunidad
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Estadísticas y criterios de éxito */}
      <StatsBanner />

      {/* Recetas destacadas */}
      <section aria-labelledby="home-recipes-title">
        <SectionHeader
          id="home-recipes-title"
          icon={UtensilsCrossed}
          title="Recetas destacadas"
          description="Las mejor valoradas por la comunidad"
          actionLabel="Ver todas"
          onAction={() => navigate('recipes')}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {!recipes
            ? Array.from({ length: 4 }).map((_, i) => <RecipeCardSkeleton key={i} />)
            : recipes.map((r) => <RecipeCard key={r.id} recipe={r} />)}
        </div>
        {recipes && recipes.length === 0 && (
          <EmptyState
            icon={UtensilsCrossed}
            title="Todavía no hay recetas publicadas"
            description="Anímate a compartir la primera receta adaptada con la comunidad."
          />
        )}
      </section>

      {/* Últimos consejos de salud */}
      <section aria-labelledby="home-pubs-title">
        <SectionHeader
          id="home-pubs-title"
          icon={BookOpenCheck}
          title="Últimos consejos de salud"
          description="Publicaciones de nutricionistas y médicos de la comunidad"
          actionLabel="Ver todos"
          onAction={() => navigate('publications')}
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {!publications
            ? Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="p-4">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="mt-3 h-5 w-3/4" />
                  <Skeleton className="mt-4 h-16 w-full" />
                </Card>
              ))
            : publications.map((p) => {
                const meta = PUBLICATION_CATEGORIES.find((c) => c.value === p.category)
                return (
                  <motion.div key={p.id} whileHover={{ y: -3 }} transition={{ duration: 0.18 }}>
                    <Card
                      role="button"
                      tabIndex={0}
                      className="h-full cursor-pointer transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => navigate('publications')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') navigate('publications')
                      }}
                      aria-label={`Leer consejo: ${p.title}`}
                    >
                      <CardHeader className="pb-2">
                        <Badge variant="outline" className="w-fit border-primary/30 bg-primary/5 text-primary">
                          {meta?.label ?? p.category}
                        </Badge>
                        <CardTitle className="line-clamp-2 text-base leading-snug">{p.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="line-clamp-3 text-sm text-muted-foreground">{p.content}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <UserAvatar name={p.author.name} role={p.author.role} className="size-6" />
                          <span className="truncate">{p.author.name}</span>
                          <span>· {relativeTime(p.createdAt)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
        </div>
        {publications && publications.length === 0 && (
          <EmptyState
            icon={BookOpenCheck}
            title="Aún no hay consejos publicados"
            description="Los profesionales de la comunidad compartirán aquí sus recomendaciones."
          />
        )}
      </section>

      {/* Actividad del foro */}
      <section aria-labelledby="home-forum-title">
        <SectionHeader
          id="home-forum-title"
          icon={MessagesSquare}
          title="Actividad del foro"
          description="Conversaciones recientes de la comunidad"
          actionLabel="Ir al foro"
          onAction={() => navigate('forum')}
        />
        <div className="grid gap-3 md:grid-cols-2">
          {!threads
            ? Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="p-4">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="mt-3 h-4 w-full" />
                  <Skeleton className="mt-2 h-4 w-1/2" />
                </Card>
              ))
            : threads.map((t) => (
                <motion.div key={t.id} whileHover={{ x: 3 }} transition={{ duration: 0.15 }}>
                  <Card
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer py-4 transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => navigate('threadDetail', { id: t.id })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') navigate('threadDetail', { id: t.id })
                    }}
                    aria-label={`Abrir hilo: ${t.title}`}
                  >
                    <CardContent className="space-y-1.5 px-4">
                      <h3 className="line-clamp-1 font-medium">{t.title}</h3>
                      <p className="line-clamp-1 text-sm text-muted-foreground">{t.content}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-muted-foreground">
                        {t.author && (
                          <span className="inline-flex items-center gap-1.5">
                            <UserAvatar name={t.author.name} role={t.author.role} className="size-5" />
                            {t.author.name}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <Eye aria-hidden="true" className="size-3.5" /> {t.views}
                        </span>
                        <span>{t.repliesCount} respuestas</span>
                        <span className="ml-auto">{relativeTime(t.lastActivityAt ?? t.createdAt)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
        </div>
        {threads && threads.length === 0 && (
          <EmptyState
            icon={MessagesSquare}
            title="El foro está muy tranquilo"
            description="Abre el primer hilo y comienza la conversación con la comunidad."
          />
        )}
      </section>

      {/* ¿Cómo funciona? */}
      <section aria-labelledby="home-how-title">
        <SectionHeader
          id="home-how-title"
          icon={Sparkles}
          title="¿Cómo funciona Simbiosis?"
          description="Cuatro pasos para sacarle todo el partido"
          actionLabel="Abrir la guía"
          onAction={() => setGuideOpen(true)}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, description }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.25, delay: i * 0.05 }}
            >
              <Card className="h-full py-5">
                <CardContent className="space-y-2 px-5">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  )
}

function SectionHeader({
  id,
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  id: string
  icon: typeof UtensilsCrossed
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h2 id={id} className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <Icon aria-hidden="true" className="size-5 text-primary" />
          {title}
        </h2>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actionLabel && onAction && (
        <Button variant="ghost" size="sm" onClick={onAction} className="shrink-0 text-primary hover:text-primary">
          {actionLabel}
          <ArrowRight aria-hidden="true" className="size-4" />
        </Button>
      )}
    </div>
  )
}
