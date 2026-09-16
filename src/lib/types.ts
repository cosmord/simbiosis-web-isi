/**
 * Tipos compartidos del frontend de Simbiosis.
 * Reflejan las respuestas JSON de los endpoints /api/** (ver worklog.md).
 */

export type Role =
  | 'PATIENT'
  | 'CAREGIVER'
  | 'NUTRITIONIST'
  | 'DOCTOR'
  | 'COORDINATOR'

export type UserStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED'

export type ThreadCategory =
  | 'DIETA_Y_SINTOMAS'
  | 'RECETAS_Y_COCINA'
  | 'APOYO_EMOCIONAL'
  | 'DUDAS_GENERALES'

export type PublicationCategory =
  | 'NUTRICION'
  | 'ESTILO_DE_VIDA'
  | 'BIENESTAR_EMOCIONAL'
  | 'TRATAMIENTO'

export type ReportTargetType =
  | 'RECIPE'
  | 'COMMENT'
  | 'THREAD'
  | 'REPLY'
  | 'PUBLICATION'
  | 'USER'

export type ReportReason =
  | 'CONTENIDO_INADECUADO'
  | 'INFO_SALUD_RIESGOSA'
  | 'SPAM'
  | 'ACOSO'
  | 'OTRO'

export type ReportStatus = 'OPEN' | 'RESOLVED' | 'DISMISSED'

export interface User {
  id: string
  email: string
  name: string
  role: Role
  status: UserStatus | string
  bio: string | null
  createdAt: string
}

export interface RecipeAuthor {
  id: string
  name: string
  role: Role
}

export interface RecipeCardData {
  id: string
  title: string
  description: string
  image: string
  category: string
  tags: string[]
  suitableFor: string[]
  prepTime: number
  servings: number
  createdAt: string
  status?: string
  author?: RecipeAuthor
  isProfessional?: boolean
  avgRating: number
  ratingCount: number
  favoritesCount?: number
  favoriteByMe?: boolean
}

export interface RecipeSummary extends RecipeCardData {
  ingredients: string[]
  steps: string[]
  status: string
  author: RecipeAuthor
  isProfessional: boolean
}

export interface CommentItem {
  id: string
  content: string
  createdAt: string
  status: string
  author: RecipeAuthor
}

export interface RatingItem {
  id: string
  stars: number
  comment: string | null
  createdAt: string
  author: RecipeAuthor
}

export interface RecipeAuthorFull extends RecipeAuthor {
  bio: string | null
  createdAt: string
}

export interface RecipeDetailData extends RecipeSummary {
  author: RecipeAuthorFull
  comments: CommentItem[]
  ratings: RatingItem[]
  avgRating: number
  ratingCount: number
  favoritesCount: number
  myRating: { stars: number; comment: string | null } | null
  favoriteByMe: boolean
}

export interface ThreadAuthor {
  id: string
  name: string
  role: Role
  bio?: string | null
  createdAt?: string
}

export interface ThreadCardData {
  id: string
  title: string
  content: string
  category: ThreadCategory
  views: number
  createdAt: string
  author?: ThreadAuthor
  repliesCount: number
  lastActivityAt?: string
}

export interface ReplyItem {
  id: string
  content: string
  status: string
  createdAt: string
  author: RecipeAuthor
}

export interface ThreadDetailData {
  thread: {
    id: string
    title: string
    content: string
    category: ThreadCategory
    views: number
    status: string
    createdAt: string
  }
  author: ThreadAuthor
  replies: ReplyItem[]
  repliesCount: number
}

export interface PublicationCardData {
  id: string
  title: string
  content: string
  category: PublicationCategory
  createdAt: string
  author: RecipeAuthor
  likesCount: number
  likedByMe: boolean
}

export interface HealthEntryData {
  id: string
  date: string
  weight: number | null
  symptoms: number
  note: string | null
}

export interface TargetPreview {
  title?: string
  content?: string
  name?: string
  snippet: string
  image?: string
  role?: string
  status?: string
}

export interface ReportData {
  id: string
  targetType: ReportTargetType
  targetId: string
  reason: ReportReason
  details: string | null
  status: ReportStatus
  resolution: string | null
  createdAt: string
  reporter: { id: string; name: string; role: Role }
  targetPreview: TargetPreview | null
  resolvedBy: { id: string; name: string } | null
}

export interface StatsData {
  users: number
  recipes: number
  professionalRecipesPct: number
  avgRating: number
  ratingsCount: number
  threads: number
  publications: number
  satisfactionPct: number
}

export interface ProfileStats {
  recipes: number
  avgRatingReceived: number
  ratingsCount: number
  favorites: number
  threads: number
}

export interface ProfileMyRecipe {
  id: string
  title: string
  description: string
  image: string
  category: string
  tags: string[]
  suitableFor: string[]
  prepTime: number
  servings: number
  status: string
  createdAt: string
  avgRating: number
  ratingCount: number
  favoritesCount: number
}

export interface ProfileMyFavorite {
  id: string
  title: string
  description: string
  image: string
  category: string
  tags: string[]
  suitableFor: string[]
  prepTime: number
  servings: number
  createdAt: string
  author: RecipeAuthor
  avgRating: number
  ratingCount: number
  favoritesCount: number
}

