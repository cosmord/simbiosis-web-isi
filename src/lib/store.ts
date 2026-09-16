import { create } from 'zustand'
import type { User } from './types'

export type View =
  | 'home'
  | 'recipes'
  | 'recipeDetail'
  | 'newRecipe'
  | 'forum'
  | 'threadDetail'
  | 'publications'
  | 'health'
  | 'plan'
  | 'profile'
  | 'userProfile'
  | 'coordinator'

export interface ViewParams {
  id?: string
  recipe?: unknown
  tab?: string
  [key: string]: unknown
}

interface SimbiosisState {
  booted: boolean
  setBooted: (booted: boolean) => void

  user: User | null
  setUser: (user: User | null) => void

  view: View
  viewParams: ViewParams
  navigate: (view: View, params?: ViewParams) => void
  goHome: () => void

  /** Se incrementa para pedir a las vistas que vuelvan a cargar sus datos. */
  refreshKey: number
  bumpRefresh: () => void

  authOpen: boolean
  setAuthOpen: (open: boolean) => void

  guideOpen: boolean
  setGuideOpen: (open: boolean) => void

  reportTarget: { targetType: string; targetId: string } | null
  openReport: (targetType: string, targetId: string) => void
  closeReport: () => void
}

export const useSimbiosis = create<SimbiosisState>((set) => ({
  booted: false,
  setBooted: (booted) => set({ booted }),

  user: null,
  setUser: (user) => set({ user }),

  view: 'home',
  viewParams: {},
  navigate: (view, params = {}) => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    }
    set({ view, viewParams: params })
  },
  goHome: () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    }
    set({ view: 'home', viewParams: {} })
  },

  refreshKey: 0,
  bumpRefresh: () => set((state) => ({ refreshKey: state.refreshKey + 1 })),

  authOpen: false,
  setAuthOpen: (authOpen) => set({ authOpen }),

  guideOpen: false,
  setGuideOpen: (guideOpen) => set({ guideOpen }),

  reportTarget: null,
  openReport: (targetType, targetId) => set({ reportTarget: { targetType, targetId } }),
  closeReport: () => set({ reportTarget: null }),
}))
