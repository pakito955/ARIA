/**
 * Feature Flag System
 * Centralised on/off switches for ARIA features.
 * Named exports only — no default export.
 */

export const FEATURES = {
  AI_ASSISTANT:      true,
  VOICE_COMMANDS:    true,
  CALENDAR_SYNC:     true,
  TASK_EXTRACTION:   true,
  ANALYTICS_V2:      true,
  WIDGET_MARKETPLACE: false, // future
} as const

export type FeatureKey = keyof typeof FEATURES

export function isEnabled(feature: FeatureKey): boolean {
  return FEATURES[feature]
}

export function getAllFeatures(): Record<FeatureKey, boolean> {
  return { ...FEATURES }
}
