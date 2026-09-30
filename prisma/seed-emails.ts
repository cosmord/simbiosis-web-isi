/* One-off: inserta correos simulados de demostración en la BD viva (sin re-seedar). */
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  const existing = await db.emailLog.count()
  if (existing > 0) {
    console.log(`Ya hay ${existing} correos; no se insertan duplicados.`)
    return
  }

  const paciente = await db.user.findUniqueOrThrow({ where: { email: 'paciente@simbiosis.org' } })
  const nutri = await db.user.findUniqueOrThrow({ where: { email: 'nutricionista@simbiosis.org' } })

  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 3600 * 1000)

  await db.emailLog.createMany({
    data: [
      {
        toUserId: paciente.id,
        toEmail: paciente.email,
        subject: 'Hemos recibido tu solicitud de registro',
        body: `Hola ${paciente.name}:\n\nGracias por unirte a Simbiosis. Tu solicitud de registro como paciente está pendiente de revisión por parte del coordinador.\n\nRecibirás otro correo en cuanto tu cuenta sea revisada.\n\nUn saludo,\nEl equipo de Simbiosis`,
        kind: 'ACCOUNT_RECEIVED',
        createdAt: daysAgo(7),
      },
      {
        toUserId: paciente.id,
        toEmail: paciente.email,
        subject: 'Tu cuenta de Simbiosis ha sido aprobada',
        body: `Hola ${paciente.name}:\n\n¡Buenas noticias! El coordinador de Simbiosis ha aprobado tu cuenta. Ya puedes iniciar sesión en la plataforma, completar tu perfil y participar en la comunidad: compartir recetas, escribir en el foro y seguir tus datos de salud.\n\n¡Te esperamos!\nEl equipo de Simbiosis`,
        kind: 'ACCOUNT_APPROVED',
        createdAt: daysAgo(6),
      },
      {
        toUserId: nutri.id,
        toEmail: nutri.email,
        subject: 'Tu cuenta de Simbiosis ha sido aprobada',
        body: `Hola ${nutri.name}:\n\n¡Buenas noticias! El coordinador de Simbiosis ha aprobado tu cuenta profesional. Ya puedes publicar recetas validadas y consejos de salud para la comunidad.\n\nEl equipo de Simbiosis`,
        kind: 'ACCOUNT_APPROVED',
        createdAt: daysAgo(9),
      },
    ],
  })

  console.log('✅ Correos simulados de demostración insertados.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
