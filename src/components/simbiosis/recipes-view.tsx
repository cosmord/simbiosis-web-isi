'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { ChefHat, FilterX, Search, UtensilsCrossed } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { RecipeCard, RecipeCardSkeleton } from './recipe-card'
import { EmptyState } from './empty-state'
import { api } from '@/lib/client-api'
import { useSimbiosis } from '@/lib/store'
import {
  RECIPE_CATEGORIES,
  RECIPE_TAGS,
  SUITABLE_FOR,
  type RecipeCardData,
} from '@/lib/types'

const SORTS = [
  { value: 'RECENT', label: 'Más recientes' },
  { value: 'RATING', label: 'Mejor valoradas' },
  { value: 'FAVORITES', label: 'Más favoritas' },
]

const ORIGINS = [
  { value: 'ALL', label: 'Todas las autorías' },
  { value: 'PRO', label: 'Profesionales' },
  { value: 'COMMUNITY', label: 'Comunidad' },
]

/** Listado de recetas con búsqueda, filtros combinables y ordenación. */
export function RecipesView() {
  const { user, navigate, setAuthOpen, refreshKey } = useSimbiosis()

  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [category, setCategory] = useState('ALL')
  const [origin, setOrigin] = useState('ALL')
  const [sort, setSort] = useState('RECENT')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedSuitable, setSelectedSuitable] = useState<string[]>([])

  const [recipes, setRecipes] = useState<RecipeCardData[] | null>(null)
  const [loading, setLoading] = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Búsqueda con debounce de 300 ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  // Carga desde la API (los filtros de etiquetas se aplican en cliente: son combinables)
  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (debouncedQuery) params.set('q', debouncedQuery)
    if (category !== 'ALL') params.set('category', category)
    if (origin !== 'ALL') params.set('authorRole', origin)
    params.set('sort', sort)
    try {
      const d = await api<{ recipes: RecipeCardData[] }>(`/api/recipes?${params.toString()}`)
      setRecipes(d.recipes)
    } catch (err) {
      setRecipes([])
      toast.error(err instanceof Error ? err.message : 'No se pudieron cargar las recetas.')
    } finally {
      setLoading(false)
    }
  }, [debouncedQuery, category, origin, sort, refreshKey])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    if (!recipes) return null
    let items = recipes
    if (selectedTags.length > 0) {
      const tags = selectedTags.map((t) => t.toLowerCase())
      items = items.filter((r) => r.tags.some((t) => tags.includes(t.toLowerCase())))
    }
    if (selectedSuitable.length > 0) {
      const su = selectedSuitable.map((s) => s.toLowerCase())
      items = items.filter((r) => r.suitableFor.some((s) => su.includes(s.toLowerCase())))
    }
    return items
  }, [recipes, selectedTags, selectedSuitable])

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((x) => x !== value) : [...list, value])
  }

  const hasActiveFilters =
    !!debouncedQuery ||
    category !== 'ALL' ||
    origin !== 'ALL' ||
    selectedTags.length > 0 ||
    selectedSuitable.length > 0

  function clearFilters() {
    setQuery('')
    setCategory('ALL')
    setOrigin('ALL')
    setSelectedTags([])
    setSelectedSuitable([])
  }

  function newRecipe() {
    if (!user) {
      toast.info('Inicia sesión para publicar tu receta.')
      setAuthOpen(true)
      return
    }
    navigate('newRecipe')
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <UtensilsCrossed aria-hidden="true" className="size-6 text-primary" />
            Recetas de la comunidad
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Platos adaptados para brote, remisión y cada tolerancia.
          </p>
        </div>
        <Button onClick={newRecipe} className="min-h-11">
          <ChefHat aria-hidden="true" className="size-4" />
          Compartir receta
        </Button>
      </div>

      {/* Barra de herramientas */}
      <Card className="space-y-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar recetas…"
              aria-label="Buscar recetas por título o descripción"
              className="min-h-11 pl-9"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="filter-category" className="sr-only">
              Categoría
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="filter-category" className="min-h-11 w-full" aria-label="Filtrar por categoría">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas las categorías</SelectItem>
                {RECIPE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="filter-origin" className="sr-only">
                Autoría
              </Label>
              <Select value={origin} onValueChange={setOrigin}>
                <SelectTrigger id="filter-origin" className="min-h-11 w-full" aria-label="Filtrar por autoría">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORIGINS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="filter-sort" className="sr-only">
                Orden
              </Label>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger id="filter-sort" className="min-h-11 w-full" aria-label="Ordenar resultados">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORTS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="w-24 shrink-0 text-xs font-medium text-muted-foreground">Etiquetas</span>
            {RECIPE_TAGS.map((tag) => (
              <ChipToggle
                key={tag}
                label={tag}
                active={selectedTags.includes(tag)}
                onClick={() => toggle(selectedTags, setSelectedTags, tag)}
              />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="w-24 shrink-0 text-xs font-medium text-muted-foreground">Apta para</span>
            {SUITABLE_FOR.map((s) => (
              <ChipToggle
                key={s}
                label={s}
                active={selectedSuitable.includes(s)}
                onClick={() => toggle(selectedSuitable, setSelectedSuitable, s)}
              />
            ))}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="ml-auto min-h-8 text-muted-foreground"
              >
                <FilterX aria-hidden="true" className="size-4" />
                Limpiar filtros
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Resultados */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <RecipeCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered && filtered.length > 0 ? (
        <>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? 'receta encontrada' : 'recetas encontradas'}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((r) => (
              <RecipeCard key={r.id} recipe={r} />
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          icon={UtensilsCrossed}
          title="No hay recetas que coincidan con tu búsqueda"
          description="Prueba a quitar algún filtro o busca con otras palabras."
          actionLabel="Limpiar filtros"
          onAction={clearFilters}
        />
      )}
    </div>
  )
}

function ChipToggle({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-8 items-center rounded-full border px-3 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
      )}
    >
      {label}
    </button>
  )
}
