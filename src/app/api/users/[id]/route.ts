import { db } from '@/lib/db'
import { ok, fail } from '@/lib/api-helpers'
import { publicUser, PROFESSIONAL_ROLES } from '@/lib/auth'
import { parseJsonArray, averageStars } from '@/lib/serialize'

/** GET /api/users/[id] — perfil público de un autor con sus recetas publicadas. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const user = await db.user.findUnique({
    where: { id },
    include: {
      recipes: {
        where: { status: 'PUBLISHED' },
        include: {
          author: { select: { id: true, name: true, role: true } },
          ratings: { select: { stars: true } },
          _count: { select: { favorites: true, ratings: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!user) return fail('No se encontró este perfil.', 404)

  const allStars = user.recipes.flatMap((r) => r.ratings.map((rt) => rt.stars))
  const profile = {
    user: {
      id: publicUser(user).id,
      name: publicUser(user).name,
      role: publicUser(user).role,
      bio: publicUser(user).bio,
      createdAt: publicUser(user).createdAt,
      isProfessional: PROFESSIONAL_ROLES.includes(user.role as (typeof PROFESSIONAL_ROLES)[number]),
    },
    stats: {
      recipes: user.recipes.length,
      avgRating: averageStars(allStars),
      ratingsCount: allStars.length,
      favorites: user.recipes.reduce((acc, r) => acc + r._count.favorites, 0),
    },
    recipes: user.recipes.map((r) => ({
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
      status: r.status,
      author: { id: r.author.id, name: r.author.name, role: r.author.role },
      isProfessional: PROFESSIONAL_ROLES.includes(r.author.role as (typeof PROFESSIONAL_ROLES)[number]),
      avgRating: averageStars(r.ratings.map((rt) => rt.stars)),
      ratingCount: r._count.ratings,
      favoritesCount: r._count.favorites,
    })),
  }

  return ok(profile)
}
