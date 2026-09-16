'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Ban,
  BookOpenCheck,
  Check,
  CheckCircle2,
  ChefHat,
  CircleAlert,
  Flag,
  LayoutTemplate,
  Loader2,
  Mail,
  MessagesSquare,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Trophy,
  UtensilsCrossed,
  UserRound,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ImageWithFallback } from './image-with-fallback'
import { EmptyState } from './empty-state'
import { RoleBadge, UserAvatar } from './user-bits'
import { api, jsonBody } from '@/lib/client-api'
import { useSimbiosis } from '@/lib/store'
import { relativeTime, STATUS_COLORS, STATUS_LABELS } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  REPORT_REASONS,
  REPORT_TARGET_LABELS,
  ROLE_LABELS,
  type CoordinatorUser,
  type CoordinatorStatsData,
  type EmailLogData,
  type ReportData,
  type ReportStatus,
} from '@/lib/types'

const TARGET_BADGE: Record<string, string> = {
  RECIPE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  COMMENT: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300',
  THREAD: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  REPLY: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  PUBLICATION: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
  USER: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300',
}

const STATUS_BADGE: Record<ReportStatus, string> = {
  OPEN: 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300',
  RESOLVED: 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  DISMISSED: 'bg-muted text-muted-foreground',
}

const STATUS_LABEL: Record<ReportStatus, string> = {
  OPEN: 'Abierta',
  RESOLVED: 'Resuelta',
  DISMISSED: 'Desestimada',
}

