import { db } from '@/lib/db'

export type EmailKind =
  | 'ACCOUNT_RECEIVED'
  | 'ACCOUNT_APPROVED'
  | 'ACCOUNT_SUSPENDED'
  | 'CONTENT_REMOVED'

export interface SendEmailInput {
  toUserId?: string | null
  toEmail: string
  subject: string
  body: string
  kind: EmailKind
}

const SENDER = 'Simbiosis <no-responder@simbiosis.org>'

/**
 * Registra un correo simulado en la bandeja de salida del sistema
 * (fire-and-forget: nunca rompe la petición principal).
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  try {
    await db.emailLog.create({
      data: {
        toUserId: input.toUserId ?? null,
        toEmail: input.toEmail.toLowerCase(),
        subject: input.subject,
        body: input.body,
        kind: input.kind,
      },
    })
  } catch {
    // fire-and-forget
  }
}

/** Variante "void-safe" para usar inline sin await. */
export function sendEmailAsync(input: SendEmailInput): void {
  void sendEmail(input)
}

export const EMAIL_SENDER = SENDER
