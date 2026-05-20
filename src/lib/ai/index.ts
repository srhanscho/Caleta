import { createAnthropic } from '@ai-sdk/anthropic'

// Shared Anthropic provider instance — features import from here
export const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Default model for all AI features
export const DEFAULT_MODEL = 'claude-sonnet-4-6'
