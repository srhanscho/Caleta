import * as LucideIcons from 'lucide-react'
import type { LucideProps } from 'lucide-react'

function toPascalCase(kebab: string): string {
  return kebab.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('')
}

export function CategoryIcon({ name, size = 16 }: { name: string; size?: number }) {
  const pascalName = toPascalCase(name)
  const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<LucideProps>>)[pascalName]
  if (!Icon) return null
  return <Icon size={size} />
}
