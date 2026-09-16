import { db } from '@/lib/db'
import { ok, requireUser } from '@/lib/api-helpers'

/**
 * GET /api/health/insights — analiza el diario de salud del usuario y genera un
 * consejo personalizado (nivel, mensaje, pautas y filtros de recetas sugeridos).
 *
 * Reglas (heurística orientativa, nunca un diagnóstico):
 * - alert: 2 o más días con síntomas ≥7 en la última semana, media ≥6,5 o empeoramiento ≥2 puntos.
 * - watch: 1 día intenso, media ≥4 o empeoramiento ≥1 punto.
 * - positive: media baja y estable o en mejora.
 */
export async function GET() {
  const auth = await requireUser()
  if (auth.error) return auth.error

  const entries = await db.healthEntry.findMany({
    where: { userId: auth.user.id },
    orderBy: { date: 'asc' },
    take: 60,
  })

  if (entries.length === 0) {
    return ok({ insight: null, reason: 'NO_DATA' })
  }

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const msDay = 24 * 60 * 60 * 1000

  /** Medianoche local del día de una fecha (normaliza UTC vs local para comparar por días). */
  const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

  const recent = entries.filter((e) => {
    const t = dayStart(e.date)
    return t >= startOfToday.getTime() - 6 * msDay && t <= startOfToday.getTime()
  })
  const previous = entries.filter((e) => {
    const t = dayStart(e.date)
    return t >= startOfToday.getTime() - 13 * msDay && t < startOfToday.getTime() - 6 * msDay
  })

  const avg = (list: typeof entries) =>
    list.length === 0 ? null : list.reduce((s, e) => s + e.symptoms, 0) / list.length

  const avgRecent = avg(recent)
  const avgPrevious = avg(previous)
  const highDays = recent.filter((e) => e.symptoms >= 7).length
  const latest = entries[entries.length - 1]

  // Tendencia de peso: primer y último registro con peso (últimos 8 registros con peso)
  const withWeight = entries.filter((e) => e.weight != null).slice(-8)
  const weightDiff =
    withWeight.length >= 2
      ? (withWeight[withWeight.length - 1].weight as number) - (withWeight[0].weight as number)
      : null

  // Empeoramiento comparando las medias de las dos últimas semanas
  const worsening =
    avgRecent !== null && avgPrevious !== null ? avgRecent - avgPrevious : null

  let level: 'positive' | 'watch' | 'alert' = 'positive'
  if (
    highDays >= 2 ||
    (avgRecent !== null && avgRecent >= 6.5) ||
    (worsening !== null && worsening >= 2)
  ) {
    level = 'alert'
  } else if (
    highDays === 1 ||
    (avgRecent !== null && avgRecent >= 4) ||
    (worsening !== null && worsening >= 1)
  ) {
    level = 'watch'
  }

  const tips: string[] = []
  let title = ''
  let message = ''

  if (level === 'alert') {
    title = 'Tus síntomas han ido en aumento'
    message =
      'Varios registros recientes muestran una intensidad alta. Es buen momento para suavizar tu dieta y comentarlo con tu equipo médico si continúa.'
    tips.push(
      'Prioriza texturas suaves: purés, cremas y sopas de cocción larga.',
      'Evita temporalmente la fibra insoluble (crudos, cáscara, semillas) y las frituras.',
      'Haz comidas pequeñas y frecuentes, masticando bien y sin bebidas con gas.'
    )
  } else if (level === 'watch') {
    title = 'Vigila cómo evolucionas estos días'
    message =
      'Hay señales moderadas en tu diario: algún día intenso o una ligera tendencia al alza. Con una dieta más conservadora puedes ayudar a tu intestino.'
    tips.push(
      'Cocina al vapor o hervido y reduce los platos muy condimentados esta semana.',
      'Comprueba tu tolerancia a la lactosa y al gluten con días de exclusión controlada.',
      'Anota en la nota del diario qué comiste los días de más síntomas: te ayudará a detectar patrones.'
    )
  } else {
    title = '¡Buen momento para aprovechar la remisión!'
    message =
      'Tus registros recientes son estables o favorables. Es el momento ideal de introducir variedad con calma y seguir cuidando los hábitos.'
    tips.push(
      'Introduce un alimento nuevo cada 2-3 días y registra cómo te sienta.',
      'Mantén la hidratación y la cena ligera: son los hábitos que más protegen tu bienestar.',
      'Guarda tu plan semanal como plantilla cuando te sientas bien: tendrás un menú seguro para repetir.'
    )
  }

  // Etiquetas y fase sugeridas, coherentes con el nivel detectado
  const suggestedTags =
    level === 'alert'
      ? ['Baja en residuos', 'Fácil digestión', 'Hidratante']
      : level === 'watch'
        ? ['Fácil digestión', 'Baja en residuos', 'Fibra soluble']
        : ['Antiinflamatoria', 'Fibra soluble', 'Rica en proteínas']
  const suggestedSuitable =
    level === 'alert'
      ? ['Brote activo', 'Brote leve']
      : level === 'watch'
        ? ['Brote leve']
        : ['Remisión']

  const insight = {
    level,
    title,
    message,
    tips,
    suggestedTags,
    suggestedSuitable,
    stats: {
      entriesAnalyzed: entries.length,
      recentCount: recent.length,
      avgRecent: avgRecent !== null ? Math.round(avgRecent * 10) / 10 : null,
      avgPrevious: avgPrevious !== null ? Math.round(avgPrevious * 10) / 10 : null,
      highDays,
      latestSymptoms: latest.symptoms,
      weightDiff: weightDiff !== null ? Math.round(weightDiff * 10) / 10 : null,
    },
  }

  return ok({ insight, reason: 'OK' })
}
