import { ok } from '@/lib/api-helpers'
import { getAuthUser } from '@/lib/auth'

export async function GET() {
  // Devuelve el usuario aunque esté PENDING/SUSPENDED para que el cliente
  // pueda mostrar el estado de la cuenta.
  const user = await getAuthUser()
  return ok({ user })
}
