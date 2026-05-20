// Re-export Prisma enums so features don't need to import from generated path
export { AccountType, TransactionType, CategoryType } from '../generated/prisma'

// Utility types for COP money handling (user enters pesos, DB stores centavos)
export type PesosToCentavos = (pesos: number) => number
export type CentavosToPesos = (centavos: number) => number

// Standard result shape for all server actions
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }
