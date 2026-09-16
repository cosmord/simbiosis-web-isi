'use client'

import { useEffect, useState } from 'react'
import { Loader2, LogIn, Sparkles, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { api, jsonBody } from '@/lib/client-api'
import { useSimbiosis } from '@/lib/store'
import type { Role, User } from '@/lib/types'

const DEMO_ACCOUNTS: { label: string; role: Role; email: string }[] = [
  { label: 'Coordinador/a', role: 'COORDINATOR', email: 'coordinador@simbiosis.org' },
  { label: 'Nutricionista', role: 'NUTRITIONIST', email: 'nutricionista@simbiosis.org' },
  { label: 'Médico/a', role: 'DOCTOR', email: 'medico@simbiosis.org' },
  { label: 'Paciente', role: 'PATIENT', email: 'paciente@simbiosis.org' },
  { label: 'Cuidador/a', role: 'CAREGIVER', email: 'cuidador@simbiosis.org' },
]

const DEMO_PASSWORD = 'simbiosis123'

const REGISTER_ROLES: { value: Role; label: string }[] = [
  { value: 'PATIENT', label: 'Paciente' },
  { value: 'CAREGIVER', label: 'Cuidador/a' },
  { value: 'NUTRITIONIST', label: 'Nutricionista' },
  { value: 'DOCTOR', label: 'Médico/a' },
]

/** Diálogo de autenticación: iniciar sesión o crear cuenta (queda pendiente de aprobación). */
export function AuthView() {
  const { authOpen, setAuthOpen, setUser, bumpRefresh } = useSimbiosis()

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)

  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regRole, setRegRole] = useState<Role>('PATIENT')
  const [regBio, setRegBio] = useState('')
  const [regError, setRegError] = useState('')
  const [registering, setRegistering] = useState(false)

  useEffect(() => {
    if (!authOpen) {
      setLoginError('')
      setRegError('')
    }
  }, [authOpen])

  async function login(email: string, password: string) {
    setLoggingIn(true)
    setLoginError('')
    try {
      const res = await api<{ user: User }>('/api/auth/login', jsonBody('POST', { email, password }))
      setUser(res.user)
      setAuthOpen(false)
      setLoginEmail('')
      setLoginPassword('')
      bumpRefresh()
      toast.success(`¡Hola de nuevo, ${res.user.name}!`, {
        description: 'Nos alegra verte por la comunidad.',
      })
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.')
    } finally {
      setLoggingIn(false)
    }
  }

  async function register() {
    setRegistering(true)
    setRegError('')
    try {
      await api<{ user: User }>('/api/auth/register', jsonBody('POST', {
        name: regName,
        email: regEmail,
        password: regPassword,
        role: regRole,
        bio: regBio || undefined,
      }))
      setAuthOpen(false)
      setRegName('')
      setRegEmail('')
      setRegPassword('')
      setRegBio('')
      toast.info('Cuenta creada correctamente', {
        description:
          'Tu cuenta será revisada y activada por el equipo de coordinación. Te avisaremos cuando puedas iniciar sesión.',
        duration: 8000,
      })
    } catch (err) {
      setRegError(err instanceof Error ? err.message : 'No se pudo crear la cuenta.')
    } finally {
      setRegistering(false)
    }
  }

  function quickLogin(email: string) {
    void login(email, DEMO_PASSWORD)
  }

  return (
    <Dialog open={authOpen} onOpenChange={setAuthOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bienvenido a Simbiosis</DialogTitle>
          <DialogDescription>
            Accede para compartir recetas, participar en el foro y registrar tu bienestar.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="login">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
            <TabsTrigger value="register">Crear cuenta</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-4 space-y-4">
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                void login(loginEmail, loginPassword)
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="login-email">Correo electrónico</Label>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="tu@correo.org"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="login-password">Contraseña</Label>
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </div>
              {loginError && (
                <Alert variant="destructive">
                  <AlertDescription>{loginError}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full min-h-11" disabled={loggingIn}>
                {loggingIn ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
                Iniciar sesión
              </Button>
            </form>

            <div className="space-y-2 rounded-lg border border-dashed bg-secondary/40 p-3">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Sparkles aria-hidden="true" className="size-3.5 text-amber-500" />
                Cuentas demo para probar la plataforma (contraseña: simbiosis123)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {DEMO_ACCOUNTS.map((acc) => (
                  <Badge
                    key={acc.email}
                    asChild
                    variant="outline"
                    className="cursor-pointer py-1 transition-colors hover:border-primary hover:bg-secondary"
                  >
                    <button
                      type="button"
                      disabled={loggingIn}
                      onClick={() => quickLogin(acc.email)}
                      aria-label={`Iniciar sesión como ${acc.label}`}
                    >
                      {acc.label}
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="register" className="mt-4 space-y-4">
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                void register()
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="reg-name">Nombre</Label>
                <Input
                  id="reg-name"
                  autoComplete="name"
                  placeholder="Tu nombre y apellido"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-email">Correo electrónico</Label>
                <Input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  placeholder="tu@correo.org"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-password">Contraseña</Label>
                <Input
                  id="reg-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">Mínimo 6 caracteres.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-role">Perfil</Label>
                <Select value={regRole} onValueChange={(v) => setRegRole(v as Role)}>
                  <SelectTrigger id="reg-role" className="min-h-11 w-full">
                    <SelectValue placeholder="Selecciona tu perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    {REGISTER_ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-bio">
                  Presentación <span className="font-normal text-muted-foreground">(opcional)</span>
                </Label>
                <Textarea
                  id="reg-bio"
                  rows={2}
                  placeholder="Cuéntanos brevemente tu relación con la EII…"
                  value={regBio}
                  onChange={(e) => setRegBio(e.target.value)}
                />
              </div>
              {regError && (
                <Alert variant="destructive">
                  <AlertDescription>{regError}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full min-h-11" disabled={registering}>
                {registering ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
                Crear cuenta
              </Button>
            </form>
            <p className="flex items-start gap-1.5 rounded-lg bg-accent/60 px-3 py-2 text-xs text-foreground/80">
              <UserPlus aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
              Tu cuenta será revisada y activada por el equipo de coordinación antes de
              poder iniciar sesión.
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
