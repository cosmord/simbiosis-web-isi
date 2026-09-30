/**
 * One-off: añade las plantillas de la comunidad (profesionales) a la BD viva
 * y añade descripción a la plantilla personal de Lucía. Sin tocar lo demás.
 * Ejecutar desde el cwd del proyecto: bun prisma/seed-community-templates.ts
 */
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  const nutri = await db.user.findUniqueOrThrow({ where: { email: 'nutricionista@simbiosis.org' } })
  const medico = await db.user.findUniqueOrThrow({ where: { email: 'medico@simbiosis.org' } })
  const lucia = await db.user.findUniqueOrThrow({ where: { email: 'paciente@simbiosis.org' } })

  const byTitle = async (title: string) => {
    const r = await db.recipe.findFirst({ where: { title }, select: { id: true } })
    if (!r) throw new Error(`Receta no encontrada: ${title}`)
    return r.id
  }

  const ids = {
    crema: await byTitle('Crema de calabaza y jengibre'),
    arroz: await byTitle('Arroz blanco con pollo y zanahoria'),
    tortilla: await byTitle('Tortilla francesa con espinacas tiernas'),
    salmon: await byTitle('Salmón al horno con calabacín'),
    smoothie: await byTitle('Smoothie de plátano maduro y avena'),
    patatas: await byTitle('Patatas y zanahoria al vapor con hierbas'),
    sopa: await byTitle('Sopa de fideos casera'),
    bizcocho: await byTitle('Bizcocho de manzana sin lactosa'),
  }

  // Descripción para la plantilla personal de Lucía (si existe y no tiene descripción)
  await db.planTemplate.updateMany({
    where: { userId: lucia.id, name: 'Mi semana tipo en remisión', description: null },
    data: {
      description:
        'Mi semana cuando me siento bien: smoothie por la mañana, comidas al vapor y cenas de cuchara.',
    },
  })

  // No duplicar si ya existen
  const existing = await db.planTemplate.count({ where: { isPublic: true } })
  if (existing > 0) {
    console.log(`Ya hay ${existing} plantillas públicas; no se duplica nada.`)
    return
  }

  const nutriWeek = [
    [0, 'BREAKFAST', ids.smoothie], [0, 'LUNCH', ids.arroz], [0, 'DINNER', ids.crema],
    [1, 'BREAKFAST', ids.smoothie], [1, 'LUNCH', ids.patatas], [1, 'DINNER', ids.tortilla],
    [2, 'BREAKFAST', ids.smoothie], [2, 'LUNCH', ids.salmon], [2, 'DINNER', ids.sopa],
    [3, 'BREAKFAST', ids.smoothie], [3, 'LUNCH', ids.arroz], [3, 'SNACK', ids.bizcocho], [3, 'DINNER', ids.crema],
    [4, 'BREAKFAST', ids.smoothie], [4, 'LUNCH', ids.patatas], [4, 'DINNER', ids.sopa],
    [5, 'BREAKFAST', ids.smoothie], [5, 'LUNCH', ids.salmon], [5, 'DINNER', ids.tortilla],
    [6, 'BREAKFAST', ids.smoothie], [6, 'LUNCH', ids.arroz], [6, 'SNACK', ids.bizcocho], [6, 'DINNER', ids.crema],
  ] as const

  const medicoWeek = [
    [0, 'BREAKFAST', ids.smoothie], [0, 'LUNCH', ids.patatas], [0, 'DINNER', ids.sopa],
    [1, 'BREAKFAST', ids.smoothie], [1, 'LUNCH', ids.crema], [1, 'DINNER', ids.sopa],
    [2, 'BREAKFAST', ids.smoothie], [2, 'LUNCH', ids.patatas], [2, 'DINNER', ids.crema],
    [3, 'BREAKFAST', ids.smoothie], [3, 'LUNCH', ids.crema], [3, 'DINNER', ids.sopa],
    [4, 'BREAKFAST', ids.smoothie], [4, 'LUNCH', ids.patatas], [4, 'DINNER', ids.crema],
    [5, 'BREAKFAST', ids.smoothie], [5, 'LUNCH', ids.crema], [5, 'DINNER', ids.sopa],
    [6, 'BREAKFAST', ids.smoothie], [6, 'LUNCH', ids.patatas], [6, 'DINNER', ids.sopa],
  ] as const

  const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000)

  await db.planTemplate.create({
    data: {
      name: 'Semana suave en remisión · Equipo de nutrición',
      description:
        'Menú semanal para mantener la remisión: cocciones sencillas, poca grasa, cenas ligeras y un dulce apto los fines de semana. Elaborado por el equipo de nutrición de Simbiosis.',
      isPublic: true,
      days: JSON.stringify(nutriWeek.map(([day, slot, recipeId]) => ({ day, slot, recipeId }))),
      userId: nutri.id,
      createdAt: daysAgo(3),
    },
  })

  await db.planTemplate.create({
    data: {
      name: 'Plan transitorio para brote · Dr. Sanz',
      description:
        'Plan orientativo para días de brote: caldos, purés y texturas suaves en raciones pequeñas. Es un apoyo temporal; sigue siempre las pautas de tu equipo médico.',
      isPublic: true,
      days: JSON.stringify(medicoWeek.map(([day, slot, recipeId]) => ({ day, slot, recipeId }))),
      userId: medico.id,
      createdAt: daysAgo(2),
    },
  })

  console.log('✅ Plantillas de la comunidad creadas (2 públicas) + descripción de Lucía.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
