/**
 * Cliente HTTP del frontend de Simbiosis.
 * Todas las peticiones usan rutas RELATIVAS ('/api/...') y credenciales same-origin.
 */

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, {
      credentials: 'same-origin',
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    })
  } catch {
    throw new ApiError('No se pudo conectar con el servidor. Revisa tu conexión.', 0)
  }

  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    // Respuesta sin cuerpo JSON
  }

  if (!res.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data
        ? String((data as { error: unknown }).error)
        : 'Se ha producido un error inesperado. Inténtalo de nuevo.'
    throw new ApiError(message, res.status)
  }

  return data as T
}

/** Serializa el cuerpo JSON y añade el método correspondiente. */
export function jsonBody(method: string, body: unknown): RequestInit {
  return { method, body: JSON.stringify(body) }
}
