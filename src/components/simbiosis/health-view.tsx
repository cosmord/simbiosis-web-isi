'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CalendarDays,
  Download,
  Info,
  Lightbulb,
  Loader2,
  Minus,
  Scale,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
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
import { EmptyState } from './empty-state'
import { api, jsonBody } from '@/lib/client-api'
import { useSimbiosis } from '@/lib/store'
import type { HealthEntryData, HealthInsight } from '@/lib/types'
import {
  axisDate,
  numEs,
  shortDate,
  symptomBadgeClass,
  symptomLabel,
  todayISO,
} from '@/lib/format'
import { cn } from '@/lib/utils'

interface ChartPoint {
  date: string
  label: string
  weight: number | null
  symptoms: number
}

/** Diario de salud privado: registro de peso y síntomas con gráfica e historial. */
export function HealthView() {
  const { bumpRefresh, navigate } = useSimbiosis()

  const [entries, setEntries] = useState<HealthEntryData[] | null>(null)
  const [loading, setLoading] = useState(true)
  // Consejo personalizado calculado por el backend a partir del diario
  const [insight, setInsight] = useState<HealthInsight | null>(null)
  const [insightLoading, setInsightLoading] = useState(false)

  const [date, setDate] = useState(todayISO())
  const [weight, setWeight] = useState('')
  const [symptoms, setSymptoms] = useState(3)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const loadInsight = useCallback(async () => {
    setInsightLoading(true)
    try {
      const d = await api<{ insight: HealthInsight | null; reason: string }>(
        '/api/health/insights'
      )
      setInsight(d.insight)
    } catch {
      setInsight(null) // best-effort: si falla, no molesta al usuario
    } finally {
      setInsightLoading(false)
    }
  }, [])

  async function load() {
    setLoading(true)
    try {
      const d = await api<{ entries: HealthEntryData[] }>('/api/health/entries')
      setEntries(d.entries)
      if (d.entries.length > 0) void loadInsight()
      else setInsight(null)
    } catch (err) {
      setEntries([])
      toast.error(err instanceof Error ? err.message : 'No se pudieron cargar tus registros.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const chartData = useMemo<ChartPoint[]>(
    () =>
      (entries ?? []).map((e) => ({
        date: e.date,
        label: axisDate(e.date),
        weight: e.weight,
        symptoms: e.symptoms,
      })),
    [entries]
  )

  const summary = useMemo(() => {
    if (!entries || entries.length === 0) return null
    const last = entries[entries.length - 1]
    const prev = entries.length > 1 ? entries[entries.length - 2] : null
    let trend: 'up' | 'down' | 'flat' | null = null
    let trendDiff = 0
    if (last.weight != null && prev?.weight != null) {
      trendDiff = last.weight - prev.weight
      if (trendDiff > 0.05) trend = 'up'
      else if (trendDiff < -0.05) trend = 'down'
      else trend = 'flat'
    }
    return { last, prev, trend, trendDiff }
  }, [entries])

  async function save() {
    // Normaliza la coma decimal española (60,7 → 60.7)
    const normalizedWeight = weight.trim().replace(',', '.')
    const weightNum = normalizedWeight === '' ? undefined : Number(normalizedWeight)
    if (weightNum !== undefined && (!Number.isFinite(weightNum) || weightNum <= 0 || weightNum > 500)) {
      toast.warning('Introduce un peso válido en kilogramos (p. ej. 61,5).')
      return
    }
    if (!date) {
      toast.warning('Selecciona la fecha del registro.')
      return
    }
    setSaving(true)
    try {
      await api('/api/health/entries', jsonBody('POST', {
        date,
        weight: weightNum,
        symptoms,
        note: note.trim() || undefined,
      }))
      toast.success('Registro guardado en tu diario de salud.')
      setWeight('')
      setNote('')
      setSymptoms(3)
      await load()
      bumpRefresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar el registro.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    try {
      await api(`/api/health/entries/${id}`, jsonBody('DELETE', {}))
      toast.success('Registro eliminado.')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar el registro.')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Scale aria-hidden="true" className="size-6 text-primary" />
            Mis datos de salud
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Tu diario personal para seguir el peso y la intensidad de los síntomas.
          </p>
        </div>
        {entries && entries.length > 0 && (
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              window.location.href = '/api/health/entries/export'
              toast.success('Exportando tu diario de salud a CSV…')
            }}
          >
            <Download aria-hidden="true" className="size-4" />
            Exportar CSV
          </Button>
        )}
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
        <p className="text-sm leading-relaxed text-foreground/85">
          Registra cómo te sientes para descubrir patrones entre tu dieta y tu bienestar.
          Esta información es privada y no sustituye el seguimiento médico.
        </p>
      </div>

      {/* Consejo personalizado (se genera tras registrar entradas en el diario) */}
      {insightLoading && insight === null && (
        <Card className="py-4">
          <CardContent className="flex items-center gap-3 px-4">
            <span className="flex size-10 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              <Lightbulb aria-hidden="true" className="size-5" />
            </span>
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-3 w-80 max-w-full" />
            </div>
          </CardContent>
        </Card>
      )}
      {insight && (
        <InsightCard
          insight={insight}
          onSeeRecipes={(tag) => navigate('recipes', { tag })}
          onSeePublications={() => navigate('publications')}
        />
      )}

      {/* Resumen */}
      {summary && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="py-4">
            <CardContent className="flex items-center gap-3 px-4">
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Scale aria-hidden="true" className="size-5" />
              </span>
              <div>
                <p className="text-lg font-bold leading-tight">
                  {summary.last.weight != null ? `${numEs(summary.last.weight)} kg` : '—'}
                </p>
                <p className="text-xs text-muted-foreground">Último peso ({shortDate(summary.last.date)})</p>
              </div>
            </CardContent>
          </Card>
          <Card className="py-4">
            <CardContent className="flex items-center gap-3 px-4">
              <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                {summary.trend === 'up' ? (
                  <TrendingUp aria-hidden="true" className="size-5" />
                ) : summary.trend === 'down' ? (
                  <TrendingDown aria-hidden="true" className="size-5" />
                ) : (
                  <Minus aria-hidden="true" className="size-5" />
                )}
              </span>
              <div>
                <p className="text-lg font-bold leading-tight">
                  {summary.trend
                    ? `${summary.trend === 'up' ? '↑' : summary.trend === 'down' ? '↓' : '→'} ${numEs(Math.abs(summary.trendDiff))} kg`
                    : '—'}
                </p>
                <p className="text-xs text-muted-foreground">Tendencia frente al registro anterior</p>
              </div>
            </CardContent>
          </Card>
          <Card className="py-4">
            <CardContent className="flex items-center gap-3 px-4">
              <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <CalendarDays aria-hidden="true" className="size-5" />
              </span>
              <div>
                <p className="text-lg font-bold leading-tight">{entries?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground">
                  {entries?.length === 1 ? 'entrada registrada' : 'entradas registradas'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Formulario */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Nuevo registro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="health-date">Fecha</Label>
                <Input
                  id="health-date"
                  type="date"
                  value={date}
                  max={todayISO()}
                  onChange={(e) => setDate(e.target.value)}
                  className="min-h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="health-weight">Peso (kg)</Label>
                <Input
                  id="health-weight"
                  type="text"
                  inputMode="decimal"
                  placeholder="Ej.: 61,5"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="min-h-11"
                />
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="health-symptoms">Intensidad de los síntomas</Label>
                <Badge variant="outline" className="font-mono text-xs" aria-live="polite">
                  {symptoms}/10
                </Badge>
              </div>
              <Slider
                id="health-symptoms"
                min={0}
                max={10}
                step={1}
                value={[symptoms]}
                onValueChange={(v) => setSymptoms(v[0] ?? 0)}
                aria-label="Intensidad de los síntomas de 0 a 10"
              />
              <p className="text-xs text-muted-foreground" aria-live="polite">
                {symptomLabel(symptoms)}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="health-note">
                Nota <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Textarea
                id="health-note"
                rows={3}
                placeholder="Ej.: Cena fuera, algo más de cansancio…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <Button className="w-full min-h-11" onClick={() => void save()} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Guardar registro
            </Button>
          </CardContent>
        </Card>

        {/* Gráfica */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Evolución de peso y síntomas</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full rounded-xl" />
            ) : chartData.length === 0 ? (
              <EmptyState
                icon={Scale}
                title="Aún no hay datos para mostrar"
                description="Registra tu peso y síntomas para ver aquí tu evolución."
                className="border-none"
              />
            ) : (
              <div className="h-64 w-full" role="img" aria-label="Gráfica de evolución de peso y síntomas">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} />
                    <YAxis
                      yAxisId="left"
                      domain={['auto', 'auto']}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      tickFormatter={(v: number) => `${numEs(v)} kg`}
                      width={56}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[0, 10]}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      width={32}
                    />
                    <ReTooltip
                      formatter={(value, name) => {
                        if (name === 'Peso') return [`${numEs(Number(value))} kg`, name]
                        return [`${value} / 10 — ${symptomLabel(Number(value))}`, 'Síntomas']
                      }}
                      labelFormatter={(label) => `Fecha: ${label}`}
                      contentStyle={{
                        background: 'var(--popover)',
                        border: '1px solid var(--border)',
                        borderRadius: '0.5rem',
                        fontSize: '12px',
                      }}
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="symptoms"
                      name="Síntomas"
                      stroke="var(--chart-2)"
                      fill="var(--chart-2)"
                      fillOpacity={0.18}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="weight"
                      name="Peso"
                      stroke="var(--chart-1)"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                      connectNulls
                    />
                  </ComposedChart>
                </ResponsiveContainer>
                <div className="mt-1 flex items-center justify-center gap-5 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden="true" className="h-0.5 w-4 rounded bg-primary" /> Peso (kg)
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden="true" className="h-2 w-4 rounded bg-amber-400/40" /> Síntomas (0-10)
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Historial */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Historial de registros</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : entries && entries.length > 0 ? (
            <ul className="max-h-96 space-y-2 overflow-y-auto pr-1">
              {[...entries].reverse().map((e) => (
                <li
                  key={e.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border px-3 py-2.5"
                >
                  <span className="text-sm font-medium">{shortDate(e.date)}</span>
                  {e.weight != null && (
                    <Badge variant="outline" className="font-normal">
                      <Scale aria-hidden="true" className="size-3" />
                      {numEs(e.weight)} kg
                    </Badge>
                  )}
                  <Badge variant="outline" className={symptomBadgeClass(e.symptoms)}>
                    {e.symptoms}/10 · {symptomLabel(e.symptoms)}
                  </Badge>
                  {e.note && (
                    <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground" title={e.note}>
                      {e.note}
                    </span>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Eliminar el registro del ${shortDate(e.date)}`}
                        className="ml-auto size-9 shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar este registro?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Se eliminará la entrada del {shortDate(e.date)} de tu diario de
                          salud. Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => void remove(e.id)}
                          className="bg-destructive text-white hover:bg-destructive/90"
                        >
                          Sí, eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={CalendarDays}
              title="Tu diario está vacío"
              description="Empieza registrando cómo te sientes hoy: en unos días verás tu evolución."
              className="border-none"
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/* --------------------------- Consejo personalizado --------------------------- */

const INSIGHT_STYLES = {
  positive: {
    border: 'border-emerald-300/60 dark:border-emerald-800',
    bg: 'bg-gradient-to-br from-emerald-50 via-background to-background dark:from-emerald-950/40 dark:via-background dark:to-background',
    iconBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    badge: 'border-transparent bg-emerald-600 text-white dark:bg-emerald-500 dark:text-emerald-950',
    badgeLabel: 'Estado favorable',
  },
  watch: {
    border: 'border-amber-300/70 dark:border-amber-800',
    bg: 'bg-gradient-to-br from-amber-50 via-background to-background dark:from-amber-950/40 dark:via-background dark:to-background',
    iconBg: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    badge: 'border-transparent bg-amber-500 text-amber-950 dark:bg-amber-400 dark:text-amber-950',
    badgeLabel: 'Para vigilar',
  },
  alert: {
    border: 'border-rose-300/70 dark:border-rose-800',
    bg: 'bg-gradient-to-br from-rose-50 via-background to-background dark:from-rose-950/40 dark:via-background dark:to-background',
    iconBg: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
    badge: 'border-transparent bg-rose-600 text-white dark:bg-rose-500 dark:text-rose-950',
    badgeLabel: 'Merece atención',
  },
} as const

/** Tarjeta con el consejo personalizado generado a partir del diario de salud. */
function InsightCard({
  insight,
  onSeeRecipes,
  onSeePublications,
}: {
  insight: HealthInsight
  onSeeRecipes: (tag: string) => void
  onSeePublications: () => void
}) {
  const styles = INSIGHT_STYLES[insight.level]
  const { stats } = insight

  return (
    <motion.section
      aria-label="Consejo de salud personalizado"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn(
        'relative overflow-hidden rounded-xl border px-4 py-4 sm:px-5',
        styles.border,
        styles.bg
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <span
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-full shadow-sm',
            styles.iconBg
          )}
        >
          <Lightbulb aria-hidden="true" className="size-5.5" />
        </span>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold tracking-tight">{insight.title}</h2>
              <Badge className={styles.badge}>{styles.badgeLabel}</Badge>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-foreground/85">{insight.message}</p>
          </div>

          <ul className="grid gap-1.5 sm:grid-cols-1">
            {insight.tips.map((tip) => (
              <li key={tip} className="flex items-start gap-2 text-sm text-foreground/90">
                <span
                  aria-hidden="true"
                  className={cn('mt-[7px] size-1.5 shrink-0 rounded-full', styles.iconBg)}
                />
                {tip}
              </li>
            ))}
          </ul>

          {/* Mini-estadísticas analizadas */}
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="bg-background/60 font-normal">
              {stats.recentCount} {stats.recentCount === 1 ? 'registro' : 'registros'} esta semana
            </Badge>
            {stats.avgRecent !== null && (
              <Badge variant="outline" className="bg-background/60 font-normal">
                Media síntomas: {numEs(stats.avgRecent)}/10
              </Badge>
            )}
            {stats.weightDiff !== null && stats.weightDiff !== 0 && (
              <Badge variant="outline" className="bg-background/60 font-normal">
                Peso: {stats.weightDiff > 0 ? '+' : ''}
                {numEs(stats.weightDiff)} kg
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <Button
              size="sm"
              className="min-h-9"
              onClick={() => onSeeRecipes(insight.suggestedTags[0])}
            >
              Ver recetas aptas
              <ArrowRight aria-hidden="true" className="size-4" />
            </Button>
            <Button size="sm" variant="outline" className="min-h-9" onClick={onSeePublications}>
              Consejos de profesionales
            </Button>
            <span className="text-[11px] text-muted-foreground">
              Orientativo, no sustituye el consejo médico.
            </span>
          </div>
        </div>
      </div>
    </motion.section>
  )
}
