'use client'

import React, { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/chat'

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          phone,
          email,
          password,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to sign up. Please try again.')
      }

      // If user session is created immediately (Supabase email confirm off)
      if (data.session) {
        router.push(redirectTo)
        router.refresh()
      } else {
        // In case email confirmation is required by Supabase settings:
        // Automatically attempt login or redirect with prompt
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        const loginData = await loginRes.json()

        if (loginRes.ok && loginData.success) {
          router.push(redirectTo)
          router.refresh()
        } else {
          // If Supabase requires email confirmation
          alert('Account created! Please check your email or proceed to sign in.')
          router.push(`/auth/login?redirectTo=${encodeURIComponent(redirectTo)}`)
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign up.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-emerald-950/5 border border-emerald-100 p-8 sm:p-10 relative">
      <div className="text-center mb-7">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-5 group">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xl shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform">
            🩺
          </div>
          <span className="font-semibold text-xl tracking-tight text-zinc-900">
            HealthPlus <span className="text-emerald-600 font-serif italic">Clinic</span>
          </span>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Create an Account</h1>
        <p className="text-sm text-zinc-500 mt-1.5 font-light">
          Sign up once to chat with MediBot and securely book appointments
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200/80 text-red-700 text-xs font-medium flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="block text-xs font-semibold text-zinc-700 mb-1 uppercase tracking-wider">
            Full Name
          </label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Anshika Sharma"
            disabled={isLoading}
            className="w-full px-4 py-2.5 bg-[#f8faf9] border border-emerald-200/70 rounded-2xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-zinc-400 text-zinc-900"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-700 mb-1 uppercase tracking-wider">
            Phone Number
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 9876543210"
            disabled={isLoading}
            className="w-full px-4 py-2.5 bg-[#f8faf9] border border-emerald-200/70 rounded-2xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-zinc-400 text-zinc-900"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-700 mb-1 uppercase tracking-wider">
            Email Address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="patient@example.com"
            disabled={isLoading}
            className="w-full px-4 py-2.5 bg-[#f8faf9] border border-emerald-200/70 rounded-2xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-zinc-400 text-zinc-900"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-700 mb-1 uppercase tracking-wider">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-[#f8faf9] border border-emerald-200/70 rounded-2xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-zinc-400 text-zinc-900 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-zinc-400 hover:text-zinc-600 cursor-pointer"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-700 mb-1 uppercase tracking-wider">
            Confirm Password
          </label>
          <input
            type={showPassword ? 'text' : 'password'}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter password"
            disabled={isLoading}
            className="w-full px-4 py-2.5 bg-[#f8faf9] border border-emerald-200/70 rounded-2xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-zinc-400 text-zinc-900"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-3 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm rounded-2xl shadow-sm shadow-emerald-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span>Create Account & Start Chat</span>
              <span>→</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-7 pt-5 border-t border-zinc-100 text-center text-xs text-zinc-500">
        Already have an account?{' '}
        <Link
          href={`/auth/login?redirectTo=${encodeURIComponent(redirectTo)}`}
          className="font-semibold text-emerald-600 hover:text-emerald-700 underline underline-offset-2 ml-1"
        >
          Sign in here
        </Link>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-[#fafcfb] flex flex-col justify-center items-center px-4 py-12 selection:bg-emerald-100 selection:text-emerald-900">
      <Suspense fallback={<div className="text-zinc-400 text-sm">Loading signup...</div>}>
        <SignupForm />
      </Suspense>
    </div>
  )
}
