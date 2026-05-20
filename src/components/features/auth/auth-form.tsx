'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
// zod/v3 import: @hookform/resolvers v5 was built against zod@3.25 (which ships v4 as a preview).
// Importing from zod/v3 satisfies the Zod3Type overload and avoids minor-version mismatch.
import { z } from 'zod/v3'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { checkEmail } from '@/server/actions/auth/check-email'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

type Step = 'email' | 'login' | 'register' | 'confirm'

const emailSchema = z.object({
  email: z.string().email('Ingresa un correo válido'),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

const registerSchema = z.object({
  email: z.string().email(),
  nombre: z.string().min(2, 'Ingresa tu nombre'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

type EmailValues = z.infer<typeof emailSchema>
type LoginValues = z.infer<typeof loginSchema>
type RegisterValues = z.infer<typeof registerSchema>

const inputClass =
  'bg-[#18181B] border-[#27272A] text-[#FAFAFA] placeholder:text-[#A1A1AA] focus-visible:ring-[#0D9488]'

const labelClass = 'text-[#FAFAFA]'

export function AuthForm() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('email')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const emailForm = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  })
  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })
  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', nombre: '', password: '' },
  })

  const currentEmail =
    step === 'email'
      ? emailForm.watch('email')
      : step === 'login'
        ? loginForm.watch('email')
        : registerForm.watch('email')

  async function handleEmailSubmit({ email }: EmailValues) {
    setIsLoading(true)
    setServerError(null)
    const { exists } = await checkEmail(email)
    loginForm.setValue('email', email)
    registerForm.setValue('email', email)
    setStep(exists ? 'login' : 'register')
    setIsLoading(false)
  }

  function handleResetEmail() {
    setStep('email')
    setServerError(null)
    setShowPassword(false)
    loginForm.reset()
    registerForm.reset()
  }

  async function handleLoginSubmit({ email, password }: LoginValues) {
    setIsLoading(true)
    setServerError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setServerError('Correo o contraseña incorrectos')
      setIsLoading(false)
      return
    }
    router.push('/dashboard')
  }

  async function handleRegisterSubmit({ email, nombre, password }: RegisterValues) {
    setIsLoading(true)
    setServerError(null)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: nombre } },
    })
    if (error) {
      setServerError('Algo salió mal. Intenta de nuevo.')
      setIsLoading(false)
      return
    }
    if (data.session) {
      router.push('/dashboard')
    } else {
      setStep('confirm')
      setIsLoading(false)
    }
  }

  const subtitle: Record<Step, string> = {
    email: 'Tus finanzas, tu control',
    login: 'Bienvenido de vuelta',
    register: 'Crea tu cuenta',
    confirm: 'Revisa tu correo',
  }

  const animationClass =
    'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-200'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2 text-center">
        <div className="flex items-center justify-center gap-2">
          <Lock className="w-5 h-5 text-[#0D9488]" aria-hidden="true" />
          <h1 className="text-2xl font-semibold text-[#FAFAFA]">Caleta</h1>
        </div>
        <p className="text-sm text-[#A1A1AA]">{subtitle[step]}</p>
      </div>

      {/* Step: email */}
      {step === 'email' && (
        <Form {...emailForm}>
          <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="space-y-4">
            <FormField
              control={emailForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={labelClass}>Correo electrónico</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="tu@correo.com"
                      disabled={isLoading}
                      className={inputClass}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#0D9488] hover:bg-[#0F766E] text-white cursor-pointer"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Continuar'}
            </Button>
          </form>
        </Form>
      )}

      {/* Step: login */}
      {step === 'login' && (
        <Form {...loginForm}>
          <form
            onSubmit={loginForm.handleSubmit(handleLoginSubmit)}
            className={`space-y-4 ${animationClass}`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#FAFAFA] truncate">{currentEmail}</p>
              <button
                type="button"
                onClick={handleResetEmail}
                className="text-xs text-[#0D9488] hover:underline cursor-pointer ml-2 shrink-0"
              >
                Cambiar
              </button>
            </div>
            <FormField
              control={loginForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={labelClass}>Contraseña</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        disabled={isLoading}
                        className={`${inputClass} pr-10`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-[#FAFAFA] cursor-pointer"
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {serverError && <p className="text-sm text-red-400">{serverError}</p>}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#0D9488] hover:bg-[#0F766E] text-white cursor-pointer"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Iniciar sesión'}
            </Button>
          </form>
        </Form>
      )}

      {/* Step: register */}
      {step === 'register' && (
        <Form {...registerForm}>
          <form
            onSubmit={registerForm.handleSubmit(handleRegisterSubmit)}
            className={`space-y-4 ${animationClass}`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#FAFAFA] truncate">{currentEmail}</p>
              <button
                type="button"
                onClick={handleResetEmail}
                className="text-xs text-[#0D9488] hover:underline cursor-pointer ml-2 shrink-0"
              >
                Cambiar
              </button>
            </div>
            <FormField
              control={registerForm.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={labelClass}>Tu nombre</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="text"
                      autoComplete="name"
                      disabled={isLoading}
                      className={inputClass}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={registerForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={labelClass}>Contraseña</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        disabled={isLoading}
                        className={`${inputClass} pr-10`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-[#FAFAFA] cursor-pointer"
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {serverError && <p className="text-sm text-red-400">{serverError}</p>}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#0D9488] hover:bg-[#0F766E] text-white cursor-pointer"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear cuenta'}
            </Button>
          </form>
        </Form>
      )}

      {/* Step: confirm email */}
      {step === 'confirm' && (
        <div className={`space-y-4 text-center ${animationClass}`}>
          <div className="rounded-xl border border-[#27272A] bg-[#18181B] p-6 space-y-3">
            <p className="text-[#FAFAFA] text-sm">
              Te enviamos un correo de confirmación. Revisá tu bandeja de entrada y hace clic en el enlace para activar tu cuenta.
            </p>
            <p className="text-[#A1A1AA] text-xs">
              ¿No llegó? Revisá la carpeta de spam.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetEmail}
            className="text-xs text-[#0D9488] hover:underline cursor-pointer"
          >
            Volver al inicio
          </button>
        </div>
      )}
    </div>
  )
}
