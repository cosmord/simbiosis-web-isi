# Worklog — Proyecto Simbiosis (Plataforma web EII)

Documento de partida: "Proyecto Simbiosis — Documento de Visión y Alcance v2.2" (Ingeniería del Software I).
Producto: plataforma web colaborativa de recetas para pacientes con EII, en español, con 7 módulos funcionales: gestión de usuarios, foro, gestión de datos de salud, gestión de recetas, publicaciones de salud, moderación de contenidos y guía interactiva.

---
Task ID: 1
Agent: main (Z.ai Code)
Task: Fundación — esquema Prisma, librería auth, helpers API, imágenes y seed.

Work Log:
- Analizado el documento de visión y alcance: stakeholders (paciente, cuidador, nutricionista, médico, coordinador, organización), módulos 1-7, criterios de éxito.
- Definido `prisma/schema.prisma` completo y aplicado con `bun run db:push`. Modelos: User, Session, Recipe, Rating, Comment, Thread, Reply, HealthPublication, PublicationLike, HealthEntry, Favorite, Report (todos con onDelete: Cascade; Report.resolver con SetNull).
- Convención: SQLite no soporta listas → `ingredients`, `steps`, `tags`, `suitableFor` se guardan como JSON string (parsear en API con JSON.parse).
- Creado `src/lib/password.ts` (hashPassword/verifyPassword con scrypt, formato `salt:hash`).
- Creado `src/lib/auth.ts`: createSession, setSessionCookie (cookie httpOnly `simbiosis_session`, 30 días), clearSession, getAuthUser (lee cookie + sesión + usuario), publicUser (quita passwordHash), isProfessional, ROLE_LABELS, PROFESSIONAL_ROLES.
- Creado `src/lib/api-helpers.ts`: `ok(data, status)`, `fail(message, status)`, `requireUser()`, `requireCoordinator()`, `requireProfessional()` — todos devuelven `{user, error}` donde error es una NextResponse lista para `return`. Bloquean login/acciones a usuarios PENDING/SUSPENDED con mensajes en español.
- Generadas imágenes con skill image-generation: `public/images/hero.png` (1344x768) y 6 fotos de recetas en `public/images/recipes/*.png` (crema-calabaza, arroz-pollo, tortilla-espinacas, salmon-calabacin, smoothie-platano, verduras-vapor). 2 recetas sin imagen (image="") para probar el fallback del frontend.
- Ejecutado `bun prisma/seed.ts`: 10 usuarios, 8 recetas, 12 valoraciones, 6 comentarios, 4 hilos + 8 respuestas, 4 publicaciones de salud + 9 likes, 13 registros de salud (2 pacientes), 8 favoritos, 3 reportes (2 OPEN, 1 DISMISSED).

Stage Summary:
- Base de datos y librerías compartidas LISTAS.
- Cuentas demo (contraseña para todas: `simbiosis123`):
  - Coordinador: coordinador@simbiosis.org (Marta Ruiz)
  - Nutricionista: nutricionista@simbiosis.org (Elena Ferrer) · Médico: medico@simbiosis.org (Dr. Javier Sanz)
  - Pacientes: paciente@simbiosis.org (Lucía Ortega), ana@simbiosis.org, sergio@simbiosis.org
  - Cuidadores: cuidador@simbiosis.org (Pablo Ortega), maria@simbiosis.org
  - Profesional PENDIENTE (cola de validación): nutricionista.nueva@simbiosis.org (Carla Mendoza)
- Roles válidos: PATIENT | CAREGIVER | NUTRITIONIST | DOCTOR | COORDINATOR. Status: PENDING | ACTIVE | SUSPENDED.
- Estados de contenido: Recipe/Thread/Reply/Comment/HealthPublication con status PUBLISHED|REMOVED o VISIBLE|REMOVED. Los listados deben excluir REMOVED.
- REGLA DE NEGOCIO: toda cuenta nueva se registra con status PENDING; el coordinador la aprueba (PENDING→ACTIVE). Login bloqueado para PENDING/SUSPENDED (403 con mensaje en español).

## Contratos de API acordados (para Tasks 2-a, 2-b y 3)

Autenticación por cookie httpOnly `simbiosis_session`. Todas las respuestas JSON. Errores: `{ "error": "mensaje en español" }` con status 400/401/403/404.

