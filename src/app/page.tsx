'use client'

import { useEffect } from 'react'
import { ThemeProvider } from 'next-themes'
import { AnimatePresence, motion } from 'framer-motion'
import { ChefHat, Loader2 } from 'lucide-react'
import { Navbar } from '@/components/simbiosis/navbar'
import { Footer } from '@/components/simbiosis/footer'
import { AuthView } from '@/components/simbiosis/auth-view'
import { GuideModal } from '@/components/simbiosis/guide-modal'
import { ReportDialog } from '@/components/simbiosis/report-dialog'
import { HomeView } from '@/components/simbiosis/home-view'
import { RecipesView } from '@/components/simbiosis/recipes-view'
import { RecipeDetail } from '@/components/simbiosis/recipe-detail'
import { RecipeForm } from '@/components/simbiosis/recipe-form'
import { ForumView } from '@/components/simbiosis/forum-view'
import { ThreadDetail } from '@/components/simbiosis/thread-detail'
import { PublicationsView } from '@/components/simbiosis/publications-view'
import { HealthView } from '@/components/simbiosis/health-view'
import { PlanView } from '@/components/simbiosis/plan-view'
import { ProfileView } from '@/components/simbiosis/profile-view'
import { UserProfileView } from '@/components/simbiosis/user-profile-view'
import { CoordinatorView } from '@/components/simbiosis/coordinator-view'
import { api } from '@/lib/client-api'
import { useSimbiosis } from '@/lib/store'
import type { User } from '@/lib/types'

/** Pantalla de carga con la marca mientras se comprueba la sesión. */
function Splash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg"
      >
        <ChefHat className="size-8" aria-hidden="true" />
      </motion.div>
      <div className="text-center">
        <p className="text-xl font-bold tracking-tight">Simbiosis</p>
        <p className="text-sm text-muted-foreground">Preparando la comunidad…</p>
      </div>
      <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />
    </div>
  )
}

function ViewContent() {
  const { view, viewParams } = useSimbiosis()

  switch (view) {
    case 'recipes':
      return <RecipesView />
    case 'recipeDetail':
      return viewParams.id ? (
        <RecipeDetail id={String(viewParams.id)} />
      ) : (
        <RecipesView />
      )
    case 'newRecipe':
      return <RecipeForm />
    case 'forum':
      return <ForumView />
    case 'threadDetail':
      return viewParams.id ? (
        <ThreadDetail id={String(viewParams.id)} />
      ) : (
        <ForumView />
      )
    case 'publications':
      return <PublicationsView />
    case 'health':
      return <HealthView />
    case 'plan':
      return <PlanView />
    case 'userProfile':
      return viewParams.id ? (
        <UserProfileView id={String(viewParams.id)} />
      ) : (
        <HomeView />
      )
    case 'profile':
      return <ProfileView />
    case 'coordinator':
      return <CoordinatorView />
    case 'home':
    default:
      return <HomeView />
  }
}

function AppShell() {
  const { booted, setBooted, setUser, view, viewParams } = useSimbiosis()

  // Arranque: comprobar la sesión con GET /api/auth/me
  useEffect(() => {
    let active = true
    api<{ user: User | null }>('/api/auth/me')
      .then((d) => {
        if (active) setUser(d.user)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setBooted(true)
      })
    return () => {
      active = false
    }
  }, [setUser, setBooted])

  if (!booted) return <Splash />

  const transitionKey = `${view}:${String(viewParams.id ?? '')}`

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={transitionKey}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <ViewContent />
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />

      <AuthView />
      <GuideModal />
      <ReportDialog />
    </div>
  )
}

export default function Page() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AppShell />
    </ThemeProvider>
  )
}
