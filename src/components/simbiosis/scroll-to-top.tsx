'use client'

import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '@/components/ui/button'

/**
 * Botón flotante «Volver arriba»: aparece tras desplazarse 600 px y hace un
 * scroll suave al inicio. Oculto en impresión y respetuoso con la zona segura
 * inferior en móviles con notch.
 */
export function ScrollToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.9 }}
          transition={{ duration: 0.18 }}
          className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-4 z-40 sm:right-6 print:hidden"
        >
          <Button
            size="icon"
            aria-label="Volver arriba"
            title="Volver arriba"
            className="size-11 rounded-full border border-primary/20 bg-background/90 shadow-lg backdrop-blur transition-colors hover:border-primary/40 hover:bg-accent"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <ArrowUp aria-hidden="true" className="size-5 text-primary" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
