import { ok, requireUser } from '@/lib/api-helpers'
import { computeHealthInsight } from '@/lib/health-insights'

/**
 * GET /api/health/insights — analiza el diario de salud del usuario y genera un
 * consejo personalizado (nivel, mensaje, pautas y filtros de recetas sugeridos).
 * La heurística vive en src/lib/health-insights.ts y también alimenta las
 * sugerencias del planificador.
 */
export async function GET() {
  const auth = await requireUser()
  if (auth.error) return auth.error

  const { hasData, insight } = await computeHealthInsight(auth.user.id)

  if (!hasData || !insight) {
    return ok({ insight: null, reason: 'NO_DATA' })
  }

  return ok({ insight, reason: 'OK' })
}
