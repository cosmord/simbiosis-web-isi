'use client'

import { useEffect, useState } from 'react'
import { Flag, Loader2, ShieldQuestion } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { api, jsonBody } from '@/lib/client-api'
import { useSimbiosis } from '@/lib/store'
import { REPORT_REASONS } from '@/lib/types'

/** Diálogo para denunciar contenido (recetas, comentarios, hilos, publicaciones o usuarios). */
export function ReportDialog() {
  const { reportTarget, closeReport } = useSimbiosis()
  const open = !!reportTarget

  const [reason, setReason] = useState('CONTENIDO_INADECUADO')
  const [details, setDetails] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (open) {
      setReason('CONTENIDO_INADECUADO')
      setDetails('')
    }
  }, [open])

  async function submit() {
    if (!reportTarget) return
    setSending(true)
    try {
      await api('/api/reports', jsonBody('POST', {
        targetType: reportTarget.targetType,
        targetId: reportTarget.targetId,
        reason,
        details: details.trim() || undefined,
      }))
      closeReport()
      toast.success('Gracias por ayudar a mantener la comunidad segura', {
        description: 'El equipo de coordinación revisará tu denuncia.',
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo enviar la denuncia.')
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeReport()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag aria-hidden="true" className="size-5 text-destructive" />
            Denunciar contenido
          </DialogTitle>
          <DialogDescription>
            Cuéntanos qué está pasando. El equipo de coordinación revisará tu denuncia de
            forma confidencial.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <RadioGroup value={reason} onValueChange={setReason} className="gap-2.5">
            {REPORT_REASONS.map((r) => (
              <Label
                key={r.value}
                htmlFor={`reason-${r.value}`}
                className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 font-normal transition-colors has-[button[data-state=checked]]:border-primary has-[button[data-state=checked]]:bg-secondary/60"
              >
                <RadioGroupItem id={`reason-${r.value}`} value={r.value} />
                <span className="text-sm">{r.label}</span>
              </Label>
            ))}
          </RadioGroup>

          <div className="space-y-1.5">
            <Label htmlFor="report-details">
              Detalles <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea
              id="report-details"
              rows={3}
              placeholder="Explica brevemente el motivo de tu denuncia…"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeReport} disabled={sending}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => void submit()} disabled={sending}>
              {sending ? <Loader2 className="size-4 animate-spin" /> : <ShieldQuestion aria-hidden="true" className="size-4" />}
              Enviar denuncia
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
