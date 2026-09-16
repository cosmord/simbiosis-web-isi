import { db } from '@/lib/db'
import { ok, requireUser } from '@/lib/api-helpers'

function parseJsonArray(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : []
  } catch {
    return []
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function avgOf(stars: number[]): number {
  if (stars.length === 0) return 0
  return round1(stars.reduce((sum, s) => sum + s, 0) / stars.length)
}

export async function GET() {
  const { user: auth, error } = await requireUser()
  if (error) return error

  const [recipes, favoriteRows, threads] = await Promise.all([
    db.recipe.findMany({
      where: { authorId: auth.id },
      orderBy: { createdAt: 'desc' },
      include: {
        ratings: { select: { stars: true } },
        _count: { select: { favorites: true } },
      },
    }),
    db.favorite.findMany({
      where: { userId: auth.id, recipe: { status: 'PUBLISHED' } },
      orderBy: { createdAt: 'desc' },
      include: {
        recipe: {
          include: {
            author: { select: { id: true, name: true, role: true } },
            ratings: { select: { stars: true } },
            _count: { select: { favorites: true } },
          },
        },
      },
    }),
    db.thread.findMany({
      where: { userId: auth.id, status: { not: 'REMOVED' } },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { replies: true } } },
    }),
  ])

  // Mis recetas (incluye las REMOVED con su status para que el autor vea la moderación)
  const myRecipes = recipes.map((r) => {
    const stars = r.ratings.map((x) => x.stars)
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      image: r.image,
      category: r.category,
      tags: parseJsonArray(r.tags),
      suitableFor: parseJsonArray(r.suitableFor),
      prepTime: r.prepTime,
      servings: r.servings,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      avgRating: avgOf(stars),
      ratingCount: stars.length,
      favoritesCount: r._count.favorites,
    }
  })

  const publishedStars = recipes
    .filter((r) => r.status === 'PUBLISHED')
    .flatMap((r) => r.ratings.map((x) => x.stars))

  // Mis favoritos (solo recetas publicadas)
  const myFavorites = favoriteRows.map((f) => {
    const r = f.recipe
    const stars = r.ratings.map((x) => x.stars)
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      image: r.image,
      category: r.category,
      tags: parseJsonArray(r.tags),
      suitableFor: parseJsonArray(r.suitableFor),
      prepTime: r.prepTime,
      servings: r.servings,
      createdAt: r.createdAt.toISOString(),
      author: r.author,
      avgRating: avgOf(stars),
      ratingCount: stars.length,
      favoritesCount: r._count.favorites,
    }
  })

  // Mis hilos del foro (excluye REMOVED) con número de respuestas
  const myThreads = threads.map((t) => ({
    id: t.id,
    title: t.title,
    content: t.content,
    category: t.category,
    views: t.views,
    createdAt: t.createdAt.toISOString(),
    repliesCount: t._count.replies,
  }))

  const stats = {
    recipes: myRecipes.filter((r) => r.status === 'PUBLISHED').length,
    avgRatingReceived: avgOf(publishedStars),
    ratingsCount: publishedStars.length,
    favorites: myFavorites.length,
    threads: threads.length,
  }

  return ok({ user: auth, stats, myRecipes, myFavorites, myThreads })
}
