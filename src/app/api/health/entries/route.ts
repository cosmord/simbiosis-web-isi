import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser } from '@/lib/api-helpers'

function serializeEntry(entry: {
  id: string
  date: Date
  weight: number | null
  symptoms: number
  note: string | null
}) {
  return {
    id: entry.id,
    date: entry.date.toISOString(),
    weight: entry.weight,
    symptoms: entry.symptoms,
    note: entry.note,
  }
}

// GET /api/health/entries — registros de salud del usuario autenticado, ordenados por fecha asc
export async function GET() {
  const { user, error } = await requireUser()
  if (error) return error

  const entries = await db.healthEntry.findMany({
    where: { userId: user.id },
    orderBy: { date: 'asc' },
  })

  return ok({ entries: entries.map(serializeEntry) })
}

// POST /api/health/entries — crear registro de salud (requiere autenticación)
export async function POST(req: NextRequest) {
  const { user, error } = await requireUser()
  if (error) return error

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return fail('Cuerpo de la petición no válido.', 400)
  }

  if (body.date === undefined || body.date === null || body.date === '')
    return fail('La fecha es obligatoria.', 400)
  const date = new Date(String(body.date))
  if (Number.isNaN(date.getTime())) return fail('La fecha no es válida.', 400)

  let weight: number | null = null
  if (body.weight !== undefined && body.weight !== null && body.weight !== '') {
    const w = Number(body.weight)
    if (!Number.isFinite(w) || w <= 0)
      return fail('El peso debe ser un número mayor que 0.', 400)
    weight = w
  }

  const symptoms = Number(body.symptoms)
  if (!Number.isInteger(symptoms) || symptoms < 0 || symptoms > 10)
    return fail('La intensidad de los síntomas debe ser un número entero entre 0 y 10.', 400)

  const note =
    typeof body.note === 'string' && body.note.trim() ? body.note.trim() : null

  const entry = await db.healthEntry.create({
    data: { date, weight, symptoms, note, userId: user.id },
  })

  return ok({ entry: serializeEntry(entry) }, 201)
}
