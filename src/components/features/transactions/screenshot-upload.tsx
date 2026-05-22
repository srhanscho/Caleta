'use client'

import { useState, useTransition, useRef } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  extractTransaction,
  deleteTransaction,
} from '@/server/actions/transactions/extract-transaction'

type Account = {
  id: string
  nombre: string
  tipo: string
  color: string
}

type Props = {
  accounts: Account[]
}

type UIState = 'select-account' | 'select-image' | 'processing'

const typeLabel: Record<string, string> = {
  NEQUI: 'Nequi',
  DAVIPLATA: 'Daviplata',
  BANCOLOMBIA: 'Bancolombia',
  NUBANK: 'Nubank',
  EFECTIVO: 'Efectivo',
  OTRO: 'Otro',
}

export function ScreenshotUpload({ accounts }: Props) {
  const [uiState, setUiState] = useState<UIState>('select-account')
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  function reset() {
    setUiState('select-account')
    setSelectedAccountId(null)
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleAccountSelect(id: string) {
    setSelectedAccountId(id)
    setUiState('select-image')
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function handleAnalyze() {
    if (!imageFile || !selectedAccountId) return
    setUiState('processing')

    const formData = new FormData()
    formData.append('file', imageFile)
    formData.append('accountId', selectedAccountId)

    startTransition(async () => {
      const result = await extractTransaction(formData)

      if (!result.success) {
        toast.error(result.error)
        setUiState('select-image')
        return
      }

      const transactionId = result.data.id

      toast.success('Transacción guardada', {
        duration: 5000,
        action: {
          label: 'Deshacer',
          onClick: () => {
            startTransition(async () => {
              const undoResult = await deleteTransaction(transactionId)
              if (!undoResult.success) toast.error(undoResult.error)
            })
          },
        },
      })

      reset()
    })
  }

  // ── Estado 1: selección de cuenta ────────────────────────────────────────
  if (uiState === 'select-account') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Selecciona la cuenta del comprobante
        </p>
        <div className="flex flex-wrap gap-3">
          {accounts.map((account) => (
            <button
              key={account.id}
              type="button"
              onClick={() => handleAccountSelect(account.id)}
              className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors active:scale-95"
            >
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ background: account.color }}
                aria-hidden="true"
              />
              {account.nombre}
              <span className="text-xs text-muted-foreground">
                {typeLabel[account.tipo] ?? account.tipo}
              </span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── Estado 3: procesando ─────────────────────────────────────────────────
  if (uiState === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Analizando comprobante...</p>
      </div>
    )
  }

  // ── Estado 2: selección de imagen ────────────────────────────────────────
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId)

  return (
    <div className="space-y-6">
      {selectedAccount && (
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ background: selectedAccount.color }}
            aria-hidden="true"
          />
          <span className="text-sm text-muted-foreground">{selectedAccount.nombre}</span>
          <button
            type="button"
            onClick={reset}
            className="ml-auto text-xs text-primary"
          >
            Cambiar
          </button>
        </div>
      )}

      <label
        htmlFor="screenshot"
        className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card p-10 cursor-pointer transition-colors active:bg-secondary"
      >
        {imagePreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imagePreview}
            alt="Vista previa del comprobante"
            className="max-h-64 rounded-xl object-contain"
          />
        ) : (
          <>
            <Camera className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground text-center">
              Toca para subir o tomar una foto del comprobante
            </p>
          </>
        )}
      </label>
      <input
        id="screenshot"
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={handleFileChange}
      />

      <button
        type="button"
        onClick={handleAnalyze}
        disabled={!imageFile}
        className="w-full rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
      >
        Analizar
      </button>
    </div>
  )
}