### Grupo 2-a (auth/usuarios/coordinador/reportes/stats)
- `POST /api/auth/register` {email, password, name, role(PATIENT|CAREGIVER|NUTRITIONIST|DOCTOR), bio?} → 201 `{user}` (status PENDING). Email único (409 si repetido). Validar rol y formato con zod o manual.
- `POST /api/auth/login` {email, password} → `{user}`; 401 credenciales inválidas ("Correo o contraseña incorrectos."); 403 si PENDING ("Tu cuenta está pendiente de aprobación por el coordinador.") o SUSPENDED ("Tu cuenta ha sido suspendida. Contacta con el coordinador."). Crea sesión + cookie.
- `POST /api/auth/logout` → `{ok: true}` (borra sesión y cookie).
- `GET /api/auth/me` → `{user | null}` (si PENDING/SUSPENDED devuelve el usuario con su status; el cliente decide). Nota: devolver usuario aunque esté PENDING para que el frontend muestre el estado.
- `PATCH /api/users/me` {name?, bio?} (requiere auth) → `{user}`.
- `GET /api/users/me/profile` (auth) → `{ user, stats: {recipes, avgRatingReceived, ratingsCount, favorites, threads}, myRecipes: [...receta resumida + avgRating...], myFavorites: [...receta resumida...], myThreads: [...hilo + replies count...] }`
- `GET /api/coordinator/users?status=PENDING|ACTIVE|SUSPENDED|ALL` (coordinador) → `{users: [SafeUser...]}` ordenados por createdAt desc. Excluir al propio coordinador.
- `PATCH /api/coordinator/users/[id]` (coordinador) {action: "ACTIVATE"|"SUSPEND"|"DELETE"} → `{user}` o `{ok:true}` en DELETE. No permitir actuar sobre COORDINATOR (403 "No puedes gestionar otras cuentas de coordinador."). SUSPEND debe borrar sus sesiones. DELETE elimina el usuario (cascade).
- `GET /api/reports?status=OPEN|RESOLVED|DISMISSED|ALL` (coordinador) → `{reports: [{id, targetType, targetId, reason, details, status, resolution, createdAt, reporter: {id,name,role}, targetPreview: {title|content|name, snippet, image?}, resolvedBy?}]}`. targetPreview: para RECIPE buscar Recipe (title+description+image), COMMENT → content + recipe title, THREAD → title, REPLY → content + thread title, PUBLICATION → title, USER → user name/role/status. Si el target ya no existe → `targetPreview: null`.
- `POST /api/reports` (auth) {targetType(RECIPE|COMMENT|THREAD|REPLY|PUBLICATION|USER), targetId, reason(CONTENIDO_INADECUADO|INFO_SALUD_RIESGOSA|SPAM|ACOSO|OTRO), details?} → 201 `{report}`. Validar que el target exista.
- `PATCH /api/reports/[id]` (coordinador) {resolution: "DISMISS"|"REMOVE_CONTENT"|"SUSPEND_USER", note?} → `{report}`. Acciones:
  - DISMISS: status=DISMISSED.
  - REMOVE_CONTENT: según targetType marca REMOVED (Recipe→status REMOVED; Comment/Thread/Reply→REMOVED; HealthPublication→REMOVED) o SUSPENDED (si USER), status=RESOLVED.
  - SUSPEND_USER: si targetType USER → suspende ese usuario (y borra sus sesiones); si es contenido → suspende al autor del contenido; status=RESOLVED.
  - Guardar resolution note y resolvedById.
- `GET /api/stats` (público) → `{users, recipes, professionalRecipesPct, avgRating, ratingsCount, threads, publications, satisfactionPct}`. users = ACTIVE; recipes = PUBLISHED; professionalRecipesPct = % recetas de NUTRITIONIST/DOCTOR (criterio de éxito ≥10); avgRating media global 1 decimal; satisfactionPct = % de valoraciones con 4-5 estrellas (criterio de éxito ≥75).

