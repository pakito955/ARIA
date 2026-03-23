'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  value: number
  duration?: number
  className?: string
  style?: React.CSSProperties
  prefix?: string
  suffix?: string
  decimals?: number
}

export function AnimatedNumber({
  value,
  duration = 1100,
  className,
  style,
  prefix = '',
  suffix = '',
  decimals = 0,
}: Props) {
  const [display, setDisplay] = useState(0)
  const frameRef = useRef<number | undefined>(undefined)
  const startTimeRef = useRef<number | undefined>(undefined)
  const startValueRef = useRef(0)

  useEffect(() => {
    const startVal = startValueRef.current
    const endVal = value
    startTimeRef.current = undefined as number | undefined

    const animate = (timestamp: number) => {
      if (startTimeRef.current === undefined) startTimeRef.current = timestamp
      const elapsed = timestamp - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      const current = startVal + (endVal - startVal) * eased
      setDisplay(current)
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate)
      } else {
        startValueRef.current = endVal
      }
    }

    frameRef.current = requestAnimationFrame(animate)
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [value, duration])

  const formatted = decimals > 0
    ? display.toFixed(decimals)
    : Math.round(display).toString()

  return (
    <span className={className} style={style}>
      {prefix}{formatted}{suffix}
    </span>
  )
}
