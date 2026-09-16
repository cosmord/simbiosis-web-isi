'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Bookmark,
  BookmarkCheck,
  CalendarDays,
  Check,
  ClipboardCopy,
  Cookie,
  Copy,
  Download,
  LayoutTemplate,
  Loader2,
  Moon,
  Plus,
  Printer,
  ShoppingBasket,
  Sun,
  Sunrise,
  Trash2,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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
import { ImageWithFallback } from './image-with-fallback'
import { EmptyState } from './empty-state'
import { api, jsonBody } from '@/lib/client-api'
import { useSimbiosis } from '@/lib/store'
import {
  PLAN_DAY_NAMES,
  PLAN_SLOTS,
  type PlanItemData,
  type PlanRecipeSummary,
  type PlanSlot,
  type PlanTemplateData,
  type RecipeCardData,
} from '@/lib/types'
import { cn } from '@/lib/utils'

const SLOT_ICONS = {
  sunrise: Sunrise,
  sun: Sun,
  moon: Moon,
  cookie: Cookie,
} as const

interface ShoppingEntry {
  key: string
  label: string
  count: number
}

/** Agrupa los ingredientes de todas las recetas del plan. */
function buildShoppingList(items: PlanItemData[]): ShoppingEntry[] {
  const map = new Map<string, ShoppingEntry>()
  for (const item of items) {
    for (const raw of item.recipe.ingredients) {
      const label = raw.replace(/\s+/g, ' ').trim()
      if (!label) continue
      const key = label.toLowerCase()
      const existing = map.get(key)
      if (existing) existing.count += 1
      else map.set(key, { key, label, count: 1 })
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label, 'es')
  )
}

