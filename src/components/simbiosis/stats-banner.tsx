'use client'

import { useEffect, useState } from 'react'
import { BadgeCheck, CookingPot, Star, Target, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/client-api'
import { numEs } from '@/lib/format'
import type { StatsData } from '@/lib/types'

const GOAL_USERS = 500
const GOAL_PRO_PCT = 10
const GOAL_SATISFACTION_PCT = 75

/** Franja de estadísticas de la comunidad con los criterios de éxito del proyecto. */
export function StatsBanner() {
  const [stats, setStats] = useState<StatsData | null>(null)

  useEffect(() => {
    let active = true
    api<StatsData>('/api/stats')
      .then((s) => active && setStats(s))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const cards = [
    {
      icon: Users,
      label: 'Usuarios activos',
      value: stats ? String(stats.users) : '',
    },
    {
      icon: CookingPot,
      label: 'Recetas publicadas',
      value: stats ? String(stats.recipes) : '',
    },
    {
      icon: BadgeCheck,
      label: 'Recetas de profesionales',
      value: stats ? `${numEs(stats.professionalRecipesPct)} %` : '',
    },
    {
      icon: Star,
      label: 'Valoración media',
      value: stats
        ? stats.avgRating > 0
          ? `${numEs(stats.avgRating)} / 5`
          : '—'
        : '',
    },
  ]

  const goals = stats
    ? [
        {
          label: 'Objetivo: 500 usuarios activos',
          value: Math.min((stats.users / GOAL_USERS) * 100, 100),
          display: `${stats.users} de ${GOAL_USERS} usuarios`,
        },
        {
          label: '% recetas de profesionales — objetivo 10 %',
          value: Math.min((stats.professionalRecipesPct / GOAL_PRO_PCT) * 100, 100),
          display: `${numEs(stats.professionalRecipesPct)} % de ${GOAL_PRO_PCT} %`,
        },
        {
          label: '% valoraciones positivas — objetivo 75 %',
          value: Math.min((stats.satisfactionPct / GOAL_SATISFACTION_PCT) * 100, 100),
          display: `${numEs(stats.satisfactionPct)} % de ${GOAL_SATISFACTION_PCT} %`,
        },
      ]
    : []

  return (
    <section aria-label="Estadísticas de la comunidad" className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(({ icon: Icon, label, value }) => (
          <Card key={label} className="gap-1 py-4">
            <CardContent className="flex items-center gap-3 px-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0">
                {stats ? (
                  <p className="text-xl font-bold leading-tight tracking-tight">{value}</p>
                ) : (
                  <Skeleton className="h-6 w-14" />
                )}
                <p className="truncate text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {stats && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Target aria-hidden="true" className="size-4 text-primary" />
              Criterios de éxito de la comunidad
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            {goals.map((g) => (
              <div key={g.label} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-xs font-medium">{g.label}</p>
                </div>
                <Progress value={g.value} aria-label={`${g.label}: ${g.display}`} />
                <p className="text-xs text-muted-foreground">{g.display}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </section>
  )
}
