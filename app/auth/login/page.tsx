'use client'

import React, { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/chat'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to sign in. Please verify your credentials.')
      }

      // Success: redirect to destination (e.g. /chat)
      router.push(redirectTo)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign in.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-emerald-950/5 border border-emerald-100 p-8 sm:p-10 relative">
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-5 group">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xl shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform">
            🩺
          </div>
          <span className="font-semibold text-xl tracking-tight text-zinc-900">
            HealthPlus <span className="text-emerald-600 font-serif italic">Clinic</span>
          </span>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Welcome Back</h1>
        <p className="text-sm text-zinc-500 mt-1.5 font-light">
          Sign in to consult with MediBot & manage your appointments
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3.5 rounded-2xl bg-red-50 border border-red-200/80 text-red-700 text-xs font-medium flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-zinc-700 mb-1.5 uppercase tracking-wider">
            Email Address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="patient@example.com"
            disabled={isLoading}
            className="w-full px-4 py-3 bg-[#f8faf9] border border-emerald-200/70 rounded-2xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-zinc-400 text-zinc-900"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider">
              Password
            </label>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
              className="w-full px-4 py-3 bg-[#f8faf9] border border-emerald-200/70 rounded-2xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-zinc-400 text-zinc-900 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-zinc-400 hover:text-zinc-600 cursor-pointer"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-2 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm rounded-2xl shadow-sm shadow-emerald-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span>Sign In to Continue</span>
              <span>→</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-zinc-100 text-center text-xs text-zinc-500">
        Don&apos;t have an account yet?{' '}
        <Link
          href={`/auth/signup?redirectTo=${encodeURIComponent(redirectTo)}`}
          className="font-semibold text-emerald-600 hover:text-emerald-700 underline underline-offset-2 ml-1"
        >
          Create one now
        </Link>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#fafcfb] flex flex-col justify-center items-center px-4 py-12 selection:bg-emerald-100 selection:text-emerald-900">
      <Suspense fallback={<div className="text-zinc-400 text-sm">Loading login...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
