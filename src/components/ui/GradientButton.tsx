'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ReactNode, ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'gradient' | 'ghost' | 'danger'

interface GradientButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: ButtonVariant
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_CLASSES: Record<string, string> = {
  sm:  'px-3 py-1.5 text-[11px]',
  md:  'px-4 py-2 text-[12px]',
  lg:  'px-5 py-2.5 text-[13px]',
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  gradient: 'gradient-pill',
  ghost:    'ghost-pill',
  danger:   'ghost-pill border-[rgba(255,107,107,0.28)] text-[var(--red)] hover:!bg-[rgba(255,107,107,0.08)] hover:!border-[rgba(255,107,107,0.45)]',
}

export function GradientButton({
  children,
  variant = 'gradient',
  size = 'md',
  className,
  ...props
}: GradientButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={cn(VARIANT_CLASSES[variant], SIZE_CLASSES[size], 'flex items-center gap-2', className)}
      {...(props as any)}
    >
      {children}
    </motion.button>
  )
}
