'use client'

import { motion } from 'framer-motion'
import { CSSProperties } from 'react'

/**
 * AnimatedCard — Framer Motion stagger wrapper for dashboard-level cards.
 *
 * Usage in a grid:
 *   {items.map((item, i) => (
 *     <AnimatedCard key={item.id} index={i} style={{ gridColumn: 'span 4' }}>
 *       <MyCard {...item} />
 *     </AnimatedCard>
 *   ))}
 *
 * NOTE: Per project rules, do NOT use this on inbox email list items (EmailCard).
 * Use for dashboard widgets, briefing sections, insight cards, etc.
 */

const CINEMA_EASE = [0.22, 1, 0.36, 1] as const

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 16,
    scale: 0.985,
  },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.065,
      duration: 0.44,
      ease: CINEMA_EASE,
    },
  }),
}

interface AnimatedCardProps {
  children: React.ReactNode
  /** Position index — drives the cascade delay (0 = first, renders immediately) */
  index?: number
  className?: string
  /** Pass gridColumn / gridRow here when this is a direct grid child */
  style?: CSSProperties
}

export function AnimatedCard({
  children,
  index = 0,
  className,
  style,
}: AnimatedCardProps) {
  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  )
}