### Grupo 2-b (recetas/foro/publicaciones/salud)
- `GET /api/recipes?q=&category=&tag=&suitable=&authorRole=ALL|PRO|COMMUNITY&sort=RECENT|RATING|FAVORITES` (público) → `{recipes: [{id, title, description, image, category, tags[], suitableFor[], prepTime, servings, createdAt, status:"PUBLISHED", author:{id,name,role}, isProfessional, avgRating, ratingCount, favoritesCount, favoriteByMe}]}`. Excluir REMOVED. `q` filtra title+description (case-insensitive, JS). favoriteByMe solo si auth.
- `POST /api/recipes` (auth) {title, description, ingredients[], steps[], image?, category, tags[], suitableFor[], prepTime, servings} → 201 `{recipe}`. Validar arrays no vacíos.
- `GET /api/recipes/[id]` (público) → `{recipe: {...+ingredients[], steps[]}, author:{id,name,role,bio,createdAt}, comments: [{id, content, createdAt, author:{id,name,role}, status}], ratings: [{id, stars, comment, createdAt, author:{id,name,role}}], avgRating, ratingCount, favoritesCount, myRating: {stars, comment}|null, favoriteByMe}`. Si REMOVED → 404.
- `PATCH /api/recipes/[id]` (solo autor) mismo cuerpo parcial → `{recipe}`. `DELETE /api/recipes/[id]` (autor o coordinador) → `{ok:true}` (borrado físico).
- `POST /api/recipes/[id]/rate` (auth) {stars 1-5, comment?} → upsert de Rating → `{avgRating, ratingCount, myRating}`.
- `POST /api/recipes/[id]/comments` (auth) {content} → 201 `{comment}`. `DELETE /api/comments/[id]` (autor o coordinador) → `{ok:true}`.
- `POST /api/recipes/[id]/favorite` (auth) → toggle → `{favorite: boolean, favoritesCount}`.
- `GET /api/forum/threads?category=ALL|DIETA_Y_SINTOMAS|RECETAS_Y_COCINA|APOYO_EMOCIONAL|DUDAS_GENERALES&sort=RECENT|ACTIVE` (público) → `{threads: [{id, title, content, category, views, createdAt, author:{id,name,role}, repliesCount, lastActivityAt}]}`. Excluir REMOVED. ACTIVE ordena por última actividad (respuestas incluidas).
- `POST /api/forum/threads` (auth) {title, content, category} → 201 `{thread}`.
- `GET /api/forum/threads/[id]` (público) → `{thread: {...}, author, replies: [{id, content, createdAt, author:{id,name,role}}], repliesCount}`. Incrementa views en +1 (fire and forget).
- `POST /api/forum/threads/[id]/replies` (auth) {content} → 201 `{reply}`. `DELETE /api/replies/[id]` (autor o coordinador) → `{ok:true}`.
- `GET /api/publications?category=ALL|NUTRICION|ESTILO_DE_VIDA|BIENESTAR_EMOCIONAL|TRATAMIENTO` (público) → `{publications: [{id, title, content, category, createdAt, author:{id,name,role}, likesCount, likedByMe}]}`. Excluir REMOVED.
- `POST /api/publications` (solo NUTRITIONIST/DOCTOR) {title, content, category} → 201 `{publication}`.
- `POST /api/publications/[id]/like` (auth) → toggle → `{liked: boolean, likesCount}`.
- `GET /api/health/entries` (auth) → propias → `{entries: [{id, date, weight, symptoms, note}]}` ordenadas por date asc.
- `POST /api/health/entries` (auth) {date, weight?, symptoms 0-10, note?} → 201 `{entry}`. `DELETE /api/health/entries/[id]` (propietario) → `{ok:true}`.

### Convenciones comunes
- Usar `import { db } from '@/lib/db'`, helpers de `@/lib/api-helpers`, auth de `@/lib/auth`.
- Parsear JSON strings (ingredients, steps, tags, suitableFor) antes de devolver.
- Todos los listados excluyen contenido REMOVED.
- Rutas dinámicas App Router: en Next 16, `params` de route handlers es `Promise<{id: string}>` → `const { id } = await params`.
- Los endpoints con cookie usan next/headers cookies() vía getAuthUser — funcionan en route handlers.

---
Task ID: 2-b
Agent: full-stack-developer
Task: APIs de recetas/foro/publicaciones/salud

Work Log:
- Leído worklog.md (contratos del grupo 2-b), prisma/schema.prisma, src/lib/auth.ts y src/lib/api-helpers.ts antes de escribir código.
- Creado `src/lib/serialize.ts` (helpers compartidos): `parseJsonArray` (JSON string → string[], try/catch con fallback []), `averageStars` (media con 1 decimal), tipo `RecipeWithRelations` y `serializeRecipe` (arrays parseados + isProfessional + avgRating/ratingCount/favoritesCount/favoriteByMe).
- Implementados los 14 route handlers del contrato (App Router, NextRequest/NextResponse, `params` como `Promise<{id}>` y `await ctx.params`), sin server actions ni 'use client'.
- Búsqueda y ordenación en JS (SQLite no soporta `contains` con `mode` ni ordenar por valores computados): `q` sobre title+description en minúsculas; filtros category/tag/suitable case-insensitive; authorRole PRO/COMMUNITY; sort RATING (avgRating desc, tie ratingCount, tie createdAt) y FAVORITES (favoritesCount desc, tie createdAt) con orden base RECENT (createdAt desc) desde Prisma.
- Todos los listados excluyen contenido eliminado: Recipe `status=PUBLISHED`; Thread/Reply/Comment `VISIBLE`; HealthPublication `PUBLISHED`. Detalle de receta REMOVED o inexistente → 404 "Receta no encontrada." (ídem hilo "Hilo no encontrado." y publicación).
- favoriteByMe / myRating / likedByMe calculados con `getAuthUser()` (opcional en endpoints públicos); acciones con `requireUser()` (bloquea PENDING/SUSPENDED con mensajes español), publicaciones con `requireProfessional()`.
- Toggles por clave compuesta: Favorite `userId_recipeId`, PublicationLike `publicationId_userId`; Rating con `upsert` sobre `userId_recipeId` (comment null si no viene). Respuestas: rate → {avgRating, ratingCount, myRating}; favorite → {favorite, favoritesCount}; like → {liked, likesCount}.
- views del hilo: en GET detalle se incrementa fire-and-forget (`void db.thread.update(...).catch(() => {})`) y la respuesta devuelve el valor leído antes del incremento.
- repliesCount y lastActivityAt (max entre createdAt del hilo y última respuesta VISIBLE) calculados solo con respuestas VISIBLE; sort ACTIVE ordena por lastActivityAt desc. Replies del detalle ordenadas asc; comments de receta asc; ratings desc.
- Salud: `date` obligatoria y válida (Date), `symptoms` entero 0-10, `weight` opcional > 0, `note` opcional; GET propio ordenado por date asc y serializado con date ISO.
- Validaciones con mensajes en español (400) en todos los POST/PATCH: título/descripción/contenido no vacíos, ingredients/steps arrays no vacíos, prepTime/servings > 0, stars 1-5, categorías de hilo/publicación en sus listas válidas.
- Smoke tests con curl y sesiones reales (paciente, nutricionista, coordinador, otra paciente): filtros/orden de recetas, crear/editar/borrar receta, upsert de valoración, comentario, toggle favorito y like (con recuento), hilo+respuesta+sort ACTIVE, 403 de paciente al crear publicación, permisos de borrado (autor/coordinador en receta y comentario; solo propietario en registro de salud), 404 en receta inexistente, 401 sin sesión en /api/health/entries. Datos de prueba borrados al terminar (base queda como tras el seed).
- `bun run lint` sin errores; dev.log sin errores de compilación ni runtime.