/** Panel de coordinación: moderación de denuncias y gestión de cuentas. */
export function CoordinatorView() {
  const { user } = useSimbiosis()

  if (user?.role !== 'COORDINATOR') {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Acceso restringido"
        description="El panel de coordinación solo está disponible para el equipo de coordinación de la plataforma."
        className="mx-auto max-w-lg"
      />
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <ShieldCheck aria-hidden="true" className="size-6 text-primary" />
          Panel de coordinación
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Gestiona las denuncias de la comunidad y las cuentas de usuario.
        </p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 sm:w-auto">
          <TabsTrigger value="overview" className="min-h-9">
            <ChefHat aria-hidden="true" className="size-4" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="reports" className="min-h-9">
            <Flag aria-hidden="true" className="size-4" />
            Denuncias
          </TabsTrigger>
          <TabsTrigger value="users" className="min-h-9">
            <Users aria-hidden="true" className="size-4" />
            Gestión de cuentas
          </TabsTrigger>
          <TabsTrigger value="emails" className="min-h-9">
            <Mail aria-hidden="true" className="size-4" />
            Correos enviados
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <OverviewPanel />
        </TabsContent>
        <TabsContent value="reports" className="mt-4">
          <ReportsPanel />
        </TabsContent>
        <TabsContent value="users" className="mt-4">
          <UsersPanel />
        </TabsContent>
        <TabsContent value="emails" className="mt-4">
          <EmailsPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/* -------------------------------- Resumen -------------------------------- */

function OverviewPanel() {
  const [stats, setStats] = useState<CoordinatorStatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    api<CoordinatorStatsData>('/api/coordinator/stats')
      .then((d) => active && setStats(d))
      .catch(() => active && setStats(null))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    )
  }
  if (!stats) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="No se pudo cargar el resumen"
        description="Inténtalo de nuevo recargando la página."
      />
    )
  }

  const totals = [
    { label: 'Usuarios', value: stats.totals.users, icon: Users, className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
    { label: 'Recetas', value: stats.totals.recipes, icon: ChefHat, className: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
    { label: 'Hilos', value: stats.totals.threads, icon: MessagesSquare, className: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300' },
    { label: 'Publicaciones', value: stats.totals.publications, icon: BookOpenCheck, className: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' },
    { label: 'Denuncias abiertas', value: stats.totals.openReports, icon: Flag, className: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300' },
    { label: 'Denuncias resueltas', value: stats.totals.resolvedReports, icon: ShieldCheck, className: 'bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300' },
    { label: 'Comidas planificadas', value: stats.totals.plannedMeals, icon: UtensilsCrossed, className: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300' },
    { label: 'Comidas cocinadas', value: stats.totals.cookedMeals, icon: CheckCircle2, className: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' },
    { label: 'Plantillas de la comunidad', value: stats.totals.publicTemplates, icon: LayoutTemplate, className: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300' },
    { label: 'Adopciones de plantillas', value: stats.totals.templateApplies, icon: TrendingUp, className: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300' },
  ]

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {totals.map(({ label, value, icon: Icon, className }) => (
          <Card key={label} className="transition-shadow hover:shadow-sm">
            <CardContent className="flex h-full items-center gap-3 p-4">
              <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', className)}>
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xl font-bold leading-none tracking-tight">{value}</p>
                <p className="mt-1 text-xs leading-tight text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {stats.topTemplate && (
        <Card className="border-fuchsia-500/25 bg-gradient-to-r from-fuchsia-500/[0.06] via-transparent to-transparent transition-shadow hover:shadow-sm">
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300">
              <Trophy aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Plantilla más aplicada de la comunidad
              </p>
              <p className="truncate text-sm font-semibold">«{stats.topTemplate.name}»</p>
              <p className="text-xs text-muted-foreground">
                de {stats.topTemplate.authorName} · aplicada {stats.topTemplate.appliedCount}{' '}
                {stats.topTemplate.appliedCount === 1 ? 'vez' : 'veces'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4 sm:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Actividad de los últimos 14 días
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Altas de cuentas, recetas publicadas e hilos abiertos por día.
          </p>
          <div className="mt-4 h-72" role="img" aria-label="Gráfico de actividad de la comunidad en los últimos 14 días">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.activity} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={1} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <ReTooltip
                  cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                  contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="users" name="Altas de usuarios" fill="#059669" radius={[3, 3, 0, 0]} />
                <Bar dataKey="recipes" name="Recetas" fill="#d97706" radius={[3, 3, 0, 0]} />
                <Bar dataKey="threads" name="Hilos" fill="#0d9488" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Usuarios por rol
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(stats.usersByRole).map(([role, count]) => (
              <Badge key={role} variant="outline" className="gap-1.5 px-2.5 py-1">
                {ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role}
                <span className="rounded-full bg-secondary px-1.5 text-xs font-bold">{count}</span>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/* ------------------------- Correos enviados (simulado) ------------------------- */

const EMAIL_KIND_META: Record<string, { label: string; className: string }> = {
  ACCOUNT_RECEIVED: { label: 'Solicitud recibida', className: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300' },
  ACCOUNT_APPROVED: { label: 'Cuenta aprobada', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
  ACCOUNT_SUSPENDED: { label: 'Cuenta suspendida', className: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
  CONTENT_REMOVED: { label: 'Contenido retirado', className: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
  TEMPLATE_PUBLISHED: { label: 'Nueva plantilla', className: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300' },
}

function EmailsPanel() {
  const [emails, setEmails] = useState<EmailLogData[] | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api<{ emails: EmailLogData[] }>('/api/coordinator/emails')
      setEmails(d.emails)
    } catch (err) {
      setEmails([])
      toast.error(err instanceof Error ? err.message : 'No se pudieron cargar los correos.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Bandeja simulada de salida: la plataforma registra aquí los correos de seguridad y
        notificaciones que envía a los usuarios (condición de despliegue del documento de
        visión).
      </p>
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : emails && emails.length > 0 ? (
        <div className="space-y-3">
          {emails.map((e) => {
            const meta = EMAIL_KIND_META[e.kind] ?? { label: e.kind, className: '' }
            return (
              <Card key={e.id}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Mail aria-hidden="true" className="size-4 text-primary" />
                    <span className="text-sm font-semibold">{e.subject}</span>
                    <Badge className={cn('border-transparent', meta.className)}>{meta.label}</Badge>
                    <span className="ml-auto text-xs text-muted-foreground">{relativeTime(e.createdAt)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Para: <strong className="font-medium text-foreground/80">{e.toUser?.name ?? e.toEmail}</strong>
                    {' · '}
                    {e.toEmail}
                  </p>
                  <details className="group">
                    <summary className="cursor-pointer text-xs font-medium text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      Ver cuerpo del mensaje
                    </summary>
                    <p className="mt-2 whitespace-pre-line rounded-lg border bg-muted/40 p-3 text-xs leading-relaxed">
                      {e.body}
                    </p>
                  </details>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={Mail}
          title="No hay correos enviados todavía"
          description="Cuando se apruebe o suspenda una cuenta, o se retire contenido, el correo correspondiente se registrará aquí."
        />
      )}
    </div>
  )
}

/* ------------------------------ Denuncias ------------------------------ */

function ReportsPanel() {
  const [status, setStatus] = useState<'OPEN' | 'RESOLVED' | 'DISMISSED' | 'ALL'>('OPEN')
  const [reports, setReports] = useState<ReportData[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<ReportData | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api<{ reports: ReportData[] }>(`/api/reports?status=${status}`)
      setReports(d.reports)
    } catch (err) {
      setReports([])
      toast.error(err instanceof Error ? err.message : 'No se pudieron cargar las denuncias.')
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    void load()
  }, [load])

  async function resolve(
    report: ReportData,
    resolution: 'DISMISS' | 'REMOVE_CONTENT' | 'SUSPEND_USER',
    noteText?: string
  ) {
    setBusy(true)
    try {
      await api(`/api/reports/${report.id}`, jsonBody('PATCH', {
        resolution,
        note: (noteText ?? note).trim() || undefined,
      }))
      toast.success(
        resolution === 'DISMISS'
          ? 'Denuncia desestimada.'
          : resolution === 'REMOVE_CONTENT'
            ? 'Contenido eliminado y denuncia resuelta.'
            : 'Usuario suspendido y denuncia resuelta.'
      )
      setActing(null)
      setNote('')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo procesar la denuncia.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <Tabs value={status} onValueChange={(v) => setStatus(v as typeof status)}>
        <TabsList>
          <TabsTrigger value="OPEN" className="min-h-9">Abiertas</TabsTrigger>
          <TabsTrigger value="RESOLVED" className="min-h-9">Resueltas</TabsTrigger>
          <TabsTrigger value="DISMISSED" className="min-h-9">Desestimadas</TabsTrigger>
          <TabsTrigger value="ALL" className="min-h-9">Todas</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : reports && reports.length > 0 ? (
        <div className="space-y-3">
          {reports.map((r) => (
            <Card key={r.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={cn('border-transparent', TARGET_BADGE[r.targetType] ?? '')}>
                    {REPORT_TARGET_LABELS[r.targetType] ?? r.targetType}
                  </Badge>
                  <Badge variant="outline" className={STATUS_BADGE[r.status]}>
                    {STATUS_LABEL[r.status]}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <CircleAlert aria-hidden="true" className="size-3" />
                    {REPORT_REASONS.find((x) => x.value === r.reason)?.label ?? r.reason}
                  </Badge>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {relativeTime(r.createdAt)}
                  </span>
                </div>

                {/* Vista previa del contenido denunciado */}
                <div className="flex gap-3 rounded-lg border bg-muted/40 p-3">
                  {r.targetPreview?.image ? (
                    <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md">
                      <ImageWithFallback src={r.targetPreview.image} alt="" sizes="80px" />
                    </div>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    {r.targetPreview ? (
                      <>
                        <p className="truncate text-sm font-medium">
                          {r.targetPreview.title ?? r.targetPreview.name ?? 'Contenido'}
                        </p>
                        {r.targetPreview.snippet && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {r.targetPreview.snippet}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm italic text-muted-foreground">Contenido eliminado</p>
                    )}
                  </div>
                </div>

                {r.details && (
                  <p className="text-sm leading-relaxed">
                    <span className="font-medium">Detalle del denunciante:</span> {r.details}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <UserRound aria-hidden="true" className="size-3.5" />
                    Denunciado por <strong className="font-medium">{r.reporter.name}</strong>
                  </span>
                  <RoleBadge role={r.reporter.role} />
                </div>

                {(r.status === 'RESOLVED' || r.status === 'DISMISSED') && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-xs text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                    <p className="font-semibold">
                      {r.status === 'DISMISSED' ? 'Denuncia desestimada' : 'Denuncia resuelta'}
                      {r.resolvedBy ? ` por ${r.resolvedBy.name}` : ''}
                    </p>
                    {r.resolution && <p className="mt-0.5">{r.resolution}</p>}
                  </div>
                )}

                {r.status === 'OPEN' && (
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {/* Acciones rápidas en línea: desestimar directo y retirar contenido
                        con confirmación; «Revisar» abre el diálogo completo con nota y
                        suspensión de usuario. */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="min-h-9 text-muted-foreground hover:text-foreground"
                      disabled={busy}
                      onClick={() => void resolve(r, 'DISMISS')}
                      aria-label={`Desestimar la denuncia de ${r.targetPreview?.title ?? r.targetType.toLowerCase()}`}
                    >
                      <RotateCcw aria-hidden="true" className="size-3.5" />
                      Desestimar
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="min-h-9 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          disabled={busy}
                        >
                          <Trash2 aria-hidden="true" className="size-3.5" />
                          Eliminar contenido
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Retirar el contenido denunciado?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Se eliminará «{r.targetPreview?.title ?? 'el contenido'}» y la denuncia se
                            marcará como resuelta. El autor recibirá una notificación. Esta acción no se
                            puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-white hover:bg-destructive/90"
                            onClick={() => void resolve(r, 'REMOVE_CONTENT')}
                          >
                            Sí, retirar contenido
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button variant="outline" size="sm" className="min-h-9" onClick={() => setActing(r)}>
                      Revisar y actuar…
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Flag}
          title="No hay denuncias en este estado"
          description="Cuando alguien denuncie contenido, aparecerá aquí para su revisión."
        />
      )}

      {/* Diálogo de resolución */}
      <Dialog open={!!acting} onOpenChange={(o) => !o && setActing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resolver denuncia</DialogTitle>
            <DialogDescription>
              Elige la acción a realizar. Puedes añadir una nota que quedará registrada
              junto a la resolución.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="report-note">Nota interna (opcional)</Label>
              <Textarea
                id="report-note"
                rows={2}
                placeholder="Ej.: Revisado, se confirma la infracción…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              variant="outline"
              className="w-full min-h-11"
              disabled={busy}
              onClick={() => acting && void resolve(acting, 'DISMISS')}
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              Desestimar denuncia
            </Button>
            <Button
              variant="destructive"
              className="w-full min-h-11"
              disabled={busy}
              onClick={() => acting && void resolve(acting, 'REMOVE_CONTENT')}
            >
              <Trash2 aria-hidden="true" className="size-4" />
              Eliminar contenido
            </Button>
            <Button
              variant="destructive"
              className="w-full min-h-11 bg-rose-700 hover:bg-rose-700/90"
              disabled={busy}
              onClick={() => acting && void resolve(acting, 'SUSPEND_USER')}
            >
              <Ban aria-hidden="true" className="size-4" />
              Suspender usuario
            </Button>
            {busy && (
              <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" /> Procesando…
              </p>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* --------------------------- Gestión de cuentas --------------------------- */

function UsersPanel() {
  const [filter, setFilter] = useState<'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'ALL'>('PENDING')
  const [users, setUsers] = useState<CoordinatorUser[] | null>(null)
  const [counts, setCounts] = useState<{ pending: number; active: number; suspended: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api<{ users: CoordinatorUser[] }>(`/api/coordinator/users?status=${filter}`)
      setUsers(d.users)
    } catch (err) {
      setUsers([])
      toast.error(err instanceof Error ? err.message : 'No se pudieron cargar las cuentas.')
    } finally {
      setLoading(false)
    }
  }, [filter])

  const loadCounts = useCallback(async () => {
    try {
      const d = await api<{ users: CoordinatorUser[] }>('/api/coordinator/users?status=ALL')
      setCounts({
        pending: d.users.filter((u) => u.status === 'PENDING').length,
        active: d.users.filter((u) => u.status === 'ACTIVE').length,
        suspended: d.users.filter((u) => u.status === 'SUSPENDED').length,
      })
    } catch {
      // silencioso: los contadores son solo informativos
    }
  }, [])

  useEffect(() => {
    void loadCounts()
  }, [loadCounts])

  useEffect(() => {
    void load()
  }, [load])

  async function act(id: string, action: 'ACTIVATE' | 'SUSPEND' | 'DELETE', name: string) {
    setBusyId(id)
    try {
      await api(`/api/coordinator/users/${id}`, jsonBody('PATCH', { action }))
      toast.success(
        action === 'ACTIVATE'
          ? `Cuenta de ${name} aprobada. Ya puede iniciar sesión.`
          : action === 'SUSPEND'
            ? `Cuenta de ${name} suspendida.`
            : `Cuenta de ${name} eliminada definitivamente.`
      )
      await load()
      await loadCounts()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar la cuenta.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="w-full sm:w-48">
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger aria-label="Filtrar cuentas por estado" className="min-h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">Pendientes</SelectItem>
              <SelectItem value="ACTIVE">Activas</SelectItem>
              <SelectItem value="SUSPENDED">Suspendidas</SelectItem>
              <SelectItem value="ALL">Todas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {counts && (
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
              {counts.pending} pendientes de aprobación
            </Badge>
            <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              {counts.active} activas
            </Badge>
            <Badge variant="outline" className="border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300">
              {counts.suspended} suspendidas
            </Badge>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : users && users.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {users.map((u) => (
                <li key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <UserAvatar name={u.name} role={u.role} className="size-10" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-semibold">{u.name}</span>
                      <RoleBadge role={u.role} />
                      <Badge
                        variant="outline"
                        className={cn('border-transparent px-1.5 py-0 text-[10px]', STATUS_COLORS[u.status] ?? '')}
                      >
                        {STATUS_LABELS[u.status] ?? u.status}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {u.email} · registrada {relativeTime(u.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {busyId === u.id && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                    {u.status === 'PENDING' && (
                      <Button
                        size="sm"
                        className="min-h-9 gap-1"
                        onClick={() => void act(u.id, 'ACTIVATE', u.name)}
                        disabled={busyId === u.id}
                      >
                        <Check aria-hidden="true" className="size-4" />
                        Aprobar
                      </Button>
                    )}
                    {u.status === 'ACTIVE' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="min-h-9 gap-1"
                        onClick={() => void act(u.id, 'SUSPEND', u.name)}
                        disabled={busyId === u.id}
                      >
                        <Ban aria-hidden="true" className="size-4" />
                        Suspender
                      </Button>
                    )}
                    {u.status === 'SUSPENDED' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="min-h-9 gap-1"
                        onClick={() => void act(u.id, 'ACTIVATE', u.name)}
                        disabled={busyId === u.id}
                      >
                        <RotateCcw aria-hidden="true" className="size-4" />
                        Reactivar
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Eliminar la cuenta de ${u.name}`}
                          className="size-9 text-muted-foreground hover:text-destructive"
                          disabled={busyId === u.id}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar esta cuenta?</AlertDialogTitle>
                          <AlertDialogDescription>
                            La cuenta de {u.name} ({u.email}) y todo su contenido se
                            eliminarán definitivamente. Esta acción no se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => void act(u.id, 'DELETE', u.name)}
                            className="bg-destructive text-white hover:bg-destructive/90"
                          >
                            Sí, eliminar cuenta
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          icon={Users}
          title="No hay cuentas en este estado"
          description="Las cuentas de nueva creación pendientes de aprobación aparecerán aquí."
        />
      )}

      <Separator className="opacity-0" />
    </div>
  )
}
