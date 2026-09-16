'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BookOpenCheck,
  CalendarDays,
  ChefHat,
  HeartPulse,
  HelpCircle,
  LogOut,
  Menu,
  Moon,
  ShieldCheck,
  Sun,
  User as UserIcon,
  UtensilsCrossed,
  Heart,
  MessagesSquare,
  Home,
  Hourglass,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { RoleBadge, UserAvatar } from './user-bits'
import { api, jsonBody } from '@/lib/client-api'
import { useSimbiosis, type View } from '@/lib/store'
import { ROLE_LABELS } from '@/lib/types'
import { useMounted } from '@/hooks/use-mounted'
import { cn } from '@/lib/utils'

const PUBLIC_LINKS: { view: View; label: string; icon: typeof Home }[] = [
  { view: 'home', label: 'Inicio', icon: Home },
  { view: 'recipes', label: 'Recetas', icon: UtensilsCrossed },
  { view: 'forum', label: 'Foro', icon: MessagesSquare },
  { view: 'publications', label: 'Consejos de salud', icon: BookOpenCheck },
]

/** Barra de navegación superior fija, con menú móvil y accesos de usuario. */
export function Navbar() {
  const { user, view, navigate, goHome, setAuthOpen, setGuideOpen, setUser, bumpRefresh } =
    useSimbiosis()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const mounted = useMounted()
  const [mobileOpen, setMobileOpen] = useState(false)

  function isActive(target: View): boolean {
    if (target === 'home') return view === 'home'
    if (target === 'recipes') return view === 'recipes' || view === 'recipeDetail' || view === 'newRecipe'
    if (target === 'forum') return view === 'forum' || view === 'threadDetail'
    return view === target
  }

  async function logout() {
    try {
      await api('/api/auth/logout', jsonBody('POST', {}))
      setUser(null)
      bumpRefresh()
      goHome()
      toast.success('Sesión cerrada. ¡Hasta pronto!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cerrar la sesión.')
    }
  }

  const accountLinks: { label: string; icon: typeof Home; action: () => void }[] = user
    ? [
        { label: 'Mi perfil', icon: UserIcon, action: () => navigate('profile') },
        { label: 'Mis recetas', icon: ChefHat, action: () => navigate('profile', { tab: 'recipes' }) },
        { label: 'Mis favoritos', icon: Heart, action: () => navigate('profile', { tab: 'favorites' }) },
        { label: 'Mi plan semanal', icon: CalendarDays, action: () => navigate('plan') },
        { label: 'Mis datos de salud', icon: HeartPulse, action: () => navigate('health') },
        ...(user.role === 'COORDINATOR'
          ? [{ label: 'Panel de coordinación', icon: ShieldCheck, action: () => navigate('coordinator') }]
          : []),
      ]
    : []

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/80 backdrop-blur-md">
      <nav
        aria-label="Navegación principal"
        className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4"
      >
        <div className="flex items-center gap-2">
          {/* Menú móvil */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Abrir menú de navegación"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader className="pb-0">
                <SheetTitle className="flex items-center gap-2 text-base">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <ChefHat className="size-4.5" />
                  </span>
                  Simbiosis
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-1 px-3 pb-6">
                {PUBLIC_LINKS.map(({ view: linkView, label, icon: Icon }) => (
                  <Button
                    key={linkView}
                    variant={isActive(linkView) ? 'secondary' : 'ghost'}
                    className="min-h-11 justify-start"
                    onClick={() => {
                      navigate(linkView)
                      setMobileOpen(false)
                    }}
                  >
                    <Icon aria-hidden="true" className="size-4" />
                    {label}
                  </Button>
                ))}
                {user && (
                  <>
                    <Separator className="my-2" />
                    {accountLinks.map(({ label, icon: Icon, action }) => (
                      <Button
                        key={label}
                        variant="ghost"
                        className="min-h-11 justify-start"
                        onClick={() => {
                          action()
                          setMobileOpen(false)
                        }}
                      >
                        <Icon aria-hidden="true" className="size-4" />
                        {label}
                      </Button>
                    ))}
                  </>
                )}
                <Separator className="my-2" />
                <Button
                  variant="outline"
                  className="min-h-11 justify-start"
                  onClick={() => {
                    setGuideOpen(true)
                    setMobileOpen(false)
                  }}
                >
                  <HelpCircle aria-hidden="true" className="size-4" />
                  Guía interactiva
                </Button>
                {user ? (
                  <Button
                    variant="ghost"
                    className="min-h-11 justify-start text-destructive hover:text-destructive"
                    onClick={() => {
                      setMobileOpen(false)
                      void logout()
                    }}
                  >
                    <LogOut aria-hidden="true" className="size-4" />
                    Cerrar sesión
                  </Button>
                ) : (
                  <Button
                    className="mt-2 min-h-11"
                    onClick={() => {
                      setAuthOpen(true)
                      setMobileOpen(false)
                    }}
                  >
                    Entrar
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>

          <button
            type="button"
            onClick={goHome}
            className="flex items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Ir a la página de inicio de Simbiosis"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <ChefHat className="size-5" />
            </span>
            <span className="flex flex-col items-start leading-none">
              <span className="text-lg font-bold tracking-tight">Simbiosis</span>
              <span className="hidden text-[10px] font-medium uppercase tracking-widest text-muted-foreground sm:block">
                Comunidad EII
              </span>
            </span>
          </button>
        </div>

        {/* Enlaces de escritorio */}
        <div className="hidden items-center gap-1 md:flex">
          {PUBLIC_LINKS.map(({ view: linkView, label }) => (
            <Button
              key={linkView}
              variant="ghost"
              size="sm"
              aria-current={isActive(linkView) ? 'page' : undefined}
              className={cn(
                'min-h-9 rounded-full px-3.5 text-sm',
                isActive(linkView) && 'bg-secondary font-semibold text-secondary-foreground'
              )}
              onClick={() => navigate(linkView)}
            >
              {label}
            </Button>
          ))}
          {user && (
            <Button
              variant="ghost"
              size="sm"
              aria-current={isActive('plan') ? 'page' : undefined}
              className={cn(
                'min-h-9 rounded-full px-3.5 text-sm',
                isActive('plan') && 'bg-secondary font-semibold text-secondary-foreground'
              )}
              onClick={() => navigate('plan')}
            >
              Mi plan semanal
            </Button>
          )}
          {user && (
            <Button
              variant="ghost"
              size="sm"
              aria-current={isActive('health') ? 'page' : undefined}
              className={cn(
                'min-h-9 rounded-full px-3.5 text-sm',
                isActive('health') && 'bg-secondary font-semibold text-secondary-foreground'
              )}
              onClick={() => navigate('health')}
            >
              Mis datos de salud
            </Button>
          )}
        </div>

        {/* Acciones a la derecha */}
        <div className="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Abrir la guía interactiva"
                onClick={() => setGuideOpen(true)}
                className="rounded-full"
              >
                <HelpCircle className="size-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Guía interactiva</TooltipContent>
          </Tooltip>

          <Button
            variant="ghost"
            size="icon"
            aria-label={mounted && resolvedTheme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
            className="rounded-full"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {mounted ? (
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={resolvedTheme}
                  initial={{ rotate: -60, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 60, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex"
                >
                  {resolvedTheme === 'dark' ? (
                    <Sun className="size-5" />
                  ) : (
                    <Moon className="size-5" />
                  )}
                </motion.span>
              </AnimatePresence>
            ) : (
              <Moon className="size-5" />
            )}
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="gap-2 rounded-full pl-1 pr-2"
                  aria-label={`Menú de cuenta de ${user.name}`}
                >
                  <UserAvatar name={user.name} role={user.role} className="size-8" />
                  <span className="hidden flex-col items-start leading-tight lg:flex">
                    <span className="max-w-32 truncate text-sm font-medium">{user.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {ROLE_LABELS[user.role]}
                    </span>
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="flex flex-col gap-1">
                  <span className="text-sm font-semibold">{user.name}</span>
                  <span className="flex items-center gap-1.5">
                    <RoleBadge role={user.role} />
                    {user.status !== 'ACTIVE' && (
                      <Badge variant="outline" className="gap-1 border-amber-300 bg-amber-50 px-1.5 py-0 text-[10px] text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        <Hourglass aria-hidden="true" className="size-3" />
                        {user.status === 'PENDING' ? 'Cuenta pendiente' : 'Cuenta suspendida'}
                      </Badge>
                    )}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {accountLinks.map(({ label, icon: Icon, action }) => (
                  <DropdownMenuItem key={label} onClick={action} className="cursor-pointer">
                    <Icon aria-hidden="true" className="size-4" />
                    {label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => void logout()}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut aria-hidden="true" className="size-4" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={() => setAuthOpen(true)} className="rounded-full">
              Entrar
            </Button>
          )}
        </div>
      </nav>
    </header>
  )
}
