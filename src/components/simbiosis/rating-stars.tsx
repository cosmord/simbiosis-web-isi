'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface RatingStarsProps {
  value: number
  onChange?: (value: number) => void
  readOnly?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
  'aria-label'?: string
}

const SIZES = {
  sm: 'size-3.5',
  md: 'size-5',
  lg: 'size-7',
}

/** Estrellas de valoración: solo lectura o interactivas con animación de relleno. */
export function RatingStars({
  value,
  onChange,
  readOnly = false,
  size = 'md',
  className,
  'aria-label': ariaLabel = 'Valoración',
}: RatingStarsProps) {
  const [hover, setHover] = useState(0)
  const shown = hover > 0 ? hover : value
  const interactive = !readOnly && !!onChange

  return (
    <div
      className={cn('inline-flex items-center gap-0.5', className)}
      role={interactive ? 'radiogroup' : undefined}
      aria-label={ariaLabel}
      onMouseLeave={() => interactive && setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = shown >= star - 0.25
        const starEl = (
          <motion.span
            key={star}
            initial={false}
            animate={filled && shown === star ? { scale: [1, 1.25, 1] } : { scale: 1 }}
            transition={{ duration: 0.25 }}
            className="inline-flex"
          >
            <Star
              className={cn(
                SIZES[size],
                'transition-colors',
                filled
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-transparent text-muted-foreground/40'
              )}
            />
          </motion.span>
        )

        if (!interactive) return <span key={star}>{starEl}</span>

        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} ${star === 1 ? 'estrella' : 'estrellas'}`}
            className="rounded-sm p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onMouseEnter={() => setHover(star)}
            onFocus={() => setHover(star)}
            onBlur={() => setHover(0)}
            onClick={() => onChange?.(star)}
          >
            {starEl}
          </button>
        )
      })}
    </div>
  )
}
