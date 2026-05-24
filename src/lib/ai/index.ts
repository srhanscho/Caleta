import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'

export const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

// Para extracción de screenshots (visión)
export const DEFAULT_MODEL = 'claude-sonnet-4-6'
// Para categorización automática (texto rápido)
export const SUGGEST_MODEL = 'claude-haiku-4-5-20251001'
