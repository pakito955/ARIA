'use client'

import { useState, useEffect, useCallback } from 'react'
import { DEFAULT_WIDGET_ORDER, WIDGET_REGISTRY } from '@/lib/widgets'

const STORAGE_KEY = 'aria-widget-config'

export interface WidgetConfig {
  order: string[]        // widget IDs in display order (only enabled ones)
  disabled: string[]     // IDs that are hidden
}

function loadConfig(): WidgetConfig {
  if (typeof window === 'undefined') {
    return { order: DEFAULT_WIDGET_ORDER, disabled: [] }
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return { order: DEFAULT_WIDGET_ORDER, disabled: [] }
    const parsed = JSON.parse(stored) as WidgetConfig
    // Ensure any newly added default widgets appear
    const allKnown = WIDGET_REGISTRY.map((w) => w.id)
    const newDefaults = DEFAULT_WIDGET_ORDER.filter(
      (id) => !parsed.order.includes(id) && !parsed.disabled.includes(id)
    )
    const cleanOrder = parsed.order.filter((id) => allKnown.includes(id))
    return { order: [...cleanOrder, ...newDefaults], disabled: parsed.disabled.filter((id) => allKnown.includes(id)) }
  } catch {
    return { order: DEFAULT_WIDGET_ORDER, disabled: [] }
  }
}

export function useWidgetConfig() {
  const [config, setConfig] = useState<WidgetConfig>(() => loadConfig())

  // Persist on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  }, [config])

  const reorder = useCallback((newOrder: string[]) => {
    setConfig((prev) => ({ ...prev, order: newOrder }))
  }, [])

  const enable = useCallback((id: string) => {
    setConfig((prev) => ({
      order: prev.order.includes(id) ? prev.order : [...prev.order, id],
      disabled: prev.disabled.filter((d) => d !== id),
    }))
  }, [])

  const disable = useCallback((id: string) => {
    setConfig((prev) => ({
      order: prev.order.filter((o) => o !== id),
      disabled: prev.disabled.includes(id) ? prev.disabled : [...prev.disabled, id],
    }))
  }, [])

  const toggle = useCallback((id: string, enabled: boolean) => {
    if (enabled) enable(id)
    else disable(id)
  }, [enable, disable])

  const reset = useCallback(() => {
    const fresh: WidgetConfig = { order: DEFAULT_WIDGET_ORDER, disabled: [] }
    setConfig(fresh)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh))
  }, [])

  return { config, reorder, enable, disable, toggle, reset }
}