Stage Summary:
- Endpoints implementados (todos según contrato del grupo 2-b):
  - `GET /api/recipes` y `POST /api/recipes`
  - `GET /api/recipes/[id]`, `PATCH /api/recipes/[id]`, `DELETE /api/recipes/[id]`
  - `POST /api/recipes/[id]/rate`, `POST /api/recipes/[id]/comments`, `POST /api/recipes/[id]/favorite`
  - `DELETE /api/comments/[id]`
  - `GET /api/forum/threads`, `POST /api/forum/threads`, `GET /api/forum/threads/[id]`, `POST /api/forum/threads/[id]/replies`
  - `DELETE /api/replies/[id]`
  - `GET /api/publications`, `POST /api/publications`, `POST /api/publications/[id]/like`
  - `GET /api/health/entries`, `POST /api/health/entries`, `DELETE /api/health/entries/[id]`
- Caveats/decisiones: (1) el listado de recetas incluye además `ingredients[]` y `steps[]` parseados (aditivo, no rompe la forma del contrato y sirve para tarjetas); (2) en detalle de receta los comentarios salen ascendentes y solo VISIBLE (el campo status del contrato siempre es "VISIBLE") y las valoraciones descendentes; (3) PATCH de receta es solo del autor; el coordinador solo puede DELETE (según contrato); (4) no existen DELETE de hilos ni publicaciones (no están en el contrato; la moderación va por PATCH /api/reports/[id] del grupo 2-a) → 405 si se intentan; (5) rate/favorite/like devuelven 200 (upsert/toggle) y las creaciones puras 201; (6) categoría de receta libre con default "Comida"; categorías de hilo/publicación se normalizan a mayúsculas y se validan (400 si inválidas); (7) `sort`/`category` inválidos caen a los defaults (RECENT/ALL) en vez de fallar.

---
Task ID: 2-a
Agent: full-stack-developer
Task: APIs de auth/usuarios/coordinador/reportes/stats

