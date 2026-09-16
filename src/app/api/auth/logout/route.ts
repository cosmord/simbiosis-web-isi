import { ok } from '@/lib/api-helpers'
import { clearSession } from '@/lib/auth'

export async function POST() {
  await clearSession()
  return ok({ ok: true })
}
