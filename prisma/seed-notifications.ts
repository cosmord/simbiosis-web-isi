/* One-off: inserta notificaciones de demostración en la BD viva (sin re-seedar). */
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  const existing = await db.notification.count()
  if (existing > 0) {
    console.log(`Ya hay ${existing} notificaciones; no se insertan duplicados.`)
    return
  }

  const paciente = await db.user.findUniqueOrThrow({ where: { email: 'paciente@simbiosis.org' } })
  const nutri = await db.user.findUniqueOrThrow({ where: { email: 'nutricionista@simbiosis.org' } })
  const ana = await db.user.findUniqueOrThrow({ where: { email: 'ana@simbiosis.org' } })
  const cuidador = await db.user.findUniqueOrThrow({ where: { email: 'cuidador@simbiosis.org' } })

  const thread = await db.thread.findFirst({ orderBy: { createdAt: 'desc' } })
  const nutriRecipe = await db.recipe.findFirst({
    where: { authorId: nutri.id, status: 'PUBLISHED' },
    orderBy: { createdAt: 'desc' },
  })

  const hoursAgo = (h: number) => new Date(Date.now() - h * 3600 * 1000)

  await db.notification.createMany({
    data: [
      thread
        ? {
            userId: thread.userId,
            type: 'REPLY',
            title: 'Nueva respuesta en tu hilo',
            body: `Elena Ferrer ha respondido a "${thread.title}".`,
            linkView: 'threadDetail',
            linkId: thread.id,
            read: false,
            createdAt: hoursAgo(3),
          }
        : {
            userId: paciente.id,
            type: 'REPLY',
            title: 'Nueva respuesta en tu hilo',
            body: 'Elena Ferrer ha respondido a tu hilo del foro.',
            read: false,
            createdAt: hoursAgo(3),
          },
      nutriRecipe
        ? {
            userId: nutriRecipe.authorId,
            type: 'RATING',
            title: 'Nueva valoración de tu receta',
            body: `Ana Martín ha valorado "${nutriRecipe.title}" con 5 estrellas.`,
            linkView: 'recipeDetail',
            linkId: nutriRecipe.id,
            read: false,
            createdAt: hoursAgo(8),
          }
        : {
            userId: nutri.id,
            type: 'RATING',
            title: 'Nueva valoración de tu receta',
            body: 'Ana Martín ha valorado tu receta con 5 estrellas.',
            read: false,
            createdAt: hoursAgo(8),
          },
      nutriRecipe
        ? {
            userId: nutriRecipe.authorId,
            type: 'FAVORITE',
            title: 'Han guardado tu receta',
            body: `Pablo Ortega ha añadido "${nutriRecipe.title}" a sus favoritos.`,
            linkView: 'recipeDetail',
            linkId: nutriRecipe.id,
            read: true,
            createdAt: hoursAgo(26),
          }
        : {
            userId: nutri.id,
            type: 'FAVORITE',
            title: 'Han guardado tu receta',
            body: 'Pablo Ortega ha añadido tu receta a sus favoritos.',
            read: true,
            createdAt: hoursAgo(26),
          },
      {
        userId: paciente.id,
        type: 'ACCOUNT',
        title: 'Cuenta aprobada',
        body: '¡Bienvenido/a a Simbiosis! Tu cuenta ha sido aprobada por el coordinador y ya puedes iniciar sesión.',
        read: true,
        createdAt: hoursAgo(24 * 6),
      },
      {
        userId: paciente.id,
        type: 'LIKE',
        title: 'Nuevo «me gusta» en tu consejo',
        body: 'A Elena Ferrer le ha gustado tu publicación.',
        linkView: 'publications',
        read: false,
        createdAt: hoursAgo(30),
      },
    ],
  })

  console.log('✅ Notificaciones de demostración insertadas.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
