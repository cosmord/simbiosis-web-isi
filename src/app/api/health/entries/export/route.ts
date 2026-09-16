import { db } from '@/lib/db'
import { fail, requireUser } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

// GET /api/health/entries/export — exporta el diario de salud a CSV (Excel-es compatible:
// separador ";" y BOM UTF-8 para acentos).
export async function GET() {
  const { user, error } = await requireUser()
  if (error) return error

  const entries = await db.healthEntry.findMany({
    where: { userId: user.id },
    orderBy: { date: 'asc' },
  })

  const esc = (value: string): string => {
    const clean = value.replace(/"/g, '""').replace(/\r?\n/g, ' ')
    return `"${clean}"`
  }

  const rows: string[] = ['Fecha;Peso (kg);Intensidad sintomas (0-10);Nota']
  for (const entry of entries) {
    const date = entry.date.toISOString().slice(0, 10)
    const weight = entry.weight === null ? '' : String(entry.weight).replace('.', ',')
    const note = entry.note ? esc(entry.note) : ''
    rows.push(`${date};${weight};${entry.symptoms};${note}`)
  }

  // BOM UTF-8 para que Excel respete los acentos
  const csv = '\uFEFF' + rows.join('\r\n')

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="diario-salud-simbiosis-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
