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

---
Task ID: 8
Agent: main (cron webDevReview — ronda de revisión continua #3)
Task: QA de regresión + paginación "Cargar más" + bandeja de correos simulada + panel de resumen del coordinador

Work Log:
- QA de regresión con agent-browser (home, recetas, foro, login, panel coordinación): cero errores de consola, proyecto estable tras la ronda anterior.
- NUEVO: paginación "Cargar más" en recetas y foro:
  - GET /api/recipes y GET /api/forum/threads aceptan `limit` (≤48) y `offset`, aplicados TRAS el ordenado en JS (mantiene la corrección de los sorts RATING/FAVORITES/ACTIVE); devuelven además `total` y `hasMore`. Sin límite si no se piden (compatibilidad con home/perfil/plan).
  - recipes-view: PAGE_SIZE=8, "Mostrando X de Y recetas", botón redondo "Cargar más recetas (N restantes)" con spinner; si hay filtros de etiquetas/apta-para (client-side) se pide todo de una vez para no romper el filtrado combinable. loadMore deduplica por id.
  - forum-view: PAGE_SIZE=6, botón "Cargar más hilos (N restantes)" con el mismo patrón.
  - Verificado en navegador: 8/9 → clic → 9/9 y el botón desaparece; API probada con curl (limit/offset/total/hasMore correctos).
- NUEVO: bandeja de correos simulados (condición de despliegue del doc v2.2: «envío de mensajes de seguridad y notificaciones por correo electrónico»):
  - Modelo `EmailLog` (toUserId SetNull para conservar el correo si se borra la cuenta, toEmail, subject, body, kind, index createdAt) + db push + reinicio del dev server.
  - `src/lib/emails.ts` (sendEmail/sendEmailAsync fire-and-forget, remitente no-responder@simbiosis.org). Eventos: registro → ACCOUNT_RECEIVED ("Hemos recibido tu solicitud"), aprobación → ACCOUNT_APPROVED, suspensión (panel o denuncia) → ACCOUNT_SUSPENDED, retirada de contenido → CONTENT_REMOVED (con el motivo de la nota si existe).
  - GET /api/coordinator/emails (solo coordinador, últimos 50, con toUser).
  - Nueva pestaña "Correos enviados" en el panel: tarjetas con asunto, badge por tipo con color, destinatario (nombre + email), fecha relativa y `<details>` desplegable con el cuerpo del mensaje.
  - Seed: emails de demo en prisma/seed.ts (limpieza con emailLog.deleteMany) + one-off prisma/seed-emails.ts sobre la BD viva (3 correos).
  - Flujo completo verificado: registro test → ACCOUNT_RECEIVED en bandeja; aprobación → ACCOUNT_APPROVED; usuario de prueba eliminado después (correos retenidos gracias a SetNull).
- NUEVO: pestaña "Resumen" del panel de coordinación:
  - GET /api/coordinator/stats: totales (usuarios, recetas, hilos, publicaciones, denuncias abiertas/resueltas), usuarios por rol y por estado, y actividad por día de los últimos 14 días (altas, recetas, hilos) con cubetas por medianoche local.
  - UI: 6 tarjetas de totales con iconos de colores, gráfico de barras recharts (3 series: usuarios #059669, recetas #d97706, hilos #0d9488) con aria-label y leyenda, badges de usuarios por rol. Skeletons de carga y EmptyState si falla.
  - Bug corregido durante la verificación: `db.publication.count` no existe (el modelo es HealthPublication) → 500 inicial; corregido a `db.healthPublication.count` y verificado 200.
- Pulido visual: pestañas del panel con flex-wrap (móvil), tarjetas de stats con iconos en cápsulas de color, botones "Cargar más" redondos con sombra y spinner, tarjetas de correo con badges temáticos.
- Verificación final: lint sin errores; dev.log sin errores nuevos (los 500 antiguos eran previos al fix); panel de coordinación verificado en escritorio (1440x900) y móvil (390x844) con pestañas envolventes; datos de prueba limpiados (usuario test.email@ borrado).

Stage Summary:
- Nuevas funcionalidades OPERATIVAS y verificadas: paginación "Cargar más" (recetas y foro), bandeja de correos simulados del sistema (4 tipos de correo), resumen de coordinación con gráfico de actividad de 14 días.
- Estado BD: 10 usuarios, 9 recetas, 4 hilos, 4 publicaciones, 2 denuncias OPEN de demo, 3 correos de demo + notificaciones de demo. Panel de coordinador ahora con 4 pestañas: Resumen | Denuncias | Gestión de cuentas | Correos enviados.
- Cuentas demo (contraseña simbiosis123): coordinador@ / nutricionista@ / medico@ / paciente@ / cuidador@simbiosis.org.
- Riesgos/notas: (a) la paginación ordena en JS sobre el conjunto filtrado (aceptable a escala demo; migrar a ORDER BY en SQL si crece); (b) los correos son simulados (registrados en BD, no se envía nada real); (c) tras db:push recordar reiniciar el dev server.
- Recomendaciones siguiente ronda: exportación del plan semanal (lista de la compra) a PDF/CSV; recordatorios del plan (generar notificación con el menú del día); moderación: acciones rápidas en línea sin diálogo; i18n multi-idioma; paginar también comentarios/valoraciones del detalle de receta si crece.

---
Task ID: 9
Agent: main (cron webDevReview — ronda de revisión continua #4)
Task: QA de regresión + "Menú de hoy" (inicio + planificador) + exportar lista de la compra a CSV + acciones rápidas de moderación + imprimir receta

Work Log:
- QA de regresión con agent-browser (escritorio 1440x900 y móvil 390x844, modo claro y oscuro): home, recetas, detalle, login con chips demo, foro, consejos, diario de salud, planificador y panel de coordinación. Cero errores de consola en todas las vistas.
- Bug corregido: la receta «Puré de zanahoria y manzana» (creada en la demo E2E de la ronda 6) estaba con image:'' → generada foto con IA (z-ai image CLI, 1024x1024, public/images/recipes/pure-zanahoria.png) y asignada en BD. Las 9 recetas tienen foto.
- NUEVO: widget «Tu menú de hoy» en la página de inicio (home-view.tsx):
  - Para usuarios con sesión: tarjeta con degradado suave (borde primary/25) tras el banner de estadísticas. Cabecera con icono calendario, fecha larga es-ES ("miércoles, 16 de septiembre") y botón "Ver plan completo".
  - 4 franjas del día (desayuno/comida/cena/snack) con iconos de colores (ámbar/esmeralda/teal/naranja): si hay receta → clicable al detalle; si no → "Hueco libre" punteado que lleva al planificador. Mensaje de estado vacío diferenciado (plan vacío vs. día vacío). Skeletons de carga. Oculto para visitantes anónimos.
  - El día actual se calcula con (getDay()+6)%7 (lunes=0) tras montar (setTimeout 0) para evitar mismatch de hidratación y la regla react-hooks/set-state-in-effect.
- NUEVO en el planificador (plan-view.tsx):
  - Tarjeta del día actual resaltada: badge ámbar "Hoy" junto al nombre del día + ring-2 ring-primary/30 + shadow.
  - Exportación de la lista de la compra a CSV: botón "CSV" junto a "Copiar lista". CSV cliente con BOM UTF-8, separador ";" y campos entrecomillados/escapados (compatible Excel-es), filename lista-compra-simbiosis-YYYY-MM-DD.csv. Verificada la lógica de escape en navegador; patrón idéntico al export del diario de salud.
- NUEVO: acciones rápidas de moderación en el panel de coordinación (coordinator-view.tsx):
  - En cada denuncia ABIERTA, fila de acciones en línea: "Desestimar" (directo, riesgo bajo), "Eliminar contenido" (con AlertDialog de confirmación que muestra el título del contenido y avisa de que notifica al autor), y "Revisar y actuar…" (diálogo completo con nota interna + suspensión de usuario, como antes).
  - resolve() acepta ahora nota explícita opcional (notaText) para las acciones rápidas sin diálogo; el diálogo sigue usando el textarea.
  - Flujos verificados E2E: desestimar rápido funciona (toast + lista actualizada) y el AlertDialog de retirada muestra/cancela correctamente. La denuncia de demo desestimada durante la prueba fue restaurada a OPEN (UPDATE SQL por id cmu3wkd2w003swx7o2nxwkdpy) para conservar el estado de demostración.
  - Nota técnica: bun CLI resolvió un @prisma/client erróneo (caché global 7.10.0 vs proyecto 6.19.x) al ejecutar scripts one-off fuera de node_modules → usar siempre cwd del proyecto; si hace falta, $executeRawUnsafe evita la validación de campos.
- NUEVO: "Imprimir receta" en el detalle (recipe-detail.tsx + globals.css):
  - Botón con icono Printer en la tarjeta de acciones (print:hidden para no salir en el papel). window.print().
  - Hoja de estilos @media print en globals.css: patrón visibility (body * hidden; .print-recipe visible; posición absoluta ancho completo), @page margin 16mm, fondo blanco y texto stone-900 forzados, bordes stone-300, sin sombras, imagen limitada a 90mm. La columna principal lleva .print-recipe; las tarjetas de Valoraciones y Comentarios llevan print:hidden.
  - Verificado con agent-browser pdf (render usa print media): página 1 con foto/badges/título/meta/ingredientes y página 2 con preparación; sin navbar, sidebar, comentarios ni footer.
- Incidencia de entorno resuelta: tras editar globals.css el dev server servía el chunk CSS obsoleto (0 reglas print). Reinicio con cache clear (.next/cache + .next/static) + touch de los fuentes + petición de recompilación forzada lo solucionó; patrón para futuras ediciones de CSS "no hot-reloaded".
- Limpieza: eliminados los scripts one-off prisma/fix-pure-image.ts, prisma/restore-report.ts y prisma/reports-dbg.ts tras su uso. bun run lint sin errores. dev.log sin errores de runtime. /api/stats: 10 usuarios, 9 recetas, 33,3 % pro, 4,5/5, 100 % satisfacción.

Stage Summary:
- Nuevas funcionalidades OPERATIVAS y verificadas: widget "Tu menú de hoy" en inicio, resaltado "Hoy" en el planificador, exportación CSV de la lista de la compra, acciones rápidas de moderación (desestimar en línea + retirar contenido con confirmación) e impresión limpia de recetas.
- Estado BD: 10 usuarios, 9 recetas (todas con foto), 4 hilos, 4 publicaciones, 1 denuncia OPEN de demo (respuesta riesgosa, restaurada tras la prueba), 2 DISMISSED + 1 RESOLVED históricas, correos y notificaciones de demo intactos. El modo oscuro ya existía (ThemeProvider en page.tsx + toggle en navbar) y se revalidó sin problemas.
- Cuentas demo (contraseña simbiosis123): coordinador@ / nutricionista@ / medico@ / paciente@ / cuidador@simbiosis.org.
- Riesgos/notas: (a) al editar globals.css puede hacer falta touch + recarga forzada o reinicio con borrado de .next/cache para que Turbopack resirva el CSS; (b) bun CLI + scripts one-off fuera del proyecto resuelven mal @prisma/client (usar cwd del proyecto o SQL crudo); (c) la descarga del CSV no se pudo verificar con fichero en disco en el sandbox headless (blob + anchor click), pero el contenido/escape se validó por eval y el patrón es el mismo que el export del diario verificado en la ronda 7.
- Recomendaciones siguiente ronda: notificación/recordatorio programado con el menú del día (cron interno o al primer arranque del día); exportar el PLAN completo (7 días) a PDF imprimible reutilizando el patrón @media print; i18n multi-idioma (el doc pide decidir idiomas); paginar comentarios/valoraciones si crecen; test de accesibilidad (aria-live en toasts ya cubierto por sonner, revisar foco en diálogos anidados).

---
Task ID: 10
Agent: main (cron webDevReview — ronda de revisión continua #5)
Task: QA de regresión + recordatorio diario del menú + imprimir plan semanal + copiar día del plan + contadores animados + botón "volver arriba" + decisión de idiomas

Work Log:
- QA de regresión con agent-browser (escritorio 1440x900, móvil 390x844, claro/oscuro): todas las vistas sin errores de consola. Proyecto estable al inicio de la ronda.
- NUEVO: recordatorio diario del menú del día (tipo de notificación PLAN):
  - API `POST /api/plan/remind` (nuevo route): calcula el día actual (lunes=0), si hay recetas planificadas hoy y aún no se ha notificado HOY (deduplicación por fecha con findFirst type=PLAN createdAt>=inicio del día), crea una notificación "Tu menú de hoy" con el resumen "Desayuno: X · Comida: Y · Cena: Z" y linkView 'plan'. Devuelve {created, reason} (EMPTY_TODAY / ALREADY_NOTIFIED).
  - home-view (TodayMenuCard): tras cargar el plan, llama al endpoint una sola vez por montaje (ref guard) y muestra un toast sonner con el resumen durante 8 s si se creó. Best-effort: fallos silenciosos.
  - types.ts: añadido 'PLAN' al union NotificationType; notification-bell: meta PLAN con CalendarCheck en lime (distinto del ámbar de RATING) y 'plan' añadido a VALID_LINK_VIEWS para el deep-link.
  - Verificado E2E: plan vacío hoy → sin toast; rellenado hoy (miércoles) vía API → recarga → toast con el menú + notificación en la campana con icono lima y punto sin leer; recarga de nuevo → sin toast (deduplicado OK); clic en la notificación → navega al plan y limpia el badge. curl sin sesión → 401 correcto.
- NUEVO: imprimir el plan semanal (patrón @media print existente generalizado):
  - plan-view: botón "Imprimir plan" (Printer) junto a "Vaciar semana"; el contenedor de la rejilla + lista de la compra lleva .print-plan / .print-plan-layout y la rejilla interna .print-plan-grid; cabecera exclusiva de impresión (hidden print:block) con título, semana es-ES y nº de recetas; botones interactivos (quitar/añadir/copiar/CSV/copiar lista/contador de marcados) con print:hidden.
  - globals.css: reglas .print-plan (visibilidad, posición absoluta, colores forzados stone-900/bordes stone-300), .print-plan-layout display:block, rejilla a 2 columnas con gap 6pt, break-inside: avoid por día y listas sin max-height en papel.
  - Verificado con agent-browser pdf: página 1 con cabecera + 7 días en 2 columnas (sin navbar/sidebar/botones), página 2 con el día restante + lista de la compra completa (sin recorte por el scroll).
- NUEVO: copiar el menú de un día a otro (plan-view):
  - Botón Copy (ghost, size-7, print:hidden) en la cabecera de cada día con recetas; Popover con los otros 6 días y contador (N/4) del destino; copyDay() hace PUT /api/plan en paralelo para las franjas de origen (sobrescribe el destino), refresca sin spinner (fetchPlan separado de load) y toast con el resultado.
  - Verificado E2E: menú del miércoles copiado al jueves → toast "Menú del miércoles copiado al jueves (3 recetas)", jueves 3/4 con las mismas recetas y lista de la compra recalculada (badge 6 recetas, contadores ×2). Datos de demo dejados así (miércoles+hoy jueves rellenos, realistas).
- Bug corregido: desbordamiento horizontal del planificador en móvil (390 px): las tarjetas de días con recetas medían min-content 424 px (el botón de título con truncate no limita el tamaño intrínseco en flex anidados) porque la rejilla diaria no tenía columna explícita en móvil (columna implícita auto). Añadido grid-cols-1 a la rejilla de días y al contenedor principal (minmax(0,1fr) fija el mínimo a 0). Verificado scrollWidth = clientWidth = 390 tras el fix. El bug era previo a esta ronda (no lo causaba el botón copiar).
- Pulido visual (obligatorio de la ronda):
  - StatsBanner: contadores animados al cargar (AnimatedNumber con rAF, ease-out 900 ms, respeta prefers-reduced-motion, numEs + decimales + sufijo), tabular-nums y hover:shadow-md en las tarjetas.
  - Nuevo componente scroll-to-top.tsx: botón flotante "Volver arriba" (aparece a los 600 px, scroll suave, framer-motion entrada/salida, fondo blur, safe-area-inset-bottom, print:hidden) montado globalmente en page.tsx.
  - about-dialog: decisión de idiomas registrada en la ficha del proyecto ("Idiomas: la interfaz se ofrece en español (es-ES), decisión de alcance de la v1 con arquitectura preparada para traducciones") — cubre la exigencia del doc v2.2 de decidir los idiomas.
- Nota de lint: react-hooks/set-state-in-effect en el rama reduced-motion de AnimatedNumber → resuelto unificando la animación con duration=0 (mismo camino rAF).
- Verificación final: bun run lint sin errores; dev.log sin errores; barrido de errores de consola en home/recetas/foro/consejos/salud/plan/perfil en oscuro; diálogo Acerca verificado con el nuevo texto.

Stage Summary:
- Nuevas funcionalidades OPERATIVAS y verificadas: recordatorio diario del menú (notificación PLAN + toast con deduplicación diaria), impresión del plan semanal (hoja limpia a 2 columnas + lista de la compra), copiar el menú de un día a otro, contadores animados de estadísticas y botón "volver arriba".
- Bug resuelto: overflow horizontal del planificador en móvil (<640 px) con días rellenos.
- Estado BD: 10 usuarios, 9 recetas, 4 hilos, 4 publicaciones, 2 denuncias OPEN de demo; plan de Marta con miércoles y jueves rellenos (6 recetas) y 1 notificación PLAN de demo (leída); correos y notificaciones anteriores intactos. No hubo cambios de esquema.
- Cuentas demo (contraseña simbiosis123): coordinador@ / nutricionista@ / medico@ / paciente@ / cuidador@simbiosis.org.
- Riesgos/notas: (a) el recordatorio depende de que el usuario abra la app (no hay cron real); máximo 1 notificación PLAN por día y solo si hay menú para hoy; (b) la impresión del plan reutiliza el truco de visibility: si el usuario imprime desde otra vista, no afecta (solo .print-recipe/.print-plan); (c) el desbordamiento del truncate en flex anidados puede repetirse en otros grids implícitos sin grid-cols-1 — revisar si se añaden.
- Recomendaciones siguiente ronda: plantillas de menú (guardar/recuperar planes con nombre); recordatorio programado real (cron interno del mini-servidor o endpoint con token para tareas programadas); modo "consejo del nutricionista" al registrar síntomas altos en el diario; i18n real (esquema de traducciones ya decidido el alcance); accesibilidad focal en popovers anidados.

---
Task ID: 11
Agent: main (cron webDevReview — ronda de revisión continua #6, trace 1a0a97dc374f8251-web-cron-review-202609162101)
Task: QA de regresión + plantillas de menú + consejo de salud personalizado + receta destacada de la semana + fixes visuales

Work Log:
- QA de regresión inicial con agent-browser (escritorio 1440x900 y móvil 390x844): home, recetas, foro, consejos, diario, planificador y panel de coordinación sin errores de consola. Proyecto estable al inicio de la ronda → se decidió proponer nuevas funcionalidades.
- NUEVO: plantillas de menú (guardar/recuperar planes semanales con nombre):
  - Modelo `PlanTemplate` (name, days como JSON string [{day,slot,recipeId}], userId Cascade, @@index([userId, createdAt])) + db push + reinicio del dev server (el cliente Prisma obsoleto daba `db.planTemplate is undefined` hasta reiniciar).
  - APIs: GET/POST /api/plan/templates (listar con recipeCount; guardar el plan actual con nombre, máx. 20 plantillas, nombre ≤60, si el nombre ya existe ACTUALIZA la plantilla y avisa con `updated:true`); DELETE /api/plan/templates/[id] (propietario); POST /api/plan/templates/[id]/apply (sustituye el plan en transacción deleteMany+createMany, valida día 0-6/slot válidos, omite recetas no publicadas, deduplica por hueco day:slot y devuelve el plan completo + `removed` nº de recetas retiradas omitidas).
  - UI en plan-view: botón "Guardar como plantilla" (Bookmark, solo con plan no vacío) y "Mis plantillas" (LayoutTemplate, siempre visible); diálogo de guardado con input (Enter también guarda) y aviso de sobrescritura; diálogo de plantillas con lista (icono, nombre, N recetas, fecha es-ES), botón Aplicar (si el plan actual tiene recetas pide confirmación en AlertDialog mostrando ambas cifras) y papelera con confirmación; estado vacío ilustrado. Tras aplicar: toast con nombre + nº recetas y plan refrescado desde la respuesta.
  - Verificado E2E en navegador (Lucía): aplicar con confirmación (14→14), guardar nueva plantilla con nombre, aplicar de nuevo; por curl: guardar/listar/limpiar plan/aplicar (14 restauradas)/eliminar.
- NUEVO: consejo de salud personalizado (GET /api/health/insights):
  - Analiza el diario (60 últimos registros): media de síntomas de los últimos 7 días vs. 7 previos, días con síntomas ≥7, tendencia de peso (últimos 8 registros con peso). Niveles: alert (≥2 días altos, media ≥6,5 o empeora ≥2), watch (1 día alto, media ≥4 o empeora ≥1), positive (resto). Devuelve title/message/tips (3 pautas por nivel), suggestedTags (p. ej. alert → Baja en residuos/Fácil digestión/Hidratante), suggestedSuitable (Brote activo/leve/Remisión) y stats para la UI.
  - health-view: nueva tarjeta "InsightCard" tras el banner informativo, con gradiente por nivel (esmeralda/ámbar/rosa en claro y oscuro), icono Lightbulb, badge de estado (Estado favorable/Para vigilar/Merece atención), pautas con viñetas de color, badges de mini-estadísticas (registros de la semana, media síntomas, Δpeso) y botones "Ver recetas aptas" (deep-link a recetas con la primera etiqueta preseleccionada) y "Consejos de profesionales". Skeleton mientras carga; best-effort si falla. Fetch tras load() solo si hay entradas.
  - BUG CORREGIDO durante la prueba: la ventana de "últimos 7 días" excluía el registro de HOY (comparación estricta contra medianoche; las fechas se guardan a medianoche UTC) → highDays daba 1 en vez de 2 y nivel watch en vez de alert. Reescrito con dayStart() local por ambos lados (t<=hoy incluido). Re-verificado: 2 entradas altas → level alert.
- NUEVO: receta destacada de la semana (GET /api/recipes/featured):
  - Selección determinista y rotativa: PUBLISHED ordenadas por avgRating→ratingCount→favoritos→fecha; se elige la posición (nº semana ISO - 1) % candidatas, así cada semana rota y con pocas recetas siempre hay una.
  - home-view: nueva sección entre el banner de estadísticas y "Tu menú de hoy": gran tarjeta horizontal (imagen con hover-zoom + badge ámbar "Receta de la semana" con Sparkles; título, autor con avatar y rol, fecha relativa, badge de categoría, descripción line-clamp-2, hasta 3 etiquetas, footer con ★ media (N valoraciones), tiempo, raciones y "Ver receta →" que se desplaza al hover). Toda la tarjeta clicable con focus/teclado (Enter/Espacio). Se oculta si no hay recetas.
- Pulido visual (obligatorio de la ronda) y fixes:
  - Fix: el select de autoría en recetas mostraba "Todas las autoría:" truncado → etiqueta "Autorías: todas" (corta y clara).
  - Fix (regresión introducida al añadir botones): en móvil (<400px) "Vaciar semana" quedaba fuera de pantalla (right=540 > 390) porque el grupo de botones no envolvía → flex-wrap en el grupo; verificado right=321 <= 390.
  - Plantilla demo sembrada para Lucía: "Mi semana tipo en remisión" (14 recetas).
- Datos tras la ronda: se limpiaron los registros de salud y la plantilla de QA ("Semana de prueba QA" eliminada, entradas de prueba borradas); la entrada demo del 16-sep de Lucía (síntomas 3) se restauró tras borrarse por error en la limpieza (mismos valores). El plan de Lucía conserva sus 14 recetas (2 huecos del lunes quedaron con «Sopa de fideos casera» de la prueba, dato realista: ya la tenía en desayuno/snack).
- Verificación final: bun run lint sin errores; barrido de consola en las 6 vistas (listener de error/unhandledrejection vacío); /api/stats correcto (10 usuarios, 9 recetas, 33,3 % pro, 4,5/5, 100 % satisfacción); móvil 390px sin overflow horizontal en home/plan.

Stage Summary:
- Nuevas funcionalidades OPERATIVAS y verificadas: plantillas de menú (guardar con nombre/actualizar/aplicar con confirmación/eliminar + omisión de recetas retiradas), consejo de salud personalizado de 3 niveles con pautas y deep-link a recetas filtradas, y receta destacada de la semana con rotación ISO automática.
- Bugs corregidos: ventana temporal del insight excluía el registro de hoy (afectaba al nivel calculado); "Vaciar semana" cortado en móvil en el planificador; texto truncado "Todas las autoría:" en recetas.
- Esquema BD: AÑADIDO modelo PlanTemplate (único cambio de esquema; resto intacto). Estado: 10 usuarios, 9 recetas, 4 hilos, 4 publicaciones, 9 entradas de salud de Lucía restauradas, 1 plantilla demo (Lucía), 2 denuncias OPEN de demo, correos/notificaciones anteriores intactos.
- Cuentas demo (contraseña simbiosis123): coordinador@ / nutricionista@ / medico@ / paciente@ / cuidador@simbiosis.org.
- Riesgos/notas: (a) tras cualquier `db:push` hay que reiniciar el dev server o las rutas nuevas fallarán con "X is undefined"; (b) la rotación de la destacada es estable pero con 9 recetas y pocas valoraciones el orden puede cambiar al añadir valoraciones (la receta destacada puede variar antes de la semana siguiente — aceptable); (c) el insight es heurístico orientativo y muestra disclaimer; (d) los comparadores por día usan medianoche local — si el servidor cambia de zona horaria los límites siguen siendo coherentes por construcción.
- Recomendaciones siguiente ronda: compartir plantillas públicas o "plantillas de la comunidad" de profesionales; sugerir recetas al planificador según fase (brote/remisión) usando suitableFor; marcar "hecha" una receta del día y reflejarlo en el diario; paginar comentarios/valoraciones si crecen; auditoría de accesibilidad con lector de pantalla (foco en diálogos anidados); i18n real si el doc lo exige en L2.

---
Task ID: 12
Agent: main (cron webDevReview — ronda de revisión continua #7, trace 1a0a97dc374f8251-web-cron-review-202609162126)
Task: QA de regresión + sugerencias inteligentes al planificador + marcar comidas como cocinadas + pulido visual

Work Log:
- QA de regresión inicial con agent-browser (escritorio 1440x900): home, recetas, detalle de receta, foro, consejos, diario de salud, planificador, panel de coordinación (4 pestañas), login/logout con chips demo. Cero errores de consola reales; una entrada «plan-view.tsx:305 Parsing ecmascript source code failed» en la consola del navegador resultó ser un buffer obsoleto de una sesión anterior (0 apariciones en dev.log y la vista compila/renderiza bien) — descartada tras limpiar el buffer de consola. Modo oscuro y móvil 390x844 sin overflow (scrollWidth=clientWidth=390). Proyecto ESTABLE al inicio de la ronda → se decidieron nuevas funcionalidades.
- NUEVO: sugerencias inteligentes al planificador (integración salud → plan, recomendación de la ronda 11):
  - GET /api/plan/suggestions?slot=…: infiere la fase actual del usuario a partir del último registro del diario (síntomas 0-2 → Remisión, 3-5 → Brote leve, 6-10 → Brote activo; sin registros → null). Puntúa las recetas PUBLISHED: +50 si suitableFor encaja con la fase (BROTE_ACTIVO→[Brote activo, Brote leve], BROTE_LEVE→[Brote leve, Remisión], REMISION→[Remisión]), +20 si la categoría encaja con la franja (Desayuno/Comida/Cena/Snack+Postre), +5×valoración media, +2×favoritos, +5 profesional, pequeño impulso de frescura. Excluye recetas ya planificadas y devuelve top 6 con matchesPhase/matchesCategory/inPlan.
  - RecipePickerDialog ampliado: al abrir cualquier hueco carga sugerencias automáticamente (sin escribir nada) — sección «Sugerencias para {franja}» con badge de fase coloreado (rosa=activo, ámbar=leve, esmeralda=remisión) o «Sin datos del diario», hasta 4 tarjetas con imagen, «✓ Apta para tu fase», categoría, tiempo y valoración; separador «Todas las recetas» y debajo el listado/búsqueda de siempre; si no hay sugerencias muestra motivo (todo ya planificado o sin datos del diario, con invitación a registrarlo).
- NUEVO: marcar comidas como «cocinadas» en el plan (recomendación de la ronda 11):
  - Schema: MealPlanItem.done Boolean @default(false) + db push + reinicio del dev server (setsid).
  - PATCH /api/plan/[id] (propietario, valida boolean, 404 si no es tuyo) + PUT /api/plan ahora reinicia done a false al sustituir la receta de un hueco (la nueva no se ha cocinado) — caso borde detectado y corregido en esta ronda.
  - plan-view: botón CheckCircle2 junto a cada comida planificada (toggle con actualización optimista + revertir si falla + toast «¡Buen provecho!»), título tachado con decoración esmeralda y fila con fondo/tinte esmeralda cuando está hecha; badge esmeralda «✓N» por día en la cabecera de cada tarjeta; nueva franja de progreso semanal sobre la rejilla («Comidas cocinadas esta semana — X de Y») con barra degradada animada, role=progressbar con aria-valuenow/max y gradiente esmeralda.
  - home-view (Tu menú de hoy): las comidas de hoy marcadas se muestran tachadas con mini badge «Cocinada» esmeralda (los datos ya llegaban por /api/plan).
  - La impresión del plan incluye los checks y el badge de cocinadas (solo los botones X/añadir quedan ocultos).
- Pulido visual (obligatorio de la ronda): filas de franjas del plan con hover (border-primary/30 + bg-accent/40, solo si tienen receta y no está hecha), transiciones duration-200, icono de franja cambia a esmeralda cuando está cocinada, botón check con hover:scale-110 + color esmeralda en reposo, focus-visible:ring-2 añadido a los botones de título de receta del plan y al toggle de cocinada (accesibilidad teclado), franja de progreso con gradiente from-emerald-500/10, secciones de sugerencias con gradiente from-primary/[0.06].
- Verificación E2E completa: API sugerencias (fase Brote leve para Lucía con síntomas 3, orden por puntuación, exclusión de planificadas, slot inválido→error, sin sesión→401), PATCH done (true/false/valor inválido/sin sesión), PUT reinicia done, selector con sugerencias visible (badge «Brote leve», 2 tarjetas «Apta para tu fase»), añadir sugerencia al plan (Bizcocho al snack del miércoles, 15 items), toggle cocinada desde la UI (progreso 0→1, toast, badge del día, tachado), badge «Cocinada» en el menú de hoy del home, persistencia tras recarga, impresión PDF con checks y badge, modo oscuro y claro impecables, móvil 390px sin overflow.
- Estado demo dejado a propósito: plan de Lucía con 15 recetas (añadido Bizcocho al snack del miércoles vía sugerencia) y la comida del miércoles (Patatas y zanahoria al vapor) marcada como cocinada → progreso «1 de 15» visible. Limpieza: sin usuarios/recetas/hilos de prueba creados; script one-off de restauración borrado tras uso.
- bun run lint sin errores; barrido final de consola en home/recetas/foro/consejos/salud = 0 errores; dev.log sin errores de runtime; /api/stats correcto (10 usuarios, 9 recetas, 33,3 % pro, 4,5/5, 100 % satisfacción).

Stage Summary:
- Nuevas funcionalidades OPERATIVAS y verificadas: (1) sugerencias inteligentes al planificador que combinan fase del diario + franja + valoraciones (integración directa entre los módulos 3 y 4, alineada con BO-02); (2) marcar comidas como cocinadas con progreso semanal, badges por día y reflejo en «Tu menú de hoy».
- Esquema BD: AÑADIDO MealPlanItem.done (único cambio de esquema). Estado: 10 usuarios, 9 recetas, 4 hilos, 4 publicaciones, 15 items en el plan de Lucía (1 cocinada hoy), 2 denuncias OPEN de demo, plantillas/correos/notificaciones anteriores intactos.
- Cuentas demo (contraseña simbiosis123): coordinador@ / nutricionista@ / medico@ / paciente@ / cuidador@simbiosis.org.
- Riesgos/notas: (a) tras db:push hay que reiniciar el dev server (hecho en esta ronda con setsid); (b) la fase inferida usa solo el ÚLTIMO registro del diario (si el usuario registra un día atípico cambian las sugerencias — heurística orientativa, igual que el insight); (c) la puntuación es determinista y estable, con impulso de frescura decreciente de 10 días.
- Recomendaciones siguiente ronda: registrar «comidas cocinadas» como entrada automática sugerida en el diario (enlazar done → HealthEntry); plantillas de la comunidad publicadas por profesionales; filtrar sugerencias también por etiquetas del insight de salud (suggestedTags ya existe en /api/health/insights — unir ambos motores); estadísticas de cocinadas en el panel de coordinación; accesibilidad de diálogos anidados (foco).

---
Task ID: 13
Agent: main (cron webDevReview — ronda de revisión continua #8, trace 1a0a97dc374f8251-web-cron-review-202609162146)
Task: QA de regresión + plantillas de la comunidad de profesionales + consejo de salud integrado en sugerencias + aviso diario al marcar comidas + stats de plan en coordinación + pulido visual

Work Log:
- QA de regresión inicial con agent-browser (sesión nueva, escritorio 1440x900 y móvil 390x844): home, recetas, detalle, foro, consejos, diario, planificador y panel de coordinación — 0 errores de consola en todas las vistas. Los errores «FeaturedRecipeCard is not defined»/«cn is not defined» vistos al reaprovechar una sesión vieja del navegador eran chunks HMR obsoletos (trazas con scheduleRefresh); verificado contra el código fuente (import de cn en línea 51 y función izada) y con sesión fresca: 0 errores. Proyecto ESTABLE al inicio de ronda → nuevas funcionalidades.
- NUEVO: plantillas de la comunidad (profesionales publican, pacientes aplican):
  - Schema: `PlanTemplate.description String?`, `PlanTemplate.isPublic Boolean @default(false)` + índice `@@index([isPublic, createdAt])` + db push + reinicio del dev server.
  - APIs: GET /api/plan/templates/community (galería pública con autor, nº recetas, nº días, descripción; exige sesión); POST /api/plan/templates/[id]/publish (publicar/retirar: solo el propietario; para publicar exige rol NUTRITIONIST/DOCTOR/COORDINATOR — 403 si no —, descripción ≤200 obligatoria — 400 si falta — y plantilla con recetas; retirar permitido al propietario siempre); POST /api/plan/templates/[id]/apply ahora permite aplicar plantillas propias O públicas (404 en otro caso).
  - UI en plan-view: diálogo «Plantillas de menú» con pestañas «Mis plantillas» | «Comunidad» (Tabs); en Mis plantillas, badge «En la comunidad» y botón globo Publicar/Retirar solo para profesionales/coordinación (más nota informativa); diálogo de publicación con Textarea (contador /200, botón deshabilitado sin descripción); galería de comunidad con tarjetas ámbar degradadas, avatar+nombre+rol del autor, badge «Validada por profesionales», descripción line-clamp-2, footer con recetas/días/fecha y Aplicar (con confirmación si el plan actual no está vacío). Estado vacío ilustrado.
  - Verificado E2E en navegador (coordinadora Marta): publicar con descripción → badge «En la comunidad» → aparece en Comunidad (3 tarjetas) → retirar → eliminar plantilla QA (estado de demo restaurado). Verificado por curl: 403 para paciente, 400 sin descripción, 200 al publicar, apply de plantilla ajena pública OK, 404 tras retirar. Lucía aplicó la plantilla de Elena (23 recetas, confirmación incluida) y restauró la suya después.
- NUEVO: motor de consejo de salud compartido (integración diario → sugerencias, recomendación de la ronda 12):
  - Extraída la heurística del insight a `src/lib/health-insights.ts` (computeHealthInsight); /api/health/insights la consume sin duplicar lógica.
  - GET /api/plan/suggestions ahora suma `insightTags` (etiquetas pautadas según el nivel) a la puntuación (+14 por etiqueta, máx. 2) y devuelve `insightTags`, `insightLevel`, `matchesInsight` y `matchedTags` por receta.
  - UI del selector: badge ámbar «✨ Te puede sentar bien» en las sugerencias que encajan con el consejo (title con las etiquetas coincidentes). Verificado E2E: Salmón con 133,3 pts (insight, +28 por Antiinflamatoria+Rica en proteínas) vs Puré 75 pts (sin etiquetas); badge visible en la tarjeta de sugerencia. Degradación correcta sin datos de diario (nutri: insightTags=[] y sin badges).
- NUEVO: aviso «registrar en el diario» al marcar comidas (recomendación de la ronda 12):
  - GET /api/health/has-today (nuevo): true si ya hay entrada del diario con fecha de hoy (comparación por medianoche local, tolerante a zonas horarias).
  - plan-view: al marcar una comida como cocinada por primera vez en la sesión, si no hay registro de hoy muestra toast con descripción «¿Cómo te ha sentado?…» y botón de acción «Registrar en el diario» que navega a la vista de salud (duración 9 s, una sola vez por sesión; si la comprobación falla no molesta). Verificado E2E con Elena (sin diario): toast con acción visible en captura; progreso «1 de 1 (100 %)».
- NUEVO: estadísticas de plan en el panel de coordinación (recomendación de la ronda 12): /api/coordinator/stats añade plannedMeals, cookedMeals y publicTemplates; el Resumen muestra 9 tarjetas (nuevas: «Comidas planificadas» cian, «Comidas cocinadas» verde, «Plantillas de la comunidad» violeta). Verificado en navegador: 15/1/2 con los datos de demo.
- BUG CORREGIDO (descubierto en QA): desbordamiento horizontal del diálogo de plantillas (~148 px) en escritorio y móvil: el DialogContent de shadcn es `grid` con track implícito `auto`, que se infla con el max-content de los textos (line-clamp y filas sin w-full) y desborda el diálogo. Fix: `grid-cols-[minmax(0,1fr)]` en los tres diálogos del planificador (plantillas, publicar, selector de receta) + `overflow-hidden` en la columna de texto de las tarjetas de comunidad. Verificado: 0 elementos desbordando el diálogo en 1440 px y 390 px (antes 148 px/83 px).
- Pulido visual (obligatorio de la ronda): etiquetas de las tarjetas de stats del panel ahora envuelven a 2 líneas (se acabó el «Denuncias a…» truncado) + hover:shadow-sm; porcentaje en el progreso «Comidas cocinadas esta semana — X de Y (N %)»; tarjetas de comunidad con degradado ámbar y badge de validación; pestañas del diálogo con iconos; fix menor: al cerrar tras aplicar una plantilla se resetea a «Mis plantillas» y se invalida la caché de comunidad (antes quedaba la pestaña Comunidad activa).
- Datos demo sembrados: 2 plantillas públicas («Semana suave en remisión · Equipo de nutrición» de Elena Ferrer, 23 recetas; «Plan transitorio para brote · Dr. Sanz», 21 recetas) + descripción en la plantilla personal de Lucía. Añadido el mismo contenido a prisma/seed.ts (con deleteMany idempotente de plantillas) y script one-off prisma/seed-community-templates.ts para la BD viva (borrado tras usarlo).
- NOTA DE ENTORNO (importante para futuras rondas): tras `kill` del dev server original, los procesos lanzados con `setsid ... &` mueren al terminar la llamada Bash del agente (el sandbox siega el árbol de procesos). Solución fiable: doble fork huérfano — `( setsid bash -c 'cd /home/z/my-project && exec bun run dev' </dev/null >/dev/null 2>&1 & )` — el proceso queda reparentado a PID 1 durante la propia llamada y sobrevive (verificado entre llamadas). Tras db:push hay que reiniciar el dev server (hecho) o las rutas nuevas fallan con campos desconocidos del cliente Prisma.
- Verificación final: bun run lint sin errores; dev.log sin errores; barrido de consola en las 6 vistas + panel = 0 errores; móvil 390 px sin overflow (sw=cw=390) en home y plan; modo oscuro verificado en planificador y galería de comunidad; /api/stats correcto (10 usuarios, 9 recetas, 33,3 % pro, 4,5/5, 100 % satisfacción).

Stage Summary:
- Nuevas funcionalidades OPERATIVAS y verificadas: (1) plantillas de la comunidad — los profesionales publican sus menús tipo con descripción y los pacientes los aplican con un clic (conecta módulos 4/6 y refuerza BO-03/BO-06 y el criterio de contenido profesional); (2) sugerencias del planificador potenciadas con el consejo de salud personalizado (motor único compartido con el diario — BO-02); (3) aviso con acción directa para registrar el día en el diario justo al cocinar una comida del plan; (4) 3 nuevas métricas de plan en el Resumen del coordinador.
- Bugs corregidos: desbordamiento del diálogo de plantillas/selector (grid auto track) en escritorio y móvil; pestaña de plantillas que quedaba en «Comunidad» tras aplicar; etiquetas truncadas de stats.
- Esquema BD: AÑADIDOS PlanTemplate.description/isPublic + índice (único cambio). Estado: 10 usuarios, 9 recetas, 4 hilos, 4 publicaciones, 15 items en el plan de Lucía (1 cocinada hoy, restaurado exactamente tras las pruebas), 2 plantillas públicas + 1 personal de Lucía, 2 denuncias OPEN de demo, correos/notificaciones de demo intactos. Limpieza: plantilla QA de coordinación eliminada, plan de nutri vaciado, scripts one-off borrados.
- Cuentas demo (contraseña simbiosis123): coordinador@ / nutricionista@ / medico@ / paciente@ / cuidador@simbiosis.org.
- Riesgos/notas: (a) al publicar solo se exige descripción; la plantilla puede cambiar después (el nombre se actualiza con «Guardar como plantilla» y el contenido se re-aplica desde la galería tal cual estaba guardada — los cambios en el plan NO actualizan la plantilla publicada automáticamente); (b) el nudge del diario se muestra máx. 1 vez por sesión y depende de has-today; (c) el aviso de entorno del dev server (doble fork) es la vía fiable para reiniciarlo — el kill+setsid normal NO sobrevive entre llamadas del agente; (d) el insight de salud sigue siendo heurístico con disclaimer.
- Recomendaciones siguiente ronda: notificar (in-app/correo simulado) a los pacientes cuando un profesional publique una plantilla nueva; estadística «aplicadas N veces» para plantillas de la comunidad; editar una plantilla publicada desde la galería; versionar el plan vs plantilla (diff antes de aplicar); accesibilidad de diálogos anidados (foco en AlertDialog sobre Dialog); paginar comentarios/valoraciones si crecen.
