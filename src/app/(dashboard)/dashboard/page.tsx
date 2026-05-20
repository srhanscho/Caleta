import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

export default function DashboardPage() {
  return (
    <main className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground">Dashboard — próximamente (RF-03)</p>
    </main>
  )
}
