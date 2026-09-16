'use client'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { initials, ROLE_COLORS } from '@/lib/format'
import { ROLE_LABELS, type Role } from '@/lib/types'

/** Badge sutil con el color asociado a cada rol de la comunidad. */
export function RoleBadge({
  role,
  className,
}: {
  role: Role
  className?: string
}) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        'border border-transparent px-1.5 py-0 text-[10px] font-semibold',
        ROLE_COLORS[role] ?? ROLE_COLORS.PATIENT,
        className
      )}
    >
      {ROLE_LABELS[role] ?? role}
    </Badge>
  )
}

/** Avatar con las iniciales del usuario y fondo según su rol. */
export function UserAvatar({
  name,
  role,
  className,
  fallbackClassName,
}: {
  name: string
  role: Role
  className?: string
  fallbackClassName?: string
}) {
  return (
    <Avatar className={cn('size-8 border', className)}>
      <AvatarFallback
        className={cn(
          'text-xs font-semibold',
          ROLE_COLORS[role] ?? ROLE_COLORS.PATIENT,
          fallbackClassName
        )}
      >
        {initials(name || '?')}
      </AvatarFallback>
    </Avatar>
  )
}
