/**
 * Seed de datos demo — Proyecto Simbiosis
 * Ejecutar: bun prisma/seed.ts
 */
import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/password'

const db = new PrismaClient()

const DEMO_PASSWORD = 'simbiosis123'

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000)
}

async function main() {
  console.log('🌱 Limpiando base de datos...')
  await db.emailLog.deleteMany()
  await db.notification.deleteMany()
  await db.report.deleteMany()
  await db.favorite.deleteMany()
  await db.healthEntry.deleteMany()
  await db.publicationLike.deleteMany()
  await db.healthPublication.deleteMany()
  await db.reply.deleteMany()
  await db.thread.deleteMany()
  await db.comment.deleteMany()
  await db.rating.deleteMany()
  await db.recipe.deleteMany()
  await db.session.deleteMany()
  await db.user.deleteMany()

  console.log('👥 Creando usuarios...')
  const pass = hashPassword(DEMO_PASSWORD)

  const coordinator = await db.user.create({
    data: {
      email: 'coordinador@simbiosis.org',
      passwordHash: pass,
      name: 'Marta Ruiz',
      role: 'COORDINATOR',
      status: 'ACTIVE',
      bio: 'Coordinadora de la plataforma Simbiosis. Velamos por un entorno seguro y de apoyo para la comunidad EII.',
      createdAt: daysAgo(120),
    },
  })

  const nutri = await db.user.create({
    data: {
      email: 'nutricionista@simbiosis.org',
      passwordHash: pass,
      name: 'Elena Ferrer',
      role: 'NUTRITIONIST',
      status: 'ACTIVE',
      bio: 'Dietista-nutricionista colegiada, especializada en nutrición clínica y EII.',
      createdAt: daysAgo(110),
    },
  })

  const medico = await db.user.create({
    data: {
      email: 'medico@simbiosis.org',
      passwordHash: pass,
      name: 'Dr. Javier Sanz',
      role: 'DOCTOR',
      status: 'ACTIVE',
      bio: 'Médico especialista en aparato digestivo, unidad de EII.',
      createdAt: daysAgo(108),
    },
  })

  const nutriPend = await db.user.create({
    data: {
      email: 'nutricionista.nueva@simbiosis.org',
      passwordHash: pass,
      name: 'Carla Mendoza',
      role: 'NUTRITIONIST',
      status: 'PENDING',
      bio: 'Nutricionista con 8 años de experiencia en enfermedad inflamatoria intestinal.',
      createdAt: daysAgo(2),
    },
  })

  const paciente = await db.user.create({
    data: {
      email: 'paciente@simbiosis.org',
      passwordHash: pass,
      name: 'Lucía Ortega',
      role: 'PATIENT',
      status: 'ACTIVE',
      bio: 'Vivo con Crohn desde 2019. Me encanta cocinar y probar recetas suaves.',
      createdAt: daysAgo(90),
    },
  })

  const cuidador = await db.user.create({
    data: {
      email: 'cuidador@simbiosis.org',
      passwordHash: pass,
      name: 'Pablo Ortega',
      role: 'CAREGIVER',
      status: 'ACTIVE',
      bio: 'Hermano de una paciente con colitis ulcerosa. Busco recetas que le sienten bien.',
      createdAt: daysAgo(85),
    },
  })

  const paciente2 = await db.user.create({
    data: {
      email: 'ana@simbiosis.org',
      passwordHash: pass,
      name: 'Ana Beltrán',
      role: 'PATIENT',
      status: 'ACTIVE',
      bio: 'Colitis ulcerosa en remisión. Comparto mi experiencia con la dieta baja en residuos.',
      createdAt: daysAgo(70),
    },
  })

  const paciente3 = await db.user.create({
    data: {
      email: 'sergio@simbiosis.org',
      passwordHash: pass,
      name: 'Sergio Ramos-López',
      role: 'PATIENT',
      status: 'ACTIVE',
      bio: 'Crohn diagnosticado hace 3 años. Aprendiendo a comer mejor cada día.',
      createdAt: daysAgo(60),
    },
  })

  const cuidador2 = await db.user.create({
    data: {
      email: 'maria@simbiosis.org',
      passwordHash: pass,
      name: 'María Camacho',
      role: 'CAREGIVER',
      status: 'ACTIVE',
      bio: 'Cuidadora de mi madre, que tiene EII. La cocina adaptada nos ha cambiado el día a día.',
      createdAt: daysAgo(40),
    },
  })

  console.log('🍳 Creando recetas...')
  const r1 = await db.recipe.create({
    data: {
      title: 'Crema de calabaza y jengibre',
      description:
        'Una crema suave y reconfortante, muy fácil de digerir. La calabaza aporta textura cremosa sin apenas fibra insoluble y el jengibre ayuda con las náuseas. Ideal en fases de brote leve o recuperación.',
      ingredients: JSON.stringify([
        '500 g de calabaza pelada en trozos',
        '1 patata pequeña',
        '1 cucharadita de jengibre fresco rallado',
        '500 ml de caldo de verduras colado',
        '1 cucharada de aceite de oliva',
        'Pizca de sal',
      ]),
      steps: JSON.stringify([
        'Cuece la calabaza y la patata en el caldo durante 20 minutos.',
        'Añade el jengibre y tritura hasta obtener una crema muy fina.',
        'Incorpora el aceite de oliva y emulsiona.',
        'Sirve tibia, nunca muy caliente.',
      ]),
      image: '/images/recipes/crema-calabaza.png',
      category: 'Cena',
      tags: JSON.stringify(['Baja en residuos', 'Fácil digestión', 'Sin lactosa']),
      suitableFor: JSON.stringify(['Brote leve', 'Remisión', 'Crohn']),
      prepTime: 30,
      servings: 3,
      authorId: nutri.id,
      createdAt: daysAgo(20),
    },
  })

  const r2 = await db.recipe.create({
    data: {
      title: 'Arroz blanco con pollo y zanahoria',
      description:
        'El clásico «plato seguro» para días delicados. Arroz bien cocido, pollo tierno desmenuzado y zanahoria cocida: proteína y energía sin irritar el intestino.',
      ingredients: JSON.stringify([
        '150 g de arroz blanco',
        '150 g de pechuga de pollo',
        '1 zanahoria pelada y rallada fina',
        '500 ml de agua o caldo suave',
        '1 cucharada de aceite de oliva',
        'Sal',
      ]),
      steps: JSON.stringify([
        'Sofríe el pollo cortado en trozos pequeños con el aceite.',
        'Añade la zanahoria y rehoga 3 minutos.',
        'Incorpora el arroz y el caldo, y cuece 18 minutos a fuego suave.',
        'Desmenuza el pollo, mezcla y deja reposar 5 minutos.',
      ]),
      image: '/images/recipes/arroz-pollo.png',
      category: 'Comida',
      tags: JSON.stringify(['Baja en residuos', 'Fácil digestión', 'Rica en proteínas']),
      suitableFor: JSON.stringify(['Brote activo', 'Brote leve', 'Colitis ulcerosa']),
      prepTime: 35,
      servings: 2,
      authorId: paciente.id,
      createdAt: daysAgo(18),
    },
  })

  const r3 = await db.recipe.create({
    data: {
      title: 'Tortilla francesa con espinacas tiernas',
      description:
        'Tortilla muy jugosa con espinacas baby bien sofritas. Los huevos son una fuente excelente de proteína de alta calidad y las espinacas tiernas, bien cocinadas, se toleran mejor.',
      ingredients: JSON.stringify([
        '2 huevos',
        'Un puñado de espinacas baby',
        '1 cucharadita de aceite de oliva',
        'Sal',
      ]),
      steps: JSON.stringify([
        'Sofríe las espinacas hasta que estén muy tiernas.',
        'Bate los huevos con una pizca de sal.',
        'Cuaja la tortilla a fuego bajo con el aceite.',
        'Rellena con las espinacas y dobla.',
      ]),
      image: '/images/recipes/tortilla-espinacas.png',
      category: 'Cena',
      tags: JSON.stringify(['Fácil digestión', 'Rica en proteínas', 'Sin lactosa']),
      suitableFor: JSON.stringify(['Remisión', 'Crohn', 'Colitis ulcerosa']),
      prepTime: 15,
      servings: 1,
      authorId: paciente2.id,
      createdAt: daysAgo(15),
    },
  })

  const r4 = await db.recipe.create({
    data: {
      title: 'Salmón al horno con calabacín',
      description:
        'Pescado azul rico en omega-3 con propiedades antiinflamatorias, cocinado al horno para una digestión ligera. El calabacín sin piel, al vapor del propio horno, queda melting.',
      ingredients: JSON.stringify([
        '1 lomo de salmón (150 g)',
        '1/2 calabacín sin piel en rodajas',
        'Rodaja de limón',
        '1 cucharada de aceite de oliva',
        'Pizca de sal y eneldo',
      ]),
      steps: JSON.stringify([
        'Precalienta el horno a 180 °C.',
        'Coloca el salmón y el calabacín en una bandeja con papel de horno.',
        'Aliña con aceite, sal, eneldo y el limón encima.',
        'Hornea 15-18 minutos y sirve.',
      ]),
      image: '/images/recipes/salmon-calabacin.png',
      category: 'Comida',
      tags: JSON.stringify(['Antiinflamatoria', 'Fácil digestión', 'Sin lactosa', 'Rica en proteínas']),
      suitableFor: JSON.stringify(['Remisión', 'Crohn', 'Colitis ulcerosa']),
      prepTime: 25,
      servings: 1,
      authorId: medico.id,
      createdAt: daysAgo(12),
    },
  })

  const r5 = await db.recipe.create({
    data: {
      title: 'Smoothie de plátano maduro y avena',
      description:
        'Desayuno suave y energético. El plátano muy maduro aporta potasio y la avena fina, bien hidratada, fibra soluble que se tolera bien en remisión.',
      ingredients: JSON.stringify([
        '1 plátano muy maduro',
        '3 cucharadas de copos de avena finos',
        '200 ml de bebida de avena o agua',
        'Pizca de canela',
      ]),
      steps: JSON.stringify([
        'Deja la avena en remojo 10 minutos para ablandarla.',
        'Tritura todo hasta que quede muy fino.',
        'Añade canela y sirve fresco.',
      ]),
      image: '/images/recipes/smoothie-platano.png',
      category: 'Desayuno',
      tags: JSON.stringify(['Fácil digestión', 'Sin lactosa', 'Fibra soluble']),
      suitableFor: JSON.stringify(['Remisión', 'Crohn']),
      prepTime: 10,
      servings: 1,
      authorId: paciente.id,
      createdAt: daysAgo(9),
    },
  })

  const r6 = await db.recipe.create({
    data: {
      title: 'Patatas y zanahoria al vapor con hierbas',
      description:
        'Guarnición básica que nunca falla. El vapor conserva nutrientes y hace la verdura muy tolerable. Un chorrito de aceite en crudo al final, nunca frita.',
      ingredients: JSON.stringify([
        '2 patatas medianas',
        '2 zanahorias',
        '1 cucharada de aceite de oliva',
        'Perejil fresco',
        'Sal',
      ]),
      steps: JSON.stringify([
        'Pela y corta las patatas y zanahorias en rodajas finas.',
        'Cocina al vapor 20 minutos hasta que estén muy tiernas.',
        'Aliña con aceite, sal y perejil.',
      ]),
      image: '/images/recipes/verduras-vapor.png',
      category: 'Comida',
      tags: JSON.stringify(['Baja en residuos', 'Fácil digestión', 'Sin lactosa', 'Sin gluten']),
      suitableFor: JSON.stringify(['Brote leve', 'Remisión']),
      prepTime: 25,
      servings: 2,
      authorId: cuidador.id,
      createdAt: daysAgo(7),
    },
  })

  const r7 = await db.recipe.create({
    data: {
      title: 'Sopa de fideos casera',
      description:
        'Caldo casero colado con fideos finos muy cocidos. Perfecta para hidratar y calmir el estómago en días de malestar general.',
      ingredients: JSON.stringify([
        '1 l de caldo de pollo casero colado',
        '80 g de fideos finos',
        '1 cucharadita de aceite de oliva',
        'Sal',
      ]),
      steps: JSON.stringify([
        'Lleva el caldo a ebullición.',
        'Añade los fideos y cuece 10 minutos.',
        'Sirve caliente con un hilillo de aceite.',
      ]),
      image: '',
      category: 'Cena',
      tags: JSON.stringify(['Baja en residuos', 'Fácil digestión', 'Hidratante']),
      suitableFor: JSON.stringify(['Brote activo', 'Brote leve']),
      prepTime: 15,
      servings: 2,
      authorId: paciente3.id,
      createdAt: daysAgo(4),
    },
  })

  const r8 = await db.recipe.create({
    data: {
      title: 'Bizcocho de manzana sin lactosa',
      description:
        'Un dulce apto para celebraciones. Manzana cocida (baja en fibra insoluble una vez horneada), sin lactosa y muy esponjoso. En remisión, un capricho sin culpa.',
      ingredients: JSON.stringify([
        '2 manzanas golden',
        '150 g de harina de trigo',
        '2 huevos',
        '80 ml de bebida de avena',
        '60 ml de aceite de oliva suave',
        '80 g de azúcar',
        '1 sobre de levadura',
      ]),
      steps: JSON.stringify([
        'Pela y trocea una manzana, y tritúrala con la bebida de avena.',
        'Mezcla huevos y azúcar, añade el aceite y el puré de manzana.',
        'Incorpora harina y levadura tamizadas.',
        'Hornea 35 minutos a 175 °C con la otra manzana en láminas encima.',
      ]),
      image: '',
      category: 'Postre',
      tags: JSON.stringify(['Sin lactosa', 'Fácil digestión']),
      suitableFor: JSON.stringify(['Remisión']),
      prepTime: 50,
      servings: 6,
      authorId: nutri.id,
      createdAt: daysAgo(2),
    },
  })

  console.log('⭐ Creando valoraciones y comentarios...')
  const ratings = [
    { recipe: r1, user: paciente, stars: 5, comment: 'La hice en plena recuperación y me sentó de maravilla. ¡Gracias Elena!' },
    { recipe: r1, user: paciente2, stars: 5, comment: 'Súper cremosa. La preparo cada semana.' },
    { recipe: r1, user: cuidador, stars: 4, comment: 'A mi hermana le encantó, quizá un poco más de caldo la haría más ligera.' },
    { recipe: r2, user: paciente3, stars: 5, comment: 'Mi plato de cabecera en brotes. Nunca falla.' },
    { recipe: r2, user: cuidador2, stars: 4, comment: 'Fácil y rápida para cuidadores. La zanahoria muy finita, ideal.' },
    { recipe: r3, user: paciente, stars: 4, comment: 'Buena cena ligera, la hago con espinacas muy tiernas.' },
    { recipe: r4, user: paciente2, stars: 5, comment: 'El salmón queda jugosísimo y el calabacín melting. Repetiré.' },
    { recipe: r4, user: paciente3, stars: 4, comment: 'Muy buena, aunque yo lo hago a la plancha por rapidez.' },
    { recipe: r5, user: cuidador, stars: 5, comment: 'Desayuno perfecto antes de trabajar. Muy saciante.' },
    { recipe: r6, user: paciente, stars: 4, comment: 'Guarnición que tolero genial, con perejil le da un toque fresco.' },
    { recipe: r7, user: cuidador2, stars: 5, comment: 'Con caldo casero sabe a gloria. Hidrata mucho.' },
    { recipe: r8, user: paciente3, stars: 5, comment: 'Probé el bizcocho en un cumpleaños y nadie notó que era adaptado.' },
  ]
  for (const rt of ratings) {
    await db.rating.create({
      data: {
        recipeId: rt.recipe.id,
        userId: rt.user.id,
        stars: rt.stars,
        comment: rt.comment,
        createdAt: daysAgo(Math.floor(Math.random() * 10) + 1),
      },
    })
  }

  const comments = [
    { recipe: r1, user: paciente3, content: '¿Se puede congelar? Me gustaría hacer varias raciones.' },
    { recipe: r1, user: nutri, content: '¡Sí! Congélala en raciones individuales y descongela suavemente en la nevera.' },
    { recipe: r1, user: cuidador, content: 'La preparo los domingos y así tengo raciones listas para toda la semana. Un básico en mi casa.' },
    { recipe: r1, user: paciente2, content: 'El jengibre le da un punto estupendo y a mí me ayuda bastante con las náuseas. Muy recomendable en días flojos.' },
    { recipe: r1, user: cuidador2, content: 'A mi hijo le encanta y es de los pocos purés que come sin queja. Gracias por compartirla.' },
    { recipe: r1, user: medico, content: 'Composición muy razonable para reintroducir verduras: baja en residuos y con caldo casero. Bien en post-brote.' },
    { recipe: r1, user: paciente, content: 'La hice anoche y me sentó de maravilla, hoy sin hinchazón. Repetiré seguro.' },
    { recipe: r2, user: cuidador2, content: 'La hice para mi madre y le sentó genial. Añadí un poco de perejil.' },
    { recipe: r4, user: paciente, content: 'Gracias por la receta, doctor. ¿Y si uso lubina en su lugar?' },
    { recipe: r5, user: paciente2, content: 'Con plátano muy maduro queda mucho más dulce, no hace falta azúcar.' },
    { recipe: r8, user: cuidador, content: 'Perfecta para merendar. La haré este fin de semana.' },
  ]
  for (const c of comments) {
    await db.comment.create({
      data: {
        recipeId: c.recipe.id,
        userId: c.user.id,
        content: c.content,
        createdAt: daysAgo(Math.max(1, Math.floor(Math.random() * 8)) ),
      },
    })
  }

  console.log('💬 Creando hilos del foro...')
  const t1 = await db.thread.create({
    data: {
      title: '¿Qué desayunos toleráis mejor en brote leve?',
      content:
        'Buenas a todos. Últimamente las mañanas me cuestan y me gustaría saber qué desayunos os sientan bien cuando tenéis síntomas leves. Yo de momento me quedo con el arroz con leche sin lactosa muy cocido.',
      category: 'DIETA_Y_SINTOMAS',
      views: 142,
      userId: paciente.id,
      createdAt: daysAgo(10),
    },
  })
  const t2 = await db.thread.create({
    data: {
      title: 'Mis trucos para cocinar para toda la familia sin cocinar dos veces',
      content:
        'Como cuidadora, a veces cocino «plato normal» y «plato adaptado» y agota. Comparto mis trucos: bases neutras (arroz, patata) y añadir el resto aparte. ¿Cómo lo hacéis vosotros?',
      category: 'RECETAS_Y_COCINA',
      views: 98,
      userId: cuidador2.id,
      createdAt: daysAgo(8),
    },
  })
  const t3 = await db.thread.create({
    data: {
      title: 'Ansiedad antes de las pruebas: ¿cómo lo gestionáis?',
      content:
        'La semana que viene tengo una colonoscopia y estoy muy nerviosa. Me ayudaría mucho leer cómo lo lleváis vosotros, trucos para el día previo y para relajarme.',
      category: 'APOYO_EMOCIONAL',
      views: 210,
      userId: paciente2.id,
      createdAt: daysAgo(6),
    },
  })
  const t4 = await db.thread.create({
    data: {
      title: '¿Coméis lácteos en remisión? Mi experiencia',
      content:
        'Mi digestivo me dijo que si los tolero bien no hace falta eliminarlos. A mí el yogur sin lactosa me va genial, pero el queso curado me sienta mejor que el fresco. Curioso.',
      category: 'DIETA_Y_SINTOMAS',
      views: 76,
      userId: paciente3.id,
      createdAt: daysAgo(3),
    },
  })

  const replies = [
    { thread: t1, user: nutri, content: 'Buena pregunta, Lucía. En brote leve, opciones como la crema de calabaza o un smoothie de plátano con avena finísima suelen tolerarse bien. Evita la fibra insoluble por la mañana.' },
    { thread: t1, user: paciente2, content: 'Yo tomo tostada de pan blanco sin corteza con un poco de aceite. Simple y me funciona.' },
    { thread: t1, user: paciente3, content: 'Batido de plátano muy maduro + avena, como el que compartió Lucía. ¡Recomendado!' },
    { thread: t2, user: paciente, content: '¡Qué útil! Yo hago lo mismo: arroz base y las proteínas aparte. Mi familia ni se entera.' },
    { thread: t2, user: cuidador, content: 'Totalmente de acuerdo. También congelo en raciones pequeñas las bases adaptadas.' },
    { thread: t3, user: cuidador2, content: 'Ánimo, Ana. A mi madre las pruebas también le generan ansiedad; la respiración diafragmática le ayuda mucho.' },
    { thread: t3, user: medico, content: 'Es muy normal sentirlo. Seguid SIEMPRE las pautas de preparación del equipo, y si la ansiedad es muy alta, coméntelo antes: hay pautas de apoyo puntuales.' },
    { thread: t4, user: nutri, content: 'En remisión y sin intolerancia, los lácteos no están contraindicados. Cada persona tolera distinto: lo importante es el diario de dieta para detectar patrones.' },
  ]
  for (const rp of replies) {
    await db.reply.create({
      data: {
        threadId: rp.thread.id,
        userId: rp.user.id,
        content: rp.content,
        createdAt: daysAgo(Math.floor(Math.random() * 5) + 1),
      },
    })
  }

  console.log('📖 Creando publicaciones de salud...')
  const p1 = await db.healthPublication.create({
    data: {
      title: 'Dieta baja en residuos: guía práctica y errores habituales',
      content:
        'La dieta baja en residuos reduce el volumen de heces dando descanso al intestino. Ideas clave:\n\n1. Prioriza proteínas magras, arroz blanco, patata y zanahoria cocida.\n2. Evita pieles, semillas, frutos secos y verduras de hoja verde en brote.\n3. Cocina, tritura y cuela: la textura importa tanto como el ingrediente.\n\nErrores frecuentes: abandonar la dieta por aburrimiento (¡hay que variar presentaciones!), o prolongarla más de lo indicado sin supervisión. Recuerda que debe ser siempre temporal y guiada por profesionales.',
      category: 'NUTRICION',
      userId: nutri.id,
      createdAt: daysAgo(14),
    },
  })
  const p2 = await db.healthPublication.create({
    data: {
      title: 'Hidratación en EII: por qué importa tanto durante los brotes',
      content:
        'Durante los brotes con diarrea se pierden agua y electrolitos a gran velocidad. Recomendaciones generales:\n\n· Bebe pequeños sorbos frecuentes en lugar de grandes cantidades de golpe.\n· Las bebidas de rehidratación oral pueden ser tus aliadas; consulta con tu equipo.\n· Vigila señales como mareo, boca seca u orina muy oscura.\n\nLa deshidratación es uno de los motivos más frecuentes de urgencia en EII: prevenir es sencillo si lo haces sistemático.',
      category: 'NUTRICION',
      userId: medico.id,
      createdAt: daysAgo(9),
    },
  })
  const p3 = await db.healthPublication.create({
    data: {
      title: 'Movimiento suave y EII: caminar también es medicina',
      content:
        'El ejercicio moderado se asocia con menos inflamación y mejor estado de ánimo en EII. No necesitas entrenar para una maratón:\n\n· Camina 20-30 minutos al día a ritmo cómodo.\n· Prueba yoga suave o estiramientos: reducen el estrés, un desencadenante conocido de síntomas.\n· Escucha tu cuerpo: en brote, el descanso manda.\n\nEl objetivo no es el rendimiento, sino la constancia y el bienestar.',
      category: 'ESTILO_DE_VIDA',
      userId: medico.id,
      createdAt: daysAgo(5),
    },
  })
  const p4 = await db.healthPublication.create({
    data: {
      title: 'Vivir con EII sin que te consuma: gestión emocional del día a día',
      content:
        'La EII no solo afecta al intestino. La incertidumbre, la urgencia y los imprevistos generan ansiedad que, además, realimenta los síntomas. Estrategias útiles:\n\n1. Planifica con margen: rutas con baños, salidas con kit de emergencia.\n2. Habla de ello: compartir la experiencia reduce la carga (¡para eso está el foro!).\n3. Si la ansiedad interfiere en tu vida diaria, pedir ayuda psicológica es un acto de autocuidado, no de debilidad.',
      category: 'BIENESTAR_EMOCIONAL',
      userId: nutri.id,
      createdAt: daysAgo(2),
    },
  })

  await db.publicationLike.createMany({
    data: [
      { publicationId: p1.id, userId: paciente.id },
      { publicationId: p1.id, userId: paciente2.id },
      { publicationId: p1.id, userId: cuidador.id },
      { publicationId: p2.id, userId: paciente3.id },
      { publicationId: p3.id, userId: paciente.id },
      { publicationId: p3.id, userId: cuidador2.id },
      { publicationId: p4.id, userId: paciente2.id },
      { publicationId: p4.id, userId: paciente3.id },
      { publicationId: p4.id, userId: paciente.id },
    ],
  })

  console.log('📊 Creando registros de salud...')
  const weights = [61.5, 61.2, 60.8, 61.0, 60.5, 60.9, 61.3, 61.1]
  for (let i = 0; i < weights.length; i++) {
    await db.healthEntry.create({
      data: {
        userId: paciente.id,
        date: daysAgo((weights.length - i) * 3),
        weight: weights[i],
        symptoms: [6, 5, 4, 3, 4, 2, 2, 1][i],
        note: i === 0 ? 'Inicio de seguimiento tras consulta.' : i === 4 ? 'Comida fuera, algo más de cansancio.' : null,
      },
    })
  }
  const weights2 = [74.0, 73.6, 73.9, 74.2, 74.0]
  for (let i = 0; i < weights2.length; i++) {
    await db.healthEntry.create({
      data: {
        userId: paciente2.id,
        date: daysAgo((weights2.length - i) * 5),
        weight: weights2[i],
        symptoms: [3, 2, 2, 3, 1][i],
        note: i === 3 ? 'Buena semana, mucha energía.' : null,
      },
    })
  }

  console.log('❤️ Creando favoritos...')
  await db.favorite.createMany({
    data: [
      { userId: paciente.id, recipeId: r1.id },
      { userId: paciente.id, recipeId: r4.id },
      { userId: paciente.id, recipeId: r5.id },
      { userId: paciente2.id, recipeId: r4.id },
      { userId: paciente3.id, recipeId: r2.id },
      { userId: cuidador.id, recipeId: r6.id },
      { userId: cuidador2.id, recipeId: r1.id },
      { userId: cuidador2.id, recipeId: r7.id },
    ],
  })

  console.log('🚩 Creando reportes de ejemplo...')
  const lubinaComment = await db.comment.findFirstOrThrow({
    where: { content: { contains: 'lubina' } },
  })
  await db.report.createMany({
    data: [
      {
        targetType: 'REPLY',
        targetId: (await db.reply.findFirstOrThrow({ where: { threadId: t4.id, userId: nutri.id } })).id,
        reason: 'INFO_SALUD_RIESGOSA',
        details: 'Un usuario ha respondido recomendando dejar la medicación para «limpiar el organismo». Es información peligrosa.',
        status: 'OPEN',
        reporterId: paciente.id,
        createdAt: daysAgo(1),
      },
      {
        targetType: 'COMMENT',
        targetId: lubinaComment.id, // comentario inofensivo sobre la lubina (para poder descartarlo en la demo)
        reason: 'SPAM',
        details: 'Creo que este comentario incluye un enlace promocional a una tienda de suplementos.',
        status: 'OPEN',
        reporterId: paciente3.id,
        createdAt: daysAgo(0),
      },
      {
        targetType: 'THREAD',
        targetId: t1.id,
        reason: 'CONTENIDO_INADECUADO',
        details: 'Reporte de ejemplo ya resuelto: el contenido era correcto y no se tomó ninguna medida.',
        status: 'DISMISSED',
        resolution: 'Revisado: el hilo cumple las normas de la comunidad. No procede ninguna acción.',
        reporterId: paciente2.id,
        resolvedById: coordinator.id,
        createdAt: daysAgo(5),
      },
    ],
  })

  console.log('📧 Creando correos simulados de ejemplo...')
  const allUsers = await db.user.findMany({ select: { id: true, email: true, name: true, role: true, status: true } })
  const byEmail = (mail: string) => allUsers.find((u) => u.email === mail)!
  const demoUser = byEmail('paciente@simbiosis.org')
  const demoNutri = byEmail('nutricionista@simbiosis.org')
  await db.emailLog.createMany({
    data: [
      {
        toUserId: demoUser.id,
        toEmail: demoUser.email,
        subject: 'Hemos recibido tu solicitud de registro',
        body: `Hola ${demoUser.name}:\n\nGracias por unirte a Simbiosis. Tu solicitud de registro como paciente está pendiente de revisión por parte del coordinador.\n\nUn saludo,\nEl equipo de Simbiosis`,
        kind: 'ACCOUNT_RECEIVED',
        createdAt: daysAgo(7),
      },
      {
        toUserId: demoUser.id,
        toEmail: demoUser.email,
        subject: 'Tu cuenta de Simbiosis ha sido aprobada',
        body: `Hola ${demoUser.name}:\n\n¡Buenas noticias! El coordinador de Simbiosis ha aprobado tu cuenta. Ya puedes iniciar sesión y participar en la comunidad.\n\nEl equipo de Simbiosis`,
        kind: 'ACCOUNT_APPROVED',
        createdAt: daysAgo(6),
      },
      {
        toUserId: demoNutri.id,
        toEmail: demoNutri.email,
        subject: 'Tu cuenta de Simbiosis ha sido aprobada',
        body: `Hola ${demoNutri.name}:\n\n¡Buenas noticias! El coordinador de Simbiosis ha aprobado tu cuenta profesional. Ya puedes publicar recetas validadas y consejos de salud.\n\nEl equipo de Simbiosis`,
        kind: 'ACCOUNT_APPROVED',
        createdAt: daysAgo(9),
      },
    ],
  })

  console.log('🔔 Creando notificaciones de ejemplo...')
  const t1Author = await db.thread.findUniqueOrThrow({ where: { id: t1.id }, select: { userId: true, title: true } })
  const r1Author = await db.recipe.findUniqueOrThrow({ where: { id: r1.id }, select: { authorId: true, title: true } })
  const hoursAgo = (h: number) => new Date(Date.now() - h * 3600 * 1000)
  await db.notification.createMany({
    data: [
      {
        userId: t1Author.userId,
        type: 'REPLY',
        title: 'Nueva respuesta en tu hilo',
        body: `Elena Ferrer ha respondido a "${t1Author.title}".`,
        linkView: 'threadDetail',
        linkId: t1.id,
        read: false,
        createdAt: hoursAgo(3),
      },
      {
        userId: r1Author.authorId,
        type: 'RATING',
        title: 'Nueva valoración de tu receta',
        body: `Ana Martín ha valorado "${r1Author.title}" con 5 estrellas.`,
        linkView: 'recipeDetail',
        linkId: r1.id,
        read: false,
        createdAt: hoursAgo(8),
      },
      {
        userId: r1Author.authorId,
        type: 'FAVORITE',
        title: 'Han guardado tu receta',
        body: `Pablo Ortega ha añadido "${r1Author.title}" a sus favoritos.`,
        linkView: 'recipeDetail',
        linkId: r1.id,
        read: true,
        createdAt: hoursAgo(26),
      },
      {
        userId: paciente.id,
        type: 'ACCOUNT',
        title: 'Cuenta aprobada',
        body: '¡Bienvenido/a a Simbiosis! Tu cuenta ha sido aprobada por el coordinador y ya puedes iniciar sesión.',
        read: true,
        createdAt: daysAgo(6),
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

  console.log('🌍 Creando plantillas de menú de la comunidad (profesionales)...')
  // Limpieza idempotente
  await db.planTemplate.deleteMany()
  // Plantilla personal de Lucía (paciente): su semana tipo
  const luciaUser = byEmail('paciente@simbiosis.org')
  const luciaWeek = [
    [0, 'BREAKFAST', r5], [0, 'LUNCH', r2], [0, 'DINNER', r1], [0, 'SNACK', r8],
    [1, 'BREAKFAST', r5], [1, 'LUNCH', r6], [1, 'DINNER', r3],
    [2, 'BREAKFAST', r5], [2, 'LUNCH', r4], [2, 'DINNER', r7],
    [3, 'BREAKFAST', r5], [3, 'LUNCH', r2], [3, 'DINNER', r1],
    [4, 'BREAKFAST', r5], [4, 'LUNCH', r6], [4, 'DINNER', r7],
    [5, 'BREAKFAST', r5], [5, 'LUNCH', r4], [5, 'DINNER', r3],
    [6, 'BREAKFAST', r5], [6, 'LUNCH', r2], [6, 'SNACK', r8], [6, 'DINNER', r1],
  ] as const
  await db.planTemplate.create({
    data: {
      name: 'Mi semana tipo en remisión',
      description: 'Mi semana cuando me siento bien: smoothie por la mañana, comidas al vapor y cenas de cuchara.',
      isPublic: false,
      days: JSON.stringify(luciaWeek.map(([day, slot, r]) => ({ day, slot, recipeId: r.id }))),
      userId: luciaUser.id,
    },
  })
  // Galería de la comunidad: publicadas por profesionales
  const nutriWeek = [
    [0, 'BREAKFAST', r5], [0, 'LUNCH', r2], [0, 'DINNER', r1],
    [1, 'BREAKFAST', r5], [1, 'LUNCH', r6], [1, 'DINNER', r3],
    [2, 'BREAKFAST', r5], [2, 'LUNCH', r4], [2, 'DINNER', r7],
    [3, 'BREAKFAST', r5], [3, 'LUNCH', r2], [3, 'SNACK', r8], [3, 'DINNER', r1],
    [4, 'BREAKFAST', r5], [4, 'LUNCH', r6], [4, 'DINNER', r7],
    [5, 'BREAKFAST', r5], [5, 'LUNCH', r4], [5, 'DINNER', r3],
    [6, 'BREAKFAST', r5], [6, 'LUNCH', r2], [6, 'SNACK', r8], [6, 'DINNER', r1],
  ] as const
  await db.planTemplate.create({
    data: {
      name: 'Semana suave en remisión · Equipo de nutrición',
      description:
        'Menú semanal para mantener la remisión: cocciones sencillas, poca grasa, cenas ligeras y un dulce apto los fines de semana. Elaborado por el equipo de nutrición de Simbiosis.',
      isPublic: true,
      publishedAt: daysAgo(3),
      appliedCount: 12,
      days: JSON.stringify(nutriWeek.map(([day, slot, r]) => ({ day, slot, recipeId: r.id }))),
      userId: nutri.id,
      createdAt: daysAgo(3),
    },
  })
  const medicoWeek = [
    [0, 'BREAKFAST', r5], [0, 'LUNCH', r6], [0, 'DINNER', r7],
    [1, 'BREAKFAST', r5], [1, 'LUNCH', r1], [1, 'DINNER', r7],
    [2, 'BREAKFAST', r5], [2, 'LUNCH', r6], [2, 'DINNER', r1],
    [3, 'BREAKFAST', r5], [3, 'LUNCH', r1], [3, 'DINNER', r7],
    [4, 'BREAKFAST', r5], [4, 'LUNCH', r6], [4, 'DINNER', r1],
    [5, 'BREAKFAST', r5], [5, 'LUNCH', r1], [5, 'DINNER', r7],
    [6, 'BREAKFAST', r5], [6, 'LUNCH', r6], [6, 'DINNER', r7],
  ] as const
  await db.planTemplate.create({
    data: {
      name: 'Plan transitorio para brote · Dr. Sanz',
      description:
        'Plan orientativo para días de brote: caldos, purés y texturas suaves en raciones pequeñas. Es un apoyo temporal; sigue siempre las pautas de tu equipo médico.',
      isPublic: true,
      publishedAt: daysAgo(2),
      appliedCount: 5,
      days: JSON.stringify(medicoWeek.map(([day, slot, r]) => ({ day, slot, recipeId: r.id }))),
      userId: medico.id,
      createdAt: daysAgo(2),
    },
  })

  console.log('✅ Seed completado.')
  console.log(`   Usuarios: 10 · Recetas: 8 · Hilos: 4 · Publicaciones: 4`)
  console.log(`   Contraseña demo para todas las cuentas: ${DEMO_PASSWORD}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
