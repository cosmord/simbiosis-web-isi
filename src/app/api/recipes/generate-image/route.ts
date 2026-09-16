import fs from 'fs'
import path from 'path'
import { ok, fail, requireUser } from '@/lib/api-helpers'

const GENERATED_DIR = path.join(process.cwd(), 'public', 'images', 'generated')

/**
 * POST /api/recipes/generate-image
 * Genera una imagen fotográfica de un plato con IA a partir del título y descripción.
 * Guarda el PNG en public/images/generated y devuelve la URL pública.
 */
export async function POST(req: Request) {
  const auth = await requireUser()
  if (auth.error) return auth.error

  let body: { title?: unknown; description?: unknown }
  try {
    body = await req.json()
  } catch {
    return fail('Cuerpo de la petición no válido.')
  }

  const title = String(body.title ?? '').trim()
  const description = String(body.description ?? '').trim()
  if (title.length < 3) return fail('Escribe primero el título de la receta para generar la imagen.')

  const prompt = [
    `Appetizing homemade food photography of: ${title}.`,
    description ? `Dish context: ${description.slice(0, 220)}.` : '',
    'Soft natural light, rustic ceramic plate, warm kitchen background, shallow depth of field, gentle and healthy look, high quality, detailed.',
  ]
    .filter(Boolean)
    .join(' ')

  try {
    const { default: ZAI } = await import('z-ai-web-dev-sdk')
    const zai = await ZAI.create()
    const response = await zai.images.generations.create({
      prompt,
      size: '1024x1024',
    })

    const base64 = response.data?.[0]?.base64
    if (!base64) return fail('El servicio de imágenes no devolvió ningún resultado. Inténtalo de nuevo.', 502)

    fs.mkdirSync(GENERATED_DIR, { recursive: true })
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`
    fs.writeFileSync(path.join(GENERATED_DIR, fileName), Buffer.from(base64, 'base64'))

    return ok({ image: `/images/generated/${fileName}` }, 201)
  } catch (err) {
    console.error('[generate-image]', err)
    return fail(
      'No se pudo generar la imagen en este momento (el servicio puede estar saturado). Puedes pegar una URL manualmente o dejar la receta sin foto.',
      502
    )
  }
}
