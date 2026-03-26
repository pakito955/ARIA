'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'

// Cinematic ease — slow deceleration, like a high-end product video cut
const CINEMA_EASE = [0.22, 1, 0.36, 1] as const

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6, transition: { duration: 0.18, ease: 'easeIn' } }}
        transition={{ duration: 0.38, ease: CINEMA_EASE }}
        className="h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