/** Planificador semanal: organiza recetas en 7 días × 4 franjas y genera la lista de la compra. */
export function PlanView() {
  const { user, setAuthOpen, navigate, bumpRefresh } = useSimbiosis()
  const [items, setItems] = useState<PlanItemData[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [picker, setPicker] = useState<{ day: number; slot: PlanSlot } | null>(null)
  const [clearOpen, setClearOpen] = useState(false)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [copySource, setCopySource] = useState<number | null>(null)
  // Plantillas de menú: guardar el plan actual y recuperar planes guardados
  const [saveOpen, setSaveOpen] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [templates, setTemplates] = useState<PlanTemplateData[] | null>(null)
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [applyingId, setApplyingId] = useState<string | null>(null)
  const [confirmApply, setConfirmApply] = useState<PlanTemplateData | null>(null)
  // Día actual (0 = lunes … 6 = domingo). Se resuelve tras montar para evitar
  // discrepancias de hidratación entre servidor y cliente.
  const [today, setToday] = useState<number | null>(null)

  const fetchPlan = useCallback(async () => {
    const d = await api<{ items: PlanItemData[] }>('/api/plan')
    setItems(d.items)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      await fetchPlan()
    } catch (err) {
      setItems([])
      toast.error(err instanceof Error ? err.message : 'No se pudo cargar tu plan semanal.')
    } finally {
      setLoading(false)
    }
  }, [fetchPlan])

  useEffect(() => {
    if (user) void load()
    else setLoading(false)
  }, [user, load])

  useEffect(() => {
    const t = setTimeout(() => setToday((new Date().getDay() + 6) % 7), 0)
    return () => clearTimeout(t)
  }, [])

  const shoppingList = useMemo(() => buildShoppingList(items ?? []), [items])

  function itemAt(day: number, slot: PlanSlot): PlanItemData | undefined {
    return items?.find((it) => it.day === day && it.slot === slot)
  }

  async function assign(recipe: PlanRecipeSummary | RecipeCardData) {
    if (!picker) return
    try {
      const d = await api<{ item: PlanItemData }>(
        '/api/plan',
        jsonBody('PUT', { day: picker.day, slot: picker.slot, recipeId: recipe.id })
      )
      setItems((prev) => {
        const rest = (prev ?? []).filter(
          (it) => !(it.day === picker.day && it.slot === picker.slot)
        )
        return [...rest, d.item]
      })
      toast.success(`«${recipe.title}» añadida al ${PLAN_DAY_NAMES[picker.day].toLowerCase()} (${PLAN_SLOTS.find((s) => s.value === picker.slot)?.label.toLowerCase()}).`)
      setPicker(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo añadir la receta al plan.')
    }
  }

  async function removeItem(id: string) {
    try {
      await api(`/api/plan/${id}`, jsonBody('DELETE', {}))
      setItems((prev) => (prev ?? []).filter((it) => it.id !== id))
      toast.success('Receta quitada del plan.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo quitar la receta.')
    }
  }

  async function clearAll() {
    try {
      await api('/api/plan', jsonBody('DELETE', {}))
      setItems([])
      setChecked(new Set())
      toast.success('Plan semanal vaciado.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo vaciar el plan.')
    }
  }

  /** Copia todas las franjas planificadas de un día a otro (sobrescribe el destino). */
  async function copyDay(from: number, to: number) {
    const source = PLAN_SLOTS.map(({ value }) => itemAt(from, value)).filter(
      (it): it is PlanItemData => !!it
    )
    setCopySource(null)
    if (source.length === 0) return
    try {
      await Promise.all(
        source.map((it) =>
          api('/api/plan', jsonBody('PUT', { day: to, slot: it.slot, recipeId: it.recipe.id }))
        )
      )
      await fetchPlan()
      toast.success(
        `Menú del ${PLAN_DAY_NAMES[from].toLowerCase()} copiado al ${PLAN_DAY_NAMES[to].toLowerCase()} (${source.length} ${source.length === 1 ? 'receta' : 'recetas'}).`
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo copiar el menú del día.')
    }
  }

  /** Descarga la lista de la compra como CSV compatible con Excel-es (BOM + ";"). */
  function exportCsv() {
    if (shoppingList.length === 0) return
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
    const rows = ['Ingrediente;Raciones que lo usan']
    for (const e of shoppingList) rows.push(`${esc(e.label)};${e.count}`)
    const csv = '\uFEFF' + rows.join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `lista-compra-simbiosis-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Lista de la compra exportada a CSV.')
  }

  async function copyList() {
    if (shoppingList.length === 0) return
    const text = [
      '🛒 Lista de la compra — Simbiosis',
      '',
      ...shoppingList.map((e) => `${e.count > 1 ? `(x${e.count}) ` : ''}${e.label}`),
    ].join('\n')
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Lista de la compra copiada al portapapeles.')
    } catch {
      toast.warning('Tu navegador no permite copiar automáticamente. Copia manualmente la lista.')
    }
  }

  /* ------------------------- Plantillas de menú ------------------------- */

  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true)
    try {
      const d = await api<{ templates: PlanTemplateData[] }>('/api/plan/templates')
      setTemplates(d.templates)
    } catch (err) {
      setTemplates([])
      toast.error(err instanceof Error ? err.message : 'No se pudieron cargar tus plantillas.')
    } finally {
      setLoadingTemplates(false)
    }
  }, [])

  useEffect(() => {
    if (templatesOpen) void loadTemplates()
  }, [templatesOpen, loadTemplates])

  async function saveTemplate() {
    const name = templateName.trim()
    if (!name) {
      toast.warning('Escribe un nombre para la plantilla (p. ej. «Semana suave»).')
      return
    }
    setSavingTemplate(true)
    try {
      const d = await api<{ template: PlanTemplateData; updated: boolean }>(
        '/api/plan/templates',
        jsonBody('POST', { name })
      )
      toast.success(
        d.updated
          ? `Plantilla «${d.template.name}» actualizada con tu plan actual.`
          : `Plan guardado como plantilla «${d.template.name}».`
      )
      setSaveOpen(false)
      setTemplateName('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar la plantilla.')
    } finally {
      setSavingTemplate(false)
    }
  }

  /** Aplica la plantilla: sustituye el plan actual por su contenido guardado. */
  async function applyTemplate(t: PlanTemplateData) {
    setConfirmApply(null)
    setApplyingId(t.id)
    try {
      const d = await api<{ applied: number; removed: number; items: PlanItemData[] }>(
        `/api/plan/templates/${t.id}/apply`,
        jsonBody('POST', {})
      )
      setItems(d.items)
      setChecked(new Set())
      setTemplatesOpen(false)
      toast.success(
        `Plantilla «${t.name}» aplicada: ${d.applied} ${d.applied === 1 ? 'receta planificada' : 'recetas planificadas'}.`
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo aplicar la plantilla.')
    } finally {
      setApplyingId(null)
    }
  }

  async function deleteTemplate(t: PlanTemplateData) {
    try {
      await api(`/api/plan/templates/${t.id}`, jsonBody('DELETE', {}))
      setTemplates((prev) => (prev ?? []).filter((x) => x.id !== t.id))
      toast.success(`Plantilla «${t.name}» eliminada.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar la plantilla.')
    }
  }

  if (!user) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Planifica tu semana con Simbiosis"
        description="Organiza tus recetas en un menú semanal y genera automáticamente tu lista de la compra. Inicia sesión para empezar."
        actionLabel="Iniciar sesión"
        onAction={() => setAuthOpen(true)}
      />
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  const plannedCount = items?.length ?? 0

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            <CalendarDays aria-hidden="true" className="size-7 text-primary" />
            Mi plan semanal
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Organiza tus menús de la semana y controla los síntomas con una dieta planificada.
          </p>
        </div>
        {plannedCount > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => {
                setTemplateName('')
                setSaveOpen(true)
              }}
            >
              <Bookmark aria-hidden="true" className="size-4" />
              Guardar como plantilla
            </Button>
            <Button variant="outline" className="min-h-11" onClick={() => window.print()}>
              <Printer aria-hidden="true" className="size-4" />
              Imprimir plan
            </Button>
            <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="min-h-11">
                  <Trash2 aria-hidden="true" className="size-4" />
                  Vaciar semana
                </Button>
              </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Vaciar todo el plan semanal?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se quitarán las {plannedCount} recetas planificadas. Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-white hover:bg-destructive/90"
                  onClick={() => void clearAll()}
                >
                  Sí, vaciar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          </div>
        )}
        <Button variant="outline" className="min-h-11" onClick={() => setTemplatesOpen(true)}>
          <LayoutTemplate aria-hidden="true" className="size-4 text-primary" />
          Mis plantillas
        </Button>
      </div>

      <div className="print-plan print-plan-layout grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">
        {/* Rejilla de días */}
        <div className="print-plan-grid grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {/* Cabecera exclusiva de la hoja impresa */}
          <header className="hidden print:mb-3 print:block sm:col-span-2 2xl:col-span-3">
            <h1 className="text-lg font-bold">Mi plan semanal · Simbiosis</h1>
            <p className="text-xs text-muted-foreground">
              Menú para la semana del {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })} · {plannedCount} {plannedCount === 1 ? 'receta planificada' : 'recetas planificadas'}
            </p>
          </header>
          {PLAN_DAY_NAMES.map((dayName, day) => {
            const dayItems = PLAN_SLOTS.map((slot) => ({ slot, item: itemAt(day, slot.value) }))
            const filled = dayItems.filter((d) => d.item).length
            return (
              <motion.div
                key={dayName}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: day * 0.03 }}
              >
                <Card
                  className={cn(
                    'h-full transition-shadow',
                    filled === 4 && 'border-primary/40',
                    today === day && 'border-primary/60 shadow-md ring-2 ring-primary/30'
                  )}
                >
                  <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
                      {dayName}
                      {today === day && (
                        <Badge className="gap-0.5 border-transparent bg-amber-400 px-1.5 py-0 text-[10px] font-bold text-amber-950">
                          <CalendarDays aria-hidden="true" className="size-2.5" />
                          Hoy
                        </Badge>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      <Badge
                        variant="outline"
                        className={cn(
                          'px-1.5 py-0 text-[10px]',
                          filled === 4
                            ? 'border-primary/40 bg-primary/10 text-primary'
                            : 'text-muted-foreground'
                        )}
                      >
                        {filled}/4
                      </Badge>
                      {filled > 0 && (
                        <Popover open={copySource === day} onOpenChange={(o) => setCopySource(o ? day : null)}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 rounded-full text-muted-foreground hover:text-primary print:hidden"
                              aria-label={`Copiar el menú del ${dayName.toLowerCase()} a otro día`}
                              title="Copiar a otro día"
                            >
                              <Copy aria-hidden="true" className="size-3.5" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-56 p-2">
                            <p className="px-2 pb-1.5 text-xs font-semibold text-muted-foreground">
                              Copiar menú del {dayName.toLowerCase()} a…
                            </p>
                            <div className="space-y-0.5">
                              {PLAN_DAY_NAMES.map((targetName, target) =>
                                target === day ? null : (
                                  <button
                                    key={targetName}
                                    type="button"
                                    className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                                    onClick={() => void copyDay(day, target)}
                                    aria-label={`Copiar el menú del ${dayName.toLowerCase()} al ${targetName.toLowerCase()}`}
                                  >
                                    {targetName}
                                    {PLAN_SLOTS.filter(({ value }) => itemAt(target, value)).length > 0 && (
                                      <span className="text-[10px] text-muted-foreground">
                                        {PLAN_SLOTS.filter(({ value }) => itemAt(target, value)).length}/4
                                      </span>
                                    )}
                                  </button>
                                )
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1.5">
                    {dayItems.map(({ slot: slotDef, item }) => {
                      const Icon = SLOT_ICONS[slotDef.icon]
                      const slotLabel = PLAN_SLOTS.find((s) => s.value === slotDef.value)?.label ?? ''
                      return (
                        <div
                          key={slotDef.value}
                          className="flex items-center gap-2 rounded-lg border border-dashed px-2 py-1.5"
                        >
                          <Icon aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
                          <span className="w-16 shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            {slotLabel}
                          </span>
                          {item ? (
                            <div className="flex min-w-0 flex-1 items-center gap-1.5">
                              <button
                                type="button"
                                className="min-w-0 flex-1 truncate text-left text-sm font-medium hover:text-primary hover:underline"
                                onClick={() => navigate('recipeDetail', { id: item.recipe.id })}
                                aria-label={`Ver receta ${item.recipe.title}`}
                              >
                                {item.recipe.title}
                              </button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-6 shrink-0 rounded-full text-muted-foreground hover:text-destructive print:hidden"
                                onClick={() => void removeItem(item.id)}
                                aria-label={`Quitar ${item.recipe.title} del ${slotLabel.toLowerCase()} del ${dayName.toLowerCase()}`}
                              >
                                <X aria-hidden="true" className="size-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="flex flex-1 items-center justify-center gap-1 rounded-md py-1 text-xs text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring print:hidden"
                              onClick={() => setPicker({ day, slot: slotDef.value })}
                              aria-label={`Añadir receta al ${slotLabel.toLowerCase()} del ${dayName.toLowerCase()}`}
                            >
                              <Plus aria-hidden="true" className="size-3.5" />
                              Añadir
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>

        {/* Lista de la compra */}
        <Card className="xl:sticky xl:top-20 h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingBasket aria-hidden="true" className="size-4.5 text-primary" />
              Lista de la compra
              {plannedCount > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {plannedCount} {plannedCount === 1 ? 'receta' : 'recetas'}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {shoppingList.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Añade recetas a tu plan y aquí aparecerán todos los ingredientes que necesitas,
                agrupados automáticamente.
              </p>
            ) : (
              <>
                <ul className="max-h-96 space-y-1 overflow-y-auto pr-1">
                  {shoppingList.map((entry) => {
                    const isChecked = checked.has(entry.key)
                    return (
                      <li key={entry.key}>
                        <button
                          type="button"
                          onClick={() =>
                            setChecked((prev) => {
                              const next = new Set(prev)
                              if (next.has(entry.key)) next.delete(entry.key)
                              else next.add(entry.key)
                              return next
                            })
                          }
                          className={cn(
                            'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
                            isChecked && 'text-muted-foreground'
                          )}
                          aria-pressed={isChecked}
                        >
                          <span
                            aria-hidden="true"
                            className={cn(
                              'flex size-4.5 shrink-0 items-center justify-center rounded-full border transition-colors',
                              isChecked
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-input'
                            )}
                          >
                            {isChecked && <Check className="size-3" />}
                          </span>
                          <span className={cn('min-w-0 flex-1', isChecked && 'line-through')}>
                            {entry.label}
                          </span>
                          {entry.count > 1 && (
                            <Badge variant="outline" className="shrink-0 px-1.5 py-0 text-[10px] text-muted-foreground">
                              ×{entry.count}
                            </Badge>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
                <Separator />
                <div className="flex items-center justify-between gap-2 print:hidden">
                  <span className="text-xs text-muted-foreground">
                    {checked.size} de {shoppingList.length} marcados
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-9"
                      onClick={exportCsv}
                      aria-label="Exportar la lista de la compra en CSV"
                    >
                      <Download aria-hidden="true" className="size-4" />
                      CSV
                    </Button>
                    <Button variant="outline" size="sm" className="min-h-9" onClick={() => void copyList()}>
                      <ClipboardCopy aria-hidden="true" className="size-4" />
                      Copiar lista
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Selector de receta */}
      <RecipePickerDialog
        picker={picker}
        onClose={() => setPicker(null)}
        onPick={(recipe) => void assign(recipe)}
      />

      {/* Guardar plan como plantilla */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookmarkCheck aria-hidden="true" className="size-5 text-primary" />
              Guardar como plantilla
            </DialogTitle>
            <DialogDescription>
              Se guardará tu plan semanal actual ({plannedCount}{' '}
              {plannedCount === 1 ? 'receta' : 'recetas'}) con el nombre que elijas. Podrás
              recuperarlo en cualquier momento desde «Mis plantillas».
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="template-name">Nombre de la plantilla</Label>
            <Input
              id="template-name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Ej.: Semana suave en brote"
              maxLength={60}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !savingTemplate) void saveTemplate()
              }}
            />
            <p className="text-xs text-muted-foreground">
              Si ya existe una plantilla con ese nombre, se actualizará con tu plan actual.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)} disabled={savingTemplate}>
              Cancelar
            </Button>
            <Button onClick={() => void saveTemplate()} disabled={savingTemplate}>
              {savingTemplate ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Bookmark aria-hidden="true" className="size-4" />}
              Guardar plantilla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Listado y aplicación de plantillas */}
      <Dialog open={templatesOpen} onOpenChange={setTemplatesOpen}>
        <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutTemplate aria-hidden="true" className="size-5 text-primary" />
              Mis plantillas de menú
            </DialogTitle>
            <DialogDescription>
              Aplica una plantilla para rellenar tu semana al instante. Sustituirá el plan
              actual si lo tienes.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
            {loadingTemplates ? (
              <div className="space-y-2 py-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : (templates ?? []).length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <LayoutTemplate aria-hidden="true" className="size-6" />
                </span>
                <p className="text-sm font-medium">Aún no tienes plantillas</p>
                <p className="max-w-xs text-xs text-muted-foreground">
                  Organiza una semana que te siente bien y guárdala con «Guardar como plantilla»
                  para reutilizarla cuando quieras.
                </p>
              </div>
            ) : (
              (templates ?? []).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:border-primary/40"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <UtensilsCrossed aria-hidden="true" className="size-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.recipeCount} {t.recipeCount === 1 ? 'receta' : 'recetas'} · guardada el{' '}
                      {new Date(t.createdAt).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="min-h-9"
                    disabled={applyingId === t.id}
                    onClick={() =>
                      plannedCount > 0 ? setConfirmApply(t) : void applyTemplate(t)
                    }
                  >
                    {applyingId === t.id ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : null}
                    Aplicar
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
                        aria-label={`Eliminar la plantilla ${t.name}`}
                      >
                        <Trash2 aria-hidden="true" className="size-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar la plantilla «{t.name}»?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tu plan semanal actual no se verá afectado. Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-white hover:bg-destructive/90"
                          onClick={() => void deleteTemplate(t)}
                        >
                          Sí, eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmación al aplicar con un plan en curso */}
      <AlertDialog open={!!confirmApply} onOpenChange={(o) => !o && setConfirmApply(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Aplicar la plantilla «{confirmApply?.name}»?</AlertDialogTitle>
            <AlertDialogDescription>
              Tu plan semanal actual ({plannedCount}{' '}
              {plannedCount === 1 ? 'receta' : 'recetas'}) se sustituirá por el contenido de la
              plantilla ({confirmApply?.recipeCount ?? 0}). Podrás rehacerlo, pero esta acción no
              guarda el plan actual.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmApply && void applyTemplate(confirmApply)}>
              Sí, aplicar plantilla
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/** Diálogo para buscar y elegir la receta que ocupará un hueco del plan. */
function RecipePickerDialog({
  picker,
  onClose,
  onPick,
}: {
  picker: { day: number; slot: PlanSlot } | null
  onClose: () => void
  onPick: (recipe: PlanRecipeSummary | RecipeCardData) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlanRecipeSummary[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!picker) return
    let active = true
    const t = setTimeout(() => {
      setLoading(true)
      api<{ recipes: (RecipeCardData & { ingredients?: string[] })[] }>(
        `/api/recipes?q=${encodeURIComponent(query)}`
      )
        .then((d) => {
          if (!active) return
          setResults(
            d.recipes.map((r) => ({
              id: r.id,
              title: r.title,
              image: r.image,
              category: r.category,
              ingredients: r.ingredients ?? [],
              prepTime: r.prepTime,
              servings: r.servings,
              author: r.author ?? { id: '', name: 'Comunidad', role: 'PATIENT' },
            }))
          )
        })
        .catch(() => active && setResults([]))
        .finally(() => active && setLoading(false))
    }, 250)
    return () => {
      active = false
      clearTimeout(t)
    }
  }, [picker, query])

  function handleClose() {
    setQuery('')
    setResults(null)
    onClose()
  }

  const slotLabel = picker ? PLAN_SLOTS.find((s) => s.value === picker.slot)?.label : ''
  const dayLabel = picker ? PLAN_DAY_NAMES[picker.day] : ''

  return (
    <Dialog open={!!picker} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Añadir receta · {dayLabel} · {slotLabel}</DialogTitle>
          <DialogDescription>
            Busca una receta de la comunidad para este hueco del plan. Sustituirá la actual si la hay.
          </DialogDescription>
        </DialogHeader>
        <Input
          placeholder="Buscar recetas por título o descripción…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar recetas para el plan"
        />
        <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
          {results === null ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />
            </div>
          ) : (results ?? []).length === 0 ? (
            <p className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
              <UtensilsCrossed aria-hidden="true" className="size-6" />
              No hay recetas que coincidan con la búsqueda.
            </p>
          ) : (
            (results ?? []).map((recipe) => (
              <button
                key={recipe.id}
                type="button"
                className="flex w-full items-center gap-3 rounded-xl border p-2 text-left outline-none transition-colors hover:border-primary/40 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => onPick(recipe)}
                aria-label={`Añadir ${recipe.title} al plan`}
              >
                <span className="relative size-12 shrink-0 overflow-hidden rounded-lg">
                  <ImageWithFallback src={recipe.image} alt="" sizes="48px" icon="none" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{recipe.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {recipe.category} · {recipe.prepTime} min · {recipe.servings}{' '}
                    {recipe.servings === 1 ? 'ración' : 'raciones'}
                  </span>
                </span>
                <Plus aria-hidden="true" className="size-4 shrink-0 text-primary" />
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
