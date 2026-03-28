'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { CSSProperties, ReactNode } from 'react'

type GlowVariant = 'default' | 'orange' | 'purple' | 'blue' | 'red' | 'critical'

const VARIANT_CLASSES: Record<GlowVariant, string> = {
  default:  '',
  orange:   'glow-border-orange',
  purple:   'glow-border-purple',
  blue:     'glow-border-blue',
  red:      'glow-border-red',
  critical: 'glow-border-red',
}

interface GlowCardProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
  variant?: GlowVariant
  /** Disable the hover-lift animation (e.g. inside a draggable wrapper) */
  static?: boolean
  onClick?: () => void
}

export function GlowCard({
  children,
  className,
  style,
  variant = 'default',
  static: isStatic = false,
  onClick,
}: GlowCardProps) {
  return (
    <motion.div
      whileHover={isStatic ? undefined : { y: -2, scale: 1.005 }}
      whileTap={isStatic ? undefined : { scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      onClick={onClick}
      className={cn('glow-card', VARIANT_CLASSES[variant], className)}
      style={style}
    >
      {children}
    </motion.div>
  )
}
