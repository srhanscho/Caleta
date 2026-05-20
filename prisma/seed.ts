import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, CategoryType } from '../src/generated/prisma'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const SYSTEM_CATEGORIES: Array<{
  nombre: string
  icono: string
  color: string
  tipo: CategoryType
}> = [
  // ─── Ingresos ─────────────────────────────────────────────────────────────
  { nombre: 'Salario', icono: 'briefcase', color: '#16a34a', tipo: CategoryType.INCOME },
  { nombre: 'Freelance', icono: 'laptop', color: '#2563eb', tipo: CategoryType.INCOME },
  {
    nombre: 'Transferencia recibida',
    icono: 'arrow-down-to-line',
    color: '#0891b2',
    tipo: CategoryType.INCOME,
  },
  { nombre: 'Arriendo recibido', icono: 'building', color: '#7c3aed', tipo: CategoryType.INCOME },
  { nombre: 'Intereses', icono: 'trending-up', color: '#d97706', tipo: CategoryType.INCOME },
  { nombre: 'Otro ingreso', icono: 'plus-circle', color: '#64748b', tipo: CategoryType.INCOME },
  // ─── Gastos ───────────────────────────────────────────────────────────────
  { nombre: 'Alimentación', icono: 'utensils', color: '#ea580c', tipo: CategoryType.EXPENSE },
  { nombre: 'Transporte', icono: 'bus', color: '#0284c7', tipo: CategoryType.EXPENSE },
  { nombre: 'Entretenimiento', icono: 'gamepad-2', color: '#7c3aed', tipo: CategoryType.EXPENSE },
  { nombre: 'Salud', icono: 'heart-pulse', color: '#dc2626', tipo: CategoryType.EXPENSE },
  { nombre: 'Educación', icono: 'graduation-cap', color: '#0891b2', tipo: CategoryType.EXPENSE },
  { nombre: 'Ropa', icono: 'shirt', color: '#ec4899', tipo: CategoryType.EXPENSE },
  {
    nombre: 'Servicios públicos',
    icono: 'zap',
    color: '#f59e0b',
    tipo: CategoryType.EXPENSE,
  },
  { nombre: 'Tecnología', icono: 'monitor-smartphone', color: '#64748b', tipo: CategoryType.EXPENSE },
  { nombre: 'Hogar', icono: 'home', color: '#78716c', tipo: CategoryType.EXPENSE },
  { nombre: 'Deudas', icono: 'credit-card', color: '#991b1b', tipo: CategoryType.EXPENSE },
  { nombre: 'Ahorro', icono: 'piggy-bank', color: '#0f766e', tipo: CategoryType.EXPENSE },
  { nombre: 'Otro gasto', icono: 'circle-ellipsis', color: '#94a3b8', tipo: CategoryType.EXPENSE },
]

async function main() {
  console.log('Sembrando categorías del sistema...')

  for (const category of SYSTEM_CATEGORIES) {
    const existing = await prisma.category.findFirst({
      where: { nombre: category.nombre, userId: null },
    })
    if (!existing) {
      await prisma.category.create({ data: { ...category, userId: null } })
    }
  }

  console.log(`✓ ${SYSTEM_CATEGORIES.length} categorías procesadas`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
