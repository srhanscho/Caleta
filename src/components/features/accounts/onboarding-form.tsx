// src/components/features/accounts/onboarding-form.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, X } from 'lucide-react'
import { createAccounts } from '@/server/actions/accounts/create-accounts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type AccountTypeValue =
  | 'NEQUI'
  | 'DAVIPLATA'
  | 'BANCOLOMBIA'
  | 'NUBANK'
  | 'EFECTIVO'
  | 'OTRO'

const ACCOUNT_TYPES: { value: AccountTypeValue; label: string; defaultName: string }[] = [
  { value: 'NEQUI', label: 'Nequi', defaultName: 'Nequi' },
  { value: 'DAVIPLATA', label: 'Daviplata', defaultName: 'Daviplata' },
  { value: 'BANCOLOMBIA', label: 'Bancolombia', defaultName: 'Bancolombia' },
  { value: 'NUBANK', label: 'Nu', defaultName: 'Nu' },
  { value: 'EFECTIVO', label: 'Efectivo', defaultName: 'Efectivo' },
  { value: 'OTRO', label: 'Otro', defaultName: 'Mi cuenta' },
]

type AccountRow = {
  id: string
  tipo: AccountTypeValue
  nombre: string
  balance: string
}

const inputClass =
  'bg-[#18181B] border-[#27272A] text-[#FAFAFA] placeholder:text-[#A1A1AA] focus-visible:ring-[#0D9488]'

const selectClass =
  'bg-[#18181B] border border-[#27272A] text-[#FAFAFA] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488] h-10 w-full'

export function OnboardingForm() {
  const router = useRouter()
  const [rows, setRows] = useState<AccountRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addRow() {
    setRows((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        tipo: 'NEQUI',
        nombre: 'Nequi',
        balance: '',
      },
    ])
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id))
  }

  function updateRow(
    id: string,
    field: 'tipo' | 'nombre' | 'balance',
    value: string
  ) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        if (field === 'tipo') {
          const tipo = value as AccountTypeValue
          const defaultName =
            ACCOUNT_TYPES.find((t) => t.value === tipo)?.defaultName ?? ''
          return { ...r, tipo, nombre: defaultName }
        }
        return { ...r, [field]: value }
      })
    )
  }

  async function handleSave() {
    setIsLoading(true)
    setError(null)

    try {
      const accounts = rows.map((r) => ({
        tipo: r.tipo,
        nombre: r.nombre.trim() || (ACCOUNT_TYPES.find((t) => t.value === r.tipo)?.defaultName ?? r.tipo),
        balance: Math.round(Number(r.balance)) || 0,
      }))

      const result = await createAccounts(accounts)

      if (!result.success) {
        setError(result.error)
        return
      }

      router.push('/dashboard')
    } finally {
      setIsLoading(false)
    }
  }

  function handleSkip() {
    router.push('/dashboard')
  }

  return (
    <div className="space-y-6">
      {rows.length > 0 && (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.id} className="flex gap-2 items-start">
              <select
                value={row.tipo}
                onChange={(e) => updateRow(row.id, 'tipo', e.target.value)}
                disabled={isLoading}
                className={selectClass}
              >
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <Input
                value={row.nombre}
                onChange={(e) => updateRow(row.id, 'nombre', e.target.value)}
                placeholder="Nombre"
                disabled={isLoading}
                className={inputClass}
              />
              <Input
                value={row.balance}
                onChange={(e) => updateRow(row.id, 'balance', e.target.value)}
                placeholder="$ Balance"
                type="number"
                min="0"
                step="1"
                disabled={isLoading}
                className={`${inputClass} w-32 shrink-0`}
              />
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                disabled={isLoading}
                className="mt-2 text-[#A1A1AA] hover:text-[#FAFAFA] cursor-pointer shrink-0"
                aria-label="Quitar cuenta"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={addRow}
        disabled={isLoading}
        className="flex items-center gap-2 text-sm text-[#0D9488] hover:underline cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        Agregar cuenta
      </button>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="space-y-3">
        <Button
          onClick={handleSave}
          disabled={isLoading}
          className="w-full bg-[#0D9488] hover:bg-[#0F766E] text-white cursor-pointer"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Guardar y continuar'
          )}
        </Button>
        <button
          type="button"
          onClick={handleSkip}
          disabled={isLoading}
          className="w-full text-sm text-[#A1A1AA] hover:text-[#FAFAFA] cursor-pointer"
        >
          Saltar por ahora
        </button>
      </div>
    </div>
  )
}
