/**
 * Helpers compartidos de serialización para las APIs de contenido (Task 2-b).
 * SQLite no soporta listas: ingredients/steps/tags/suitableFor se guardan como JSON string.
 */

/** Parsea un campo almacenado como JSON string. Devuelve [] si está vacío o es inválido. */
export function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return []
  try {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return parsed.map((item) => (typeof item === 'string' ? item : String(item)))
  } catch {
    return []
  }
}

/** Media de estrellas con 1 decimal (0 si no hay valoraciones). */
export function averageStars(stars: number[]): number {
  if (stars.length === 0) return 0
  const total = stars.reduce((sum, s) => sum + s, 0)
  return Math.round((total / stars.length) * 10) / 10
}

/** Forma mínima de una fila Recipe con las relaciones necesarias para serializar. */
export type RecipeWithRelations = {
  id: string
  title: string
  description: string
  image: string
  category: string
  ingredients: string
  steps: string
  tags: string
  suitableFor: string
  prepTime: number
  servings: number
  status: string
  createdAt: Date
  author: { id: string; name: string; role: string }
  ratings: { stars: number }[]
  favorites: { userId: string }[]
}

/**
 * Serializa una receta al formato del contrato:
 * arrays parseados + medias computadas + favoriteByMe (solo si hay sesión).
 */
export function serializeRecipe(recipe: RecipeWithRelations, currentUserId?: string) {
  return {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    image: recipe.image,
    category: recipe.category,
    ingredients: parseJsonArray(recipe.ingredients),
    steps: parseJsonArray(recipe.steps),
    tags: parseJsonArray(recipe.tags),
    suitableFor: parseJsonArray(recipe.suitableFor),
    prepTime: recipe.prepTime,
    servings: recipe.servings,
    createdAt: recipe.createdAt.toISOString(),
    status: recipe.status,
    author: recipe.author,
    isProfessional:
      recipe.author.role === 'NUTRITIONIST' || recipe.author.role === 'DOCTOR',
    avgRating: averageStars(recipe.ratings.map((r) => r.stars)),
    ratingCount: recipe.ratings.length,
    favoritesCount: recipe.favorites.length,
    favoriteByMe: currentUserId
      ? recipe.favorites.some((f) => f.userId === currentUserId)
      : false,
  }
}
