import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireCoordinator } from '@/lib/api-helpers'
import { publicUser } from '@/lib/auth'

const VALID_STATUS = ['PENDING', 'ACTIVE', 'SUSPENDED', 'ALL']

export async function GET(req: NextRequest) {
  const { error } = await requireCoordinator()
  if (error) return error

  const status = req.nextUrl.searchParams.get('status') ?? 'ALL'
  if (!VALID_STATUS.includes(status)) {
    return fail('El estado indicado no es válido.', 400)
  }

  // Se excluyen todas las cuentas de coordinador: no se pueden gestionar
  // entre sí y el listado está pensado para aprobar/suspender al resto.
  const users = await db.user.findMany({
    where: {
      role: { not: 'COORDINATOR' },
      ...(status !== 'ALL' ? { status } : {}),
    },
    orderBy: { createdAt: 'desc' },
  })

  return ok({ users: users.map(publicUser) })
}
