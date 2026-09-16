'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Ban,
  Check,
  CircleAlert,
  Flag,
  Loader2,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
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
  type CoordinatorUser,
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

      <Tabs defaultValue="reports">
        <TabsList>
          <TabsTrigger value="reports" className="min-h-9">
            <Flag aria-hidden="true" className="size-4" />
            Denuncias
          </TabsTrigger>
          <TabsTrigger value="users" className="min-h-9">
            <Users aria-hidden="true" className="size-4" />
            Gestión de cuentas
          </TabsTrigger>
        </TabsList>
        <TabsContent value="reports" className="mt-4">
          <ReportsPanel />
        </TabsContent>
        <TabsContent value="users" className="mt-4">
          <UsersPanel />
        </TabsContent>
      </Tabs>
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

  async function resolve(report: ReportData, resolution: 'DISMISS' | 'REMOVE_CONTENT' | 'SUSPEND_USER') {
    setBusy(true)
    try {
      await api(`/api/reports/${report.id}`, jsonBody('PATCH', {
        resolution,
        note: note.trim() || undefined,
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
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" className="min-h-9" onClick={() => setActing(r)}>
                      Revisar y actuar
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