Work Log:
- Leídos worklog.md, prisma/schema.prisma, src/lib/auth.ts y src/lib/api-helpers.ts para seguir los contratos exactamente.
- Creado src/lib/reports.ts con helpers compartidos: buildTargetPreview (vista previa por targetType con snippet truncado a 140 chars; null si el target ya no existe), targetExists, removeContent (updateMany → REMOVED, tolera targets inexistentes), authorOfContent y suspendUserAndClearSessions (suspende + borra sesiones).
- POST /api/auth/register: valida campos/rol manualmente (PATIENT|CAREGIVER|NUTRITIONIST|DOCTOR, email regex, password ≥6), email normalizado a minúsculas, 409 si repetido, crea usuario con status PENDING → 201 {user}.
- POST /api/auth/login: 401 "Correo o contraseña incorrectos."; 403 con mensajes exactos para PENDING/SUSPENDED; al éxito createSession + setSessionCookie (cookie httpOnly simbiosis_session) → {user}.
- POST /api/auth/logout: clearSession() → {ok:true}. GET /api/auth/me: {user|null}, devuelve el usuario aunque esté PENDING/SUSPENDED.
- PATCH /api/users/me (requireUser): {name?, bio?}; bio="" o null la limpia a null;rechaza cuerpo vacío con 400.
- GET /api/users/me/profile (requireUser): stats {recipes, avgRatingReceived, ratingsCount, favorites, threads} + myRecipes (incluye REMOVED con status para que el autor vea la moderación; avgRating/ratingCount/favoritesCount por receta), myFavorites (solo recetas PUBLISHED), myThreads (excluye REMOVED, con repliesCount). tags/suitableFor parseados de JSON string. avgRating redondeado a 1 decimal.
- GET /api/coordinator/users (requireCoordinator): filtro ?status=PENDING|ACTIVE|SUSPENDED|ALL, ordenado por createdAt desc. Decisión: se excluyen TODAS las cuentas COORDINATOR (no solo el propio), coherente con la regla de no gestionar coordinadores.
- PATCH /api/coordinator/users/[id]: {action: ACTIVATE|SUSPEND|DELETE}; 403 "No puedes gestionar otras cuentas de coordinador." si el target es COORDINATOR; SUSPEND borra sus sesiones en la misma Promise.all; DELETE usa db.user.delete (cascade verificado en schema) → {ok:true}; 404 "Usuario no encontrado.".
- GET /api/reports (requireCoordinator): ?status=OPEN|RESOLVED|DISMISSED|ALL (default ALL), orden desc, con reporter {id,name,role}, targetPreview (RECIPE→title+desc+image; COMMENT→content+recipe.title+image; THREAD→title+content; REPLY→content+thread.title; PUBLICATION→title+content; USER→name/role/status+bio) y resolvedBy {id,name}|null.
- POST /api/reports (requireUser): valida targetType/reason contra listas blancas, comprueba que el target exista (404 "El contenido que intentas denunciar no existe."), details opcional → 201 {report}.
- PATCH /api/reports/[id] (requireCoordinator): {resolution: DISMISS|REMOVE_CONTENT|SUSPEND_USER, note?}; rechaza reportes ya gestionados (400). DISMISS→status DISMISSED. REMOVE_CONTENT→marca REMOVED el contenido o SUSPENDED+borra sesiones si USER. SUSPEND_USER→suspende al target (si USER) o al autor del contenido, borrando sus sesiones. Bloquea suspender cuentas COORDINADOR (403). Guarda resolution = note si viene, o texto por defecto en español según acción ("Denuncia desestimada." / "Contenido eliminado por el coordinador." / "Usuario suspendido por el coordinador."), resolvedById y status RESOLVED/DISMISSED → {report} con resolvedBy.
- GET /api/stats (público, force-dynamic): users (ACTIVE), recipes (PUBLISHED), professionalRecipesPct (sobre recetas PUBLISHED de NUTRITIONIST/DOCTOR), avgRating (1 decimal) y ratingsCount/satisfactionPct (% valoraciones 4-5★) calculados sobre valoraciones de recetas PUBLISHED, threads (no REMOVED), publications (PUBLISHED).
- Probado con curl contra el dev server (puerto 3000): registro (201/409/400), login PENDING/SUSPENDED (403 con mensajes exactos), activate→login ok, profile, PATCH me, crear reporte, resolver con SUSPEND_USER (verificada la eliminación de sesiones vía /api/auth/me → null), bloqueo a coordinadores, DELETE en cascada, 401/403 de acceso. Cuenta y reporte de prueba eliminados al final; la BD quedó en estado seed. `bun run lint` sin errores.

Stage Summary:
- Endpoints implementados: POST /api/auth/register, POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me, PATCH /api/users/me, GET /api/users/me/profile, GET /api/coordinator/users, PATCH /api/coordinator/users/[id], GET+POST /api/reports, PATCH /api/reports/[id], GET /api/stats. Apoyo: src/lib/reports.ts.
- Caveats: (1) en GET /api/coordinator/users se excluyen todos los COORDINATOR (el contrato decía "excluir al propio coordinador"; con un solo coordinador el resultado es idéntico). (2) Report.resolution guarda la nota del coordinador o un texto por defecto según la acción (el modelo solo tiene un campo string; la acción DISMISS es deducible de status=DISMISSED). (3) En el perfil propio, myRecipes incluye recetas REMOVED con su status (vista privada del autor); myFavorites/myThreads excluyen REMOVED. (4) avgRating/redondeos a 1 decimal; stats usan solo valoraciones de recetas PUBLISHED. (5) No se puede suspender a un COORDINADOR ni vía gestión de usuarios ni vía resolución de reportes.

---
Task ID: 3
Agent: full-stack-developer (sesión con timeout; verificación y correcciones completadas por main en Task 4)
Task: Frontend SPA completa de Simbiosis (módulos 1-7 del documento de visión)

