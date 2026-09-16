'use client'

import { useEffect, useState } from 'react'
import {
  BookOpenCheck,
  Building2,
  CheckCircle2,
  ChefHat,
  HandHeart,
  HeartPulse,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Target,
  UserRound,
  Users,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { useSimbiosis } from '@/lib/store'

const BUSINESS_OBJECTIVES = [
  { id: 'BO-01', text: 'Mejorar la calidad de vida de las personas con EII mediante recetas adaptadas a su situación.', icon: HeartPulse },
  { id: 'BO-02', text: 'Ayudar a los pacientes a gestionar su alimentación para controlar los síntomas.', icon: ChefHat },
  { id: 'BO-03', text: 'Garantizar la calidad clínica de las recetas compartidas en la plataforma.', icon: Stethoscope },
  { id: 'BO-04', text: 'Favorecer la colaboración entre pacientes, cuidadores y profesionales sanitarios.', icon: HandHeart },
  { id: 'BO-05', text: 'Construir una comunidad de apoyo mutuo alrededor de la alimentación.', icon: Users },
  { id: 'BO-06', text: 'Asegurar un entorno comunitario seguro y de confianza.', icon: ShieldCheck },
]

const STAKEHOLDERS = [
  { name: 'Pacientes con EII', detail: 'Usuarios principales: comparten y descubren recetas, participan en el foro y llevan su diario de salud.', icon: UserRound },
  { name: 'Cuidadores', detail: 'Usuarios secundarios: gestionan la dieta y el plan semanal de quien cuidan.', icon: HandHeart },
  { name: 'Nutricionistas y médicos', detail: 'Validan y publican recetas y consejos de salud con respaldo profesional.', icon: Stethoscope },
  { name: 'Organizaciones sin ánimo de lucro', detail: 'Impulsan el proyecto y difunden la plataforma entre la comunidad EII.', icon: Building2 },
  { name: 'Coordinador/a', detail: 'Supervisa la actividad, aprueba cuentas y gestiona las denuncias.', icon: ShieldCheck },
]

const SUCCESS_CRITERIA = [
  '500 usuarios activos mensuales durante los 3 primeros meses.',
  'Encuesta de satisfacción con una valoración igual o superior al 80 %.',
  'Al menos el 10 % de las recetas aportadas por profesionales en los 6 primeros meses.',
  'Al menos el 75 % de las interacciones de usuario con valoraciones positivas.',
]

const IN_SCOPE = [
  'Herramientas de gestión de la dieta',
  'Validación profesional de recetas',
  'Compartición colaborativa de recetas',
  'Interacción: comentarios, valoraciones y recomendaciones',
  'Web responsive multi-dispositivo',
]

const OUT_OF_SCOPE = [
  'Integración con historias clínicas electrónicas',
  'Seguimiento automático de la dieta o conexión con dispositivos de salud',
  'Aplicaciones móviles nativas',
]

/** Diálogo «Acerca del proyecto» con objetivos de negocio, stakeholders y alcance. */
export function AboutDialog({ children }: { children?: React.ReactNode }) {
  const { navigate } = useSimbiosis()
  const [open, setOpen] = useState(false)

  // Atajo de teclado "?" para abrir el diálogo
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (e.key === '?') setOpen((prev) => !prev)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles aria-hidden="true" className="size-4.5" />
            </span>
            Acerca del proyecto Simbiosis
          </DialogTitle>
          <DialogDescription>
            Plataforma web colaborativa de recetas para personas con Enfermedad
            Inflamatoria Intestinal (EII) · Ingeniería del Software I · Documento de
            visión y alcance v2.2.
          </DialogDescription>
        </DialogHeader>

        <section aria-labelledby="about-bo" className="space-y-3">
          <h3 id="about-bo" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Target aria-hidden="true" className="size-4" />
            Objetivos de negocio
          </h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {BUSINESS_OBJECTIVES.map(({ id, text, icon: Icon }) => (
              <li
                key={id}
                className="flex items-start gap-2.5 rounded-lg border bg-card p-3 transition-colors hover:border-primary/40"
              >
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon aria-hidden="true" className="size-3.5" />
                </span>
                <span className="text-xs leading-relaxed">
                  <Badge variant="secondary" className="mr-1.5 px-1.5 py-0 text-[10px] font-bold">
                    {id}
                  </Badge>
                  {text}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <Separator />

        <section aria-labelledby="about-stake" className="space-y-3">
          <h3 id="about-stake" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Users aria-hidden="true" className="size-4" />
            Partes interesadas
          </h3>
          <ul className="space-y-2">
            {STAKEHOLDERS.map(({ name, detail, icon: Icon }) => (
              <li key={name} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                  <Icon aria-hidden="true" className="size-3.5" />
                </span>
                <span className="text-xs leading-relaxed">
                  <strong className="font-semibold">{name}:</strong>{' '}
                  <span className="text-muted-foreground">{detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <Separator />

        <section aria-labelledby="about-success" className="space-y-2">
          <h3 id="about-success" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <CheckCircle2 aria-hidden="true" className="size-4" />
            Criterios de éxito cuantificados
          </h3>
          <ul className="space-y-1.5">
            {SUCCESS_CRITERIA.map((c) => (
              <li key={c} className="flex items-start gap-2 text-xs leading-relaxed">
                <CheckCircle2 aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                {c}
              </li>
            ))}
          </ul>
        </section>

        <Separator />

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold">
              <BookOpenCheck aria-hidden="true" className="size-4 text-emerald-600 dark:text-emerald-400" />
              Incluido en el alcance
            </h3>
            <ul className="space-y-1">
              {IN_SCOPE.map((item) => (
                <li key={item} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <CheckCircle2 aria-hidden="true" className="mt-0.5 size-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold">
              <XCircle aria-hidden="true" className="size-4 text-rose-600 dark:text-rose-400" />
              Fuera del alcance
            </h3>
            <ul className="space-y-1">
              {OUT_OF_SCOPE.map((item) => (
                <li key={item} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <XCircle aria-hidden="true" className="mt-0.5 size-3 shrink-0 text-rose-500 dark:text-rose-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <Separator />

        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">
            Restricciones del proyecto: 6 meses de duración · presupuesto de 90.000 € ·
            equipo reducido. <strong className="font-medium text-foreground">Idiomas:</strong> la
            interfaz se ofrece en español (es-ES), decisión de alcance de la v1 con la
            arquitectura preparada para añadir traducciones en el futuro.
          </p>
          <Button
            size="sm"
            onClick={() => {
              setOpen(false)
              navigate('recipes')
            }}
          >
            <ChefHat aria-hidden="true" className="size-4" />
            Explorar recetas
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