export interface ProfileMyThread {
  id: string
  title: string
  content: string
  category: ThreadCategory
  views: number
  createdAt: string
  repliesCount: number
}

export interface ProfileData {
  user: User
  stats: ProfileStats
  myRecipes: ProfileMyRecipe[]
  myFavorites: ProfileMyFavorite[]
  myThreads: ProfileMyThread[]
}

export type CoordinatorUser = User

export const RECIPE_CATEGORIES = ['Desayuno', 'Comida', 'Cena', 'Snack', 'Postre'] as const

export const RECIPE_TAGS = [
  'Baja en residuos',
  'Fácil digestión',
  'Sin lactosa',
  'Sin gluten',
  'Antiinflamatoria',
  'Rica en proteínas',
  'Fibra soluble',
  'Hidratante',
] as const

export const SUITABLE_FOR = [
  'Brote activo',
  'Brote leve',
  'Remisión',
  'Crohn',
  'Colitis ulcerosa',
] as const

export const THREAD_CATEGORIES: { value: ThreadCategory; label: string }[] = [
  { value: 'DIETA_Y_SINTOMAS', label: 'Dieta y síntomas' },
  { value: 'RECETAS_Y_COCINA', label: 'Recetas y cocina' },
  { value: 'APOYO_EMOCIONAL', label: 'Apoyo emocional' },
  { value: 'DUDAS_GENERALES', label: 'Dudas generales' },
]

export const PUBLICATION_CATEGORIES: { value: PublicationCategory; label: string }[] = [
  { value: 'NUTRICION', label: 'Nutrición' },
  { value: 'ESTILO_DE_VIDA', label: 'Estilo de vida' },
  { value: 'BIENESTAR_EMOCIONAL', label: 'Bienestar emocional' },
  { value: 'TRATAMIENTO', label: 'Tratamiento' },
]

export const ROLE_LABELS: Record<Role, string> = {
  PATIENT: 'Paciente',
  CAREGIVER: 'Cuidador/a',
  NUTRITIONIST: 'Nutricionista',
  DOCTOR: 'Médico/a',
  COORDINATOR: 'Coordinador/a',
}

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'CONTENIDO_INADECUADO', label: 'Contenido inadecuado' },
  { value: 'INFO_SALUD_RIESGOSA', label: 'Información de salud riesgosa' },
  { value: 'SPAM', label: 'Spam' },
  { value: 'ACOSO', label: 'Acoso' },
  { value: 'OTRO', label: 'Otro' },
]

export const REPORT_TARGET_LABELS: Record<ReportTargetType, string> = {
  RECIPE: 'Receta',
  COMMENT: 'Comentario',
  THREAD: 'Hilo del foro',
  REPLY: 'Respuesta',
  PUBLICATION: 'Consejo de salud',
  USER: 'Usuario',
}

/* ------------------------- Planificador semanal ------------------------- */

export type PlanSlot = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'

export const PLAN_SLOTS: { value: PlanSlot; label: string; icon: 'sunrise' | 'sun' | 'moon' | 'cookie' }[] = [
  { value: 'BREAKFAST', label: 'Desayuno', icon: 'sunrise' },
  { value: 'LUNCH', label: 'Comida', icon: 'sun' },
  { value: 'DINNER', label: 'Cena', icon: 'moon' },
  { value: 'SNACK', label: 'Snack', icon: 'cookie' },
]

export const PLAN_DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export interface PlanRecipeSummary {
  id: string
  title: string
  image: string
  category: string
  ingredients: string[]
  prepTime: number
  servings: number
  author: RecipeAuthor
}

export interface PlanItemData {
  id: string
  day: number
  slot: PlanSlot
  recipe: PlanRecipeSummary
}

/* --------------------------- Notificaciones ------------------------------ */

export type NotificationType =
  | 'REPLY'
  | 'COMMENT'
  | 'RATING'
  | 'FAVORITE'
  | 'LIKE'
  | 'ACCOUNT'
  | 'MODERATION'
  | 'PLAN'

export interface NotificationData {
  id: string
  type: NotificationType
  title: string
  body: string
  linkView: string | null
  linkId: string | null
  read: boolean
  createdAt: string
}

export interface NotificationsResponse {
  notifications: NotificationData[]
  unread: number
}

/* ------------------------- Correos y estadísticas ------------------------ */

export type EmailKind = 'ACCOUNT_RECEIVED' | 'ACCOUNT_APPROVED' | 'ACCOUNT_SUSPENDED' | 'CONTENT_REMOVED'

export interface EmailLogData {
  id: string
  toEmail: string
  toUser: { id: string; name: string; role: Role } | null
  subject: string
  body: string
  kind: EmailKind
  createdAt: string
}

export interface CoordinatorStatsData {
  totals: {
    users: number
    recipes: number
    threads: number
    publications: number
    openReports: number
    resolvedReports: number
  }
  usersByRole: Record<string, number>
  usersByStatus: Record<string, number>
  activity: { date: string; label: string; users: number; recipes: number; threads: number }[]
}

/* --------------------------- Perfil público ----------------------------- */

export interface PublicProfileData {
  user: {
    id: string
    name: string
    role: Role
    bio: string | null
    createdAt: string
    isProfessional: boolean
  }
  stats: {
    recipes: number
    avgRating: number
    ratingsCount: number
    favorites: number
  }
  recipes: RecipeCardData[]
}