Work Log:
- Creados 21 componentes en src/components/simbiosis/: navbar, footer, auth-view (login/registro con chips demo), home-view (hero + stats + criterios de éxito + destacados), recipes-view (búsqueda/filtros/orden), recipe-detail (valoraciones, comentarios, favoritos, denuncia, editar/eliminar), recipe-form (crear/editar con ingredientes y pasos dinámicos), forum-view + thread-detail (hilos, respuestas, vistas), publications-view (consejos por categoría + likes + creación profesional), health-view (diario con formulario, slider de síntomas, gráfico recharts doble eje, historial), profile-view (perfil + tabs recetas/favoritos/hilos/valoraciones), coordinator-view (panel: denuncias con acciones y gestión de cuentas con aprobación/suspensión/eliminación), guide-modal (guía interactiva en 8 pasos), report-dialog (denuncias con motivo), rating-stars, image-with-fallback, empty-state, stats-banner, user-bits, recipe-card.
- Infra: src/lib/store.ts (zustand: sesión + navegación SPA + refresco), src/lib/client-api.ts (fetch wrapper con errores en español), src/lib/types.ts (tipos completos), src/lib/format.ts (fechas es-ES con date-fns, roles, síntomas, numEs).
- Actualizados src/app/page.tsx (SPA con AnimatePresence, splash, ThemeProvider), layout.tsx (metadata es + sonner Toaster), globals.css (paleta emerald/ámbar, dark mode, scrollbar).
- Navegación SPA en la única ruta /: home | recipes | recipeDetail | newRecipe | forum | threadDetail | publications | health | profile | coordinator.

Stage Summary:
- Los 7 módulos funcionales implementados y navegables; accesibilidad (aria-labels, roles, landmarks), responsive mobile-first (Sheet en móvil), modo claro/oscuro, footer sticky con aviso médico.

---
Task ID: 4
Agent: main (Z.ai Code)
Task: QA E2E con agent-browser y correcciones

Work Log:
- Verificación E2E con agent-browser del camino dorado completo: home con datos seed, login/logout, registro de cuenta nueva (PENDING), bloqueo de login PENDING con mensaje, aprobación por coordinador, login del aprobado, buscador y filtros de recetas, detalle de receta, actualizar valoración (media recalculada 4,3/5), publicar comentario, responder en hilo del foro, registrar entrada de salud con gráfico, like en publicación, guía interactiva (8 pasos), panel de coordinación (desestimar denuncia con nota, aprobar cuenta, contadores), crear receta con ingredientes/pasos dinámicos, modo oscuro, responsive móvil 390x844 (hamburguesa + footer).
- Bug corregido 1: recipe-detail.tsx esperaba respuesta plana pero GET /api/recipes/[id] devuelve {recipe, author, comments, ratings,...} anidado → TypeError "Cannot read properties of undefined (reading 'length')". Añadido RecipeDetailResponse + toDetailData() que normaliza la respuesta. (crasheaba al abrir cualquier receta)
- Bug corregido 2: profile-view.tsx leía myRating dentro de recipe; viene a nivel superior → pestaña "Mis valoraciones" siempre vacía. Corregido.
- Bug corregido 3: health-view.tsx con input type=number: "60,7" (coma decimal) se convertía en 607 → cambiado a type=text + inputMode=decimal con normalización coma→punto y validación ≤500 kg. Entrada errónea de 607 kg eliminada.
- Bug corregido 4: coordinator-view.tsx no refrescaba los contadores (pendientes/activas/suspendidas) tras aprobar/suspender → extraído loadCounts() y llamado tras cada acción.
- Bug corregido 5 (seed): el reporte COMMENT apuntaba al id de la receta en vez del comentario ("Contenido eliminado" en el panel) → corregido en prisma/seed.ts y en la BD viva (apunta al comentario de la lubina).
- Limpieza de datos de prueba de los agentes 2-a/2-b (hilo/publicación de prueba); hilo de "Ansiedad antes de las pruebas" restaurado (había sido borrado por filtro de limpieza).
- bun run lint sin errores; dev.log sin errores de runtime tras las correcciones; imágenes generadas servidas correctamente.

Stage Summary:
- Proyecto FUNCIONAL y verificado en navegador de extremo a extremo. Estado de BD: 10 usuarios (incl. Diego Pascual aprobado en la demo), 9 recetas (8 seed + puré de Diego), 4 hilos, 4 publicaciones, 1 denuncia abierta (info de salud riesgosa) para demo de moderación, 1 profesional pendiente restante: ninguno (Carla aprobada; si se re-seede vuelve a estar pendiente).
- Cuentas demo: coordinador@simbiosis.org / nutricionista@simbiosis.org / medico@simbiosis.org / paciente@simbiosis.org / cuidador@simbiosis.org — contraseña simbiosis123 (chips de acceso rápido en el login).

