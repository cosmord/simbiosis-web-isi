'use client'

import Link from 'next/link'
import { ChefHat, TriangleAlert } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { useSimbiosis, type View } from '@/lib/store'

const FOOTER_LINKS: { view: View; label: string }[] = [
  { view: 'home', label: 'Inicio' },
  { view: 'recipes', label: 'Recetas' },
  { view: 'forum', label: 'Foro' },
  { view: 'publications', label: 'Consejos de salud' },
]

/** Pie de página fijo abajo (mt-auto) con aviso médico y enlaces rápidos. */
export function Footer() {
  const { navigate } = useSimbiosis()

  return (
    <footer className="mt-auto border-t border-border/70 bg-secondary/40 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <ChefHat className="size-4.5" aria-hidden="true" />
              </span>
              <span className="text-base font-bold tracking-tight">Simbiosis</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Recetas adaptadas, foro y consejos de profesionales para vivir mejor con
              Enfermedad Inflamatoria Intestinal.
            </p>
          </div>

          <nav aria-label="Enlaces del pie de página" className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Navegación
            </h2>
            <ul className="grid grid-cols-2 gap-x-8 gap-y-1.5">
              {FOOTER_LINKS.map((link) => (
                <li key={link.view}>
                  <Link
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      navigate(link.view)
                    }}
                    className="rounded text-sm text-muted-foreground outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-6 flex items-start gap-2 rounded-lg border border-amber-200 bg-accent/60 px-3 py-2.5 dark:border-amber-900">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-xs leading-relaxed text-foreground/80">
            <strong className="font-semibold">Aviso médico:</strong> la información de
            Simbiosis no sustituye el consejo de tu equipo médico. Consulta siempre con
            profesionales sanitarios antes de cambiar tu dieta o tratamiento.
          </p>
        </div>

        <Separator className="my-5" />

        <div className="flex flex-col items-center justify-between gap-2 text-xs text-muted-foreground sm:flex-row">
          <p>Proyecto Simbiosis · Ingeniería del Software I</p>
          <p>© {new Date().getFullYear()} Simbiosis · Hecho con cariño por la comunidad EII</p>
        </div>
      </div>
    </footer>
  )
}
