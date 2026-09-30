'use client'

import { useState } from 'react'
import Image from 'next/image'
import { UtensilsCrossed } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageWithFallbackProps {
  src?: string | null
  alt: string
  className?: string
  sizes?: string
  priority?: boolean
  icon?: 'utensils' | 'none'
}

/**
 * Imagen con degradado esmeralda/ámbar de respaldo cuando no hay foto
 * o esta falla al cargar. Ocupa todo el contenedor relativo padre.
 */
export function ImageWithFallback({
  src,
  alt,
  className,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  priority = false,
  icon = 'utensils',
}: ImageWithFallbackProps) {
  const [error, setError] = useState(false)
  const showFallback = !src || error

  if (showFallback) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn(
          'absolute inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-100 via-emerald-50 to-amber-50 dark:from-emerald-950 dark:via-emerald-900 dark:to-amber-950',
          className
        )}
      >
        {icon === 'utensils' && (
          <UtensilsCrossed
            aria-hidden="true"
            className="size-10 text-emerald-600/40 dark:text-emerald-400/40"
          />
        )}
      </div>
    )
  }

  const isLocal = src.startsWith('/')

  return isLocal ? (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      onError={() => setError(true)}
      className={cn('object-cover', className)}
    />
  ) : (
    // Imágenes externas sin pasar por el optimizador (evita errores de host no configurado)
    <img
      src={src}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      onError={() => setError(true)}
      className={cn('absolute inset-0 h-full w-full object-cover', className)}
    />
  )
}
