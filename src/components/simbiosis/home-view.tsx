'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  CalendarDays,
  CalendarHeart,
  CheckCircle2,
  ChefHat,
  Clock,
  Cookie,
  Eye,
  HeartPulse,
  MessagesSquare,
  Moon,
  Plus,
  Search,
  Sparkles,
  Star,
  Sun,
  Sunrise,
  Users,
  UtensilsCrossed,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { RecipeCard, RecipeCardSkeleton } from './recipe-card'
import { StatsBanner } from './stats-banner'
import { EmptyState } from './empty-state'
import { UserAvatar } from './user-bits'
import { api } from '@/lib/client-api'
import { useSimbiosis } from '@/lib/store'
import {
  PUBLICATION_CATEGORIES,
  PLAN_SLOTS,
  ROLE_LABELS,
  type PlanItemData,
  type PlanSlot,
  type PublicationCardData,
  type RecipeCardData,
  type ThreadCardData,
} from '@/lib/types'
import { numEs, relativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'

const SLOT_ICONS: Record<PlanSlot, typeof Sunrise> = {
  BREAKFAST: Sunrise,
  LUNCH: Sun,
  DINNER: Moon,
  SNACK: Cookie,
}

const SLOT_HUES: Record<PlanSlot, string> = {
  BREAKFAST: 'bg-amber-400/15 text-amber-600 dark:text-amber-400',
  LUNCH: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  DINNER: 'bg-teal-500/15 text-teal-600 dark:text-teal-300',
  SNACK: 'bg-orange-400/15 text-orange-600 dark:text-orange-400',
}

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
  // Receta destacada de la semana (rotación semanal determinista en el backend)
  const [featured, setFeatured] = useState<RecipeCardData | null>(null)

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
    api<{ recipe: RecipeCardData | null }>('/api/recipes/featured')
      .then((d) => active && setFeatured(d.recipe))
      .catch(() => active && setFeatured(null))
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

      {/* Receta destacada de la semana */}
      <FeaturedRecipeCard featured={featured} onOpen={(id) => navigate('recipeDetail', { id })} />

      {/* Menú de hoy (solo usuarios con sesión) */}
      <TodayMenuCard />

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

const LONG_DATE_FORMAT = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

/**
 * Widget «Menú de hoy»: muestra las 4 franjas del día actual según el plan
 * semanal del usuario con sesión iniciada, con accesos rápidos al planificador.
 */
function TodayMenuCard() {
  const { user, navigate } = useSimbiosis()
  const [items, setItems] = useState<PlanItemData[] | null>(null)
  const [today, setToday] = useState<number | null>(null)
  const remindDone = useRef(false)

  useEffect(() => {
    if (!user) return
    const t = setTimeout(() => setToday((new Date().getDay() + 6) % 7), 0)
    api<{ items: PlanItemData[] }>('/api/plan')
      .then(async (d) => {
        if (!remindDone.current) {
          remindDone.current = true
          try {
            const r = await api<{ created: boolean; notification?: { body: string } }>(
              '/api/plan/remind',
              { method: 'POST' }
            )
            if (r.created && r.notification) {
              toast.success('Recordatorio: tu menú de hoy está listo 🍽️', {
                description: r.notification.body,
                duration: 8000,
              })
            }
          } catch {
            // El recordatorio es best-effort: no debe molestar si falla.
          }
        }
        setItems(d.items)
      })
      .catch(() => setItems([]))
    return () => clearTimeout(t)
  }, [user])

  if (!user) return null

  const todayItems = today === null ? [] : (items ?? []).filter((it) => it.day === today)
  const loading = items === null

  return (
    <section aria-labelledby="today-menu-title">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="overflow-hidden border-primary/25 bg-gradient-to-br from-primary/[0.06] via-transparent to-accent/40 py-0">
          <div className="flex flex-wrap items-center gap-2 border-b border-primary/15 bg-primary/[0.06] px-5 py-3.5">
            <CalendarDays aria-hidden="true" className="size-4.5 text-primary" />
            <h2 id="today-menu-title" className="text-base font-bold tracking-tight">
              Tu menú de hoy
            </h2>
            <span className="text-sm text-muted-foreground first-letter:uppercase">
              {today !== null ? LONG_DATE_FORMAT.format(new Date()) : ''}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto min-h-9 shrink-0 text-primary hover:text-primary"
              onClick={() => navigate('plan')}
              aria-label="Abrir mi plan semanal"
            >
              Ver plan completo
              <ArrowRight aria-hidden="true" className="size-4" />
            </Button>
          </div>

          <CardContent className="grid gap-2.5 p-5 sm:grid-cols-2 lg:grid-cols-4">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
              : PLAN_SLOTS.map(({ value, label }) => {
                  const item = todayItems.find((it) => it.slot === value)
                  const Icon = SLOT_ICONS[value]
                  return item ? (
                    <button
                      key={value}
                      type="button"
                      className="flex items-center gap-2.5 rounded-xl border bg-background/70 p-3 text-left outline-none transition-colors hover:border-primary/40 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => navigate('recipeDetail', { id: item.recipe.id })}
                      aria-label={`Ver ${item.recipe.title} (${label.toLowerCase()} de hoy)`}
                    >
                      <span
                        aria-hidden="true"
                        className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${SLOT_HUES[value]}`}
                      >
                        <Icon className="size-4.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {label}
                        </span>
                        <span
                          className={cn(
                            'block truncate text-sm font-medium',
                            item.done && 'text-muted-foreground line-through decoration-emerald-500/60'
                          )}
                        >
                          {item.recipe.title}
                        </span>
                        {item.done && (
                          <span className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 aria-hidden="true" className="size-3" />
                            Cocinada
                          </span>
                        )}
                      </span>
                    </button>
                  ) : (
                    <button
                      key={value}
                      type="button"
                      className="flex items-center gap-2.5 rounded-xl border border-dashed bg-background/40 p-3 text-left outline-none transition-colors hover:border-primary/40 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => navigate('plan')}
                      aria-label={`Añadir receta al ${label.toLowerCase()} de hoy en el planificador`}
                    >
                      <span
                        aria-hidden="true"
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-dashed text-muted-foreground"
                      >
                        <Plus className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {label}
                        </span>
                        <span className="block truncate text-sm text-muted-foreground">
                          Hueco libre
                        </span>
                      </span>
                    </button>
                  )
                })}
          </CardContent>

          {!loading && todayItems.length === 0 && (
            <p className="px-5 pb-4 text-sm text-muted-foreground">
              {(items?.length ?? 0) === 0
                ? 'Todavía no has planificado nada. Organiza tu semana y genera tu lista de la compra automáticamente.'
                : 'Hoy no tienes recetas asignadas. Puedes añadir desayuno, comida, cena y snack desde el planificador.'}
            </p>
          )}
        </Card>
      </motion.div>
    </section>
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

/* ------------------------- Receta destacada de la semana ------------------------- */

/** Gran tarjeta con la receta destacada de la semana (rotación semanal en el backend). */
function FeaturedRecipeCard({
  featured,
  onOpen,
}: {
  featured: RecipeCardData | null
  onOpen: (id: string) => void
}) {
  if (!featured) return null

  return (
    <section aria-labelledby="featured-recipe-title">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        whileHover={{ y: -3 }}
      >
        <Card
          role="button"
          tabIndex={0}
          onClick={() => onOpen(featured.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onOpen(featured.id)
            }
          }}
          aria-label={`Ver la receta destacada de la semana: ${featured.title}`}
          className="group cursor-pointer overflow-hidden py-0 transition-all hover:border-primary/40 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="grid sm:grid-cols-[260px_1fr] lg:grid-cols-[320px_1fr]">
            {/* Imagen */}
            <div className="relative h-44 overflow-hidden sm:h-full sm:min-h-56">
              <Image
                src={featured.image || '/images/recipes/pure-zanahoria.png'}
                alt={`Foto de ${featured.title}`}
                fill
                sizes="(max-width: 640px) 100vw, 320px"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/55 via-transparent to-transparent sm:bg-gradient-to-r sm:from-transparent sm:to-stone-950/10" />
              <Badge className="absolute left-3 top-3 gap-1 border-transparent bg-amber-400 text-amber-950 shadow-md">
                <Sparkles aria-hidden="true" className="size-3" />
                Receta de la semana
              </Badge>
            </div>

            {/* Contenido */}
            <div className="flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2
                    id="featured-recipe-title"
                    className="truncate text-lg font-bold tracking-tight transition-colors group-hover:text-primary sm:text-xl"
                  >
                    {featured.title}
                  </h2>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    {featured.author && (
                      <span className="inline-flex items-center gap-1.5">
                        <UserAvatar
                          name={featured.author.name}
                          role={featured.author.role}
                          className="size-5 border-0 text-[9px]"
                        />
                        {featured.author.name}
                      </span>
                    )}
                    {featured.author && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{ROLE_LABELS[featured.author.role]}</span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span>{relativeTime(featured.createdAt)}</span>
                  </div>
                </div>
                <Badge variant="outline" className="shrink-0 bg-primary/5 font-medium text-primary">
                  {featured.category}
                </Badge>
              </div>

              <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                {featured.description}
              </p>

              <div className="flex flex-wrap items-center gap-1.5">
                {featured.tags.slice(0, 3).map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="bg-accent/70 font-normal text-accent-foreground"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-3">
                {featured.ratingCount > 0 ? (
                  <span className="inline-flex items-center gap-1 text-sm font-semibold">
                    <Star aria-hidden="true" className="size-4 fill-amber-400 text-amber-400" />
                    {numEs(featured.avgRating)}
                    <span className="font-normal text-muted-foreground">
                      ({featured.ratingCount}{' '}
                      {featured.ratingCount === 1 ? 'valoración' : 'valoraciones'})
                    </span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                    <Star aria-hidden="true" className="size-4" /> Sin valoraciones aún
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock aria-hidden="true" className="size-3.5" />
                  {featured.prepTime} min
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Users aria-hidden="true" className="size-3.5" />
                  {featured.servings} {featured.servings === 1 ? 'ración' : 'raciones'}
                </span>
                <span className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-primary">
                  Ver receta
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </section>
  )
}
