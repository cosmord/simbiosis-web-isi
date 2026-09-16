'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  Check,
  ChefHat,
  HeartPulse,
  HelpCircle,
  Home,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useSimbiosis, type View } from '@/lib/store'
import { cn } from '@/lib/utils'

interface GuideSlide {
  icon: typeof Home
  title: string
  description: string
  cta?: { label: string; view: View }
  proNote?: string
  coordinatorNote?: string
}

const SLIDES: GuideSlide[] = [
  {
    icon: Home,
    title: 'Bienvenido a Simbiosis',
    description:
      'Simbiosis es la comunidad donde las personas que viven con Enfermedad Inflamatoria Intestinal (EII), sus cuidadores y profesionales sanitarios comparten recetas adaptadas, experiencias y consejos para el día a día.',
  },
  {
    icon: UtensilsCrossed,
    title: 'Explora recetas adaptadas',
    description:
      'Filtra las recetas por categoría, etiquetas como «baja en residuos» o «sin lactosa», y por fase (brote activo, brote leve o remisión). Cada receta indica tiempo de preparación, raciones y valoraciones de la comunidad.',
    cta: { label: 'Ir a las recetas', view: 'recipes' },
  },
  {
    icon: ChefHat,
    title: 'Comparte tu receta',
    description:
      '¿Has encontrado un plato que te sienta genial? Publícalo con sus ingredientes y pasos para que otras personas lo prueben. Marca para qué fase es adecuada y recibe valoraciones de la comunidad.',
  },
  {
    icon: MessagesSquare,
    title: 'Foro y comunidad',
    description:
      'Abre hilos sobre dieta y síntomas, cocina, apoyo emocional o dudas generales. Compartir experiencias ayuda a quien empieza este camino: toda pregunta cuenta.',
    cta: { label: 'Visitar el foro', view: 'forum' },
  },
  {
    icon: BookOpenCheck,
    title: 'Consejos de profesionales',
    description:
      'Nutricionistas y médicos publican artículos sobre nutrición, estilo de vida, bienestar emocional y tratamiento. Son contenido divulgativo de referencia: puedes marcar «me gusta» en los que te resulten útiles.',
    cta: { label: 'Ver consejos', view: 'publications' },
    proNote:
      'Como profesional, además puedes publicar consejos de salud: aparecerán firmados con tu perfil y se moderan con especial cuidado.',
  },
  {
    icon: HeartPulse,
    title: 'Tu diario de salud',
    description:
      'Registra a diario tu peso y la intensidad de tus síntomas (0-10). Con el tiempo verás gráficas que te ayudan a descubrir patrones entre tu dieta y tu bienestar. Estos datos son privados: solo tú puedes verlos.',
    cta: { label: 'Abrir mi diario', view: 'health' },
  },
  {
    icon: ShieldCheck,
    title: 'Moderación y seguridad',
    description:
      'Si ves contenido inadecuado, información de salud riesgosa, spam o acoso, usa el botón de denunciar. El equipo de coordinación revisa cada denuncia y actúa en consecuencia para mantener un espacio seguro.',
    coordinatorNote:
      'Como coordinador/a, tienes acceso al panel de coordinación desde tu menú: gestionas denuncias y cuentas pendientes o suspendidas.',
  },
  {
    icon: Sparkles,
    title: '¡Participa!',
    description:
      'Valora las recetas que pruebes, comenta tus trucos y salva tus favoritas. Cuanta más comunidad participe, más fácil será vivir mejor con EII. ¡Empieza hoy mismo!',
  },
]

/** Guía interactiva (módulo 7): pase de diapositivas con notas según el rol. */
export function GuideModal() {
  const { guideOpen, setGuideOpen, navigate, user } = useSimbiosis()
  const [step, setStep] = useState(0)

  // El paso se reinicia al cerrar (evento, no efecto) para que siempre
  // se abra desde el principio.
  function handleOpenChange(open: boolean) {
    setGuideOpen(open)
    if (!open) setStep(0)
  }

  const slide = SLIDES[step]
  const isLast = step === SLIDES.length - 1
  const Icon = slide.icon

  return (
    <Dialog open={guideOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle aria-hidden="true" className="size-5 text-primary" />
            Guía interactiva de Simbiosis
          </DialogTitle>
          <DialogDescription>
            Descubre en {SLIDES.length} pasos cómo sacarle partido a la comunidad.
          </DialogDescription>
        </DialogHeader>

        <div className="relative min-h-56" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon aria-hidden="true" className="size-6" />
                </span>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Paso {step + 1} de {SLIDES.length}
                  </p>
                  <h3 className="font-semibold leading-tight">{slide.title}</h3>
                </div>
              </div>

              <p className="text-sm leading-relaxed text-muted-foreground">
                {slide.description}
              </p>

              {slide.proNote && user?.role === 'NUTRITIONIST' && (
                <p className="rounded-lg bg-secondary px-3 py-2 text-xs text-secondary-foreground">
                  <strong className="font-semibold">Para ti:</strong> {slide.proNote}
                </p>
              )}
              {slide.coordinatorNote && user?.role === 'COORDINATOR' && (
                <p className="rounded-lg bg-secondary px-3 py-2 text-xs text-secondary-foreground">
                  <strong className="font-semibold">Para ti:</strong> {slide.coordinatorNote}
                </p>
              )}

              {slide.cta && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setGuideOpen(false)
                    navigate(slide.cta!.view)
                  }}
                >
                  {slide.cta.label}
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Button>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5" role="tablist" aria-label="Progreso de la guía">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === step}
                aria-label={`Ir al paso ${i + 1}`}
                onClick={() => setStep(i)}
                className={cn(
                  'size-2 rounded-full transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  i === step ? 'w-5 bg-primary' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                )}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setStep((s) => s - 1)}>
                <ArrowLeft aria-hidden="true" className="size-4" />
                Anterior
              </Button>
            )}
            {isLast ? (
              <Button size="sm" onClick={() => setGuideOpen(false)}>
                <Check aria-hidden="true" className="size-4" />
                ¡Vamos allá!
              </Button>
            ) : (
              <Button size="sm" onClick={() => setStep((s) => s + 1)}>
                Siguiente
                <ArrowRight aria-hidden="true" className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