---
Task ID: 6
Agent: main (cron webDevReview — ronda de revisión continua #1)
Task: QA de regresión + nuevas funcionalidades (planificador semanal, perfiles públicos, imágenes IA)

Work Log:
- QA de regresión con agent-browser: home, listado (9 recetas), detalle de receta, sin errores de consola. Proyecto estable tras la ronda anterior.
- NUEVO MÓDULO "Mi plan semanal" (planificador de menús): modelo MealPlanItem (day 0-6, slot BREAKFAST|LUNCH|DINNER|SNACK, unique [userId,day,slot], cascade) + db push. APIs: GET/PUT/DELETE /api/plan (listar/asignar por upsert/vaciar) y DELETE /api/plan/[id]. Vista plan-view.tsx: rejilla 7 días × 4 franjas con contadores x/4, diálogo selector de receta con búsqueda debounced, lista de la compra agregada (agrupa ingredientes iguales con ×N, checkboxes locales, copiar al portapapeles), botón "Vaciar semana" con confirmación. Plan de ejemplo precargado para paciente@simbiosis.org (14 slots). Enlace en navbar (escritorio + menú de cuenta + sheet móvil).
- Añadir al plan desde el detalle de receta: botón "Añadir a mi plan semanal" + diálogo día/franja (Select) → PUT /api/plan.
- NUEVO: perfiles públicos de autor: GET /api/users/[id] (bio, stats: recetas/valoración media/favoritos recibidos, recetas PUBLISHED con resumen). Vista user-profile-view.tsx (banner degradado, avatar, chips de stats, grid de recetas). Nombres de autor ahora clicables en: detalle de receta, respuestas e hilos del foro, tarjetas y diálogo de publicaciones.
- NUEVO: imagen de receta generada con IA: POST /api/recipes/generate-image (z-ai-web-dev-sdk server-side, 1024x1024, guarda en public/images/generated/). Botón "Generar con IA" en recipe-form (deshabilitado sin título, spinner, previsualización con botón quitar). Verificado E2E en navegador (~45s por imagen) y vía curl.
- Generadas imágenes para las 2 recetas seed sin foto (sopa-fideos.png, bizcocho-manzana.png) + regenerada arroz-pollo.png (había desaparecido del disco; el optimizador de next/image devolvía "isn't a valid image ... received null").
- Bugs corregidos en esta ronda: (1) slot de PLAN_SLOTS pasaba el objeto en vez del valor → etiquetas "undefined" en aria-labels y franjas del planificador; (2) setState síncrono en useEffect del selector (regla react-hooks/set-state-in-effect) → reset movido a handleClose y loading dentro del timeout; (3) cliente Prisma obsoleto en el dev server tras db:push (singleton en globalThis sin mealPlanItem) → reinicio del servidor; nota: el sandbox mata procesos lanzados entre llamadas si no van desacoplados, relanzado con setsid + doble fork.
- bun run lint sin errores.

Stage Summary:
- Nuevas funcionalidades OPERATIVAS y verificadas en navegador: planificador semanal completo con lista de la compra, perfiles públicos clicables, generación de imágenes IA en el formulario (y las 9 recetas del seed tienen ahora foto).
- Riesgos/notas: (a) la generación IA tarda 40-60s por imagen y el servicio puede devolver 429 si se abusa — el botón muestra "Generando…" y el error cae a toast; (b) si el dev server muere hay que relanzarlo con `setsid nohup bun run dev &` desde bash desacoplado (el sandbox puede segar procesos hijos entre llamadas); (c) las imágenes del CLI se guardan como datos JPEG con extensión .png (sharp/next las optimiza sin problema).
- Recomendaciones siguiente ronda: sección "Sobre el proyecto" con objetivos de negocio BO-01..BO-06 y stakeholders (material del caso); notificaciones in-app (respuestas a tus hilos, cuenta aprobada); paginación en recetas/foro; exportar diario de salud a CSV; tests de accesibilidad.

---
Task ID: 7
Agent: main (cron webDevReview — ronda de revisión continua #2)
Task: QA de regresión + notificaciones in-app + exportación CSV + diálogo "Acerca del proyecto" + pulido visual

Work Log:
- QA de regresión con agent-browser (desktop 1440x900 y móvil 390x844): home con stats y destacados, listado de recetas (9), detalle de receta, login con chips demo, diario de salud, planificador semanal (4/4 lunes), foro, consejos de salud. Cero errores de consola. El 404 de /images/recipes/arroz-pollo.png del log era caché obsoleta del optimizador: el fichero existe en disco y sirve 200.
- NUEVO MÓDULO de notificaciones in-app:
  - Modelo `Notification` (userId cascade, type, title, body, linkView, linkId, read, índices [userId,read] y [userId,createdAt]) + db push + reinicio del dev server (setsid, el sandbox segó el primer intento).
  - `src/lib/notify.ts`: notify/notifyAsync fire-and-forget; nunca notifica al actor y nunca rompe la petición principal.
  - Eventos que notifican: respuesta en tu hilo (REPLY), comentario en tu receta (COMMENT), nueva valoración solo si es la primera del usuario en esa receta (RATING), favorito añadido (FAVORITE), «me gusta» en tu consejo (LIKE), cuenta aprobada/suspendida por el coordinador (ACCOUNT), contenido retirado o suspensión vía resolución de denuncia (MODERATION, con frases de género correctas: "Tu receta ha sido retirada...").
  - APIs: GET /api/notifications (lista 20 + unread, force-dynamic), PATCH /api/notifications (marcar todas), DELETE /api/notifications (borrar leídas), PATCH/DELETE /api/notifications/[id] (propietario, 404 si no es tuya).
  - UI: `notification-bell.tsx` con campana + badge rojo (9+), popover con iconos por tipo en círculos de color, puntos de no leída, timestamps en es-ES, "Marcar leídas", papelera para borrar leídas, skeletons de carga, estado vacío ilustrado, scroll-area de 26rem, sondeo cada 25 s + refresco al enfocar la ventana, deep-link al hacer clic (navega a recipeDetail/threadDetail/publications y marca como leída). Montada en navbar con `key={user.id}` (regla react-hooks/set-state-in-effect: carga inicial con setTimeout 0, reset por remount).
  - Seed de demo: prisma/seed-notifications.ts (one-off en BD viva, no destructivo) + sección de notificaciones añadida a prisma/seed.ts (con notification.deleteMany en la limpieza).
- NUEVO: exportar diario de salud a CSV: GET /api/health/entries/export (CSV con BOM UTF-8, separador ";" y coma decimal para Excel-es; Content-Disposition attachment con fecha) + botón "Exportar CSV" en health-view (solo si hay registros). Verificada la descarga en navegador (305 bytes, cabeceras correctas).
- NUEVO: diálogo "Acerca del proyecto" (about-dialog.tsx): BO-01..BO-06 en tarjetas con iconos, 5 partes interesadas, 4 criterios de éxito cuantificados, alcance incluido/excluido, restricciones (6 meses, 90.000 €, equipo reducido). Trigger en el footer (columna "Proyecto") y atajo de teclado «?». 
- Pulido visual: tarjetas de receta con hover elevado (border-primary/40 + shadow-lg + zoom de imagen 1.06 con transición 500 ms + velo inferior que revela el badge pro + corazón con scale), 2 chips flotantes glass en el hero (lg+): "Recetas validadas por profesionales" y "Planifica tu menú semanal".
- Bugs menores: (1) "Tu receta ha sido retirado" → mapa REMOVAL_PHRASES con concordancia de género; (2) icono X de "borrar leídas" confuso → Trash2 con title/aria-label; (3) regla lint react-hooks/set-state-in-effect en la campana → reestructurado (sin reset en effect, remount por key, carga inicial diferida).
- Verificación E2E en navegador de todos los flujos nuevos: badge con contador, popover con contenido, clic en notificación → navega al hilo y limpia badge, "Marcar leídas" pone unread a 0, eliminar una notificación, flujo completo aprobación→login→notificación ACCOUNT, flujo denuncia→REMOVE_CONTENT→notificación MODERATION, descarga CSV. Datos de prueba borrados (respuesta de prueba, receta+denuncia de prueba, usuario de prueba); favorito de Ana al smoothie de Lucía se dejó como dato de demo realista.
- bun run lint sin errores; dev.log sin errores; /api/stats correcto (10 usuarios, 9 recetas, 33,3 % pro, 4,5/5, 100 % satisfacción).

Stage Summary:
- Fase 1 del proyecto COMPLETA: los 7 módulos del documento + planificador semanal + perfiles públicos + imagen IA + notificaciones in-app + CSV + "Acerca del proyecto". Todo verificado en navegador sin errores de consola.
- Estado BD: 10 usuarios (Diego Pascual incluido), 9 recetas (todas con foto), 4 hilos, 4 publicaciones, 13+ registros de salud, 2 denuncias OPEN (demo de moderación: respuesta riesgosa + comentario lubina), 1 DISMISSED, notificaciones de demo para paciente@ y autores.
- Cuentas demo (contraseña simbiosis123): coordinador@ / nutricionista@ / medico@ / paciente@ / cuidador@simbiosis.org.
- Riesgos/notas: (a) el sandbox puede segar el dev server entre llamadas → relanzar con `(setsid nohup bun run dev >> dev.log 2>&1 < /dev/null &)`; (b) tras db:push conviene reiniciar el dev server (cliente Prisma obsoleto); (c) el sondeo de notificaciones es cada 25 s (sin WebSocket; suficiente y simple).
- Recomendaciones siguiente ronda: paginación/"cargar más" en recetas y foro; emails (simulados) al aprobar cuentas; modo "recordatorios" del plan semanal; estadísticas de administrador más ricas (gráfico de crecimiento); internacionalización (el doc pide decidir idiomas).
