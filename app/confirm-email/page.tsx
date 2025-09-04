'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function ConfirmEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle')

  useEffect(() => {
    if (searchParams) {
      const access_token = searchParams.get('access_token')
      const refresh_token = searchParams.get('refresh_token')
      if (access_token && refresh_token) {
        setStatus('checking')
        const supabase = createClient()
        supabase.auth.setSession({
          access_token,
          refresh_token,
        }).then(({ error }: { error: any }) => {
          if (error) {
            setStatus('error')
          } else {
            setStatus('success')
            router.replace('/chat')
          }
        })
      }
    }
  }, [searchParams, router])

  if (status === 'checking') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white p-4">
        <div className="max-w-md rounded-lg border border-gray-700 bg-gray-900 p-8 text-center shadow-lg">
          <h1 className="mb-4 text-3xl font-bold text-cyan-400">Redirecting...</h1>
          <p className="text-gray-300">You are being redirected to your dashboard.</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white p-4">
        <div className="max-w-md rounded-lg border border-gray-700 bg-gray-900 p-8 text-center shadow-lg">
          <h1 className="mb-4 text-3xl font-bold text-red-400">Error</h1>
          <p className="text-gray-300">There was a problem confirming your email. Please try logging in.</p>
        </div>
      </div>
    )
  }

  // Default: no tokens in URL, show instructions
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white p-4">
      <div className="max-w-md rounded-lg border border-gray-700 bg-gray-900 p-8 text-center shadow-lg">
        <h1 className="mb-4 text-3xl font-bold text-cyan-400">Check Your Email</h1>
        <p className="text-gray-300">
          We've sent a confirmation link to your email address. Please click the
          link in that email to complete your registration.
        </p>
      </div>
    </div>
  )
}

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-cyan-400">Loading...</p>
        </div>
      </div>
    }>
      <ConfirmEmailContent />
    </Suspense>
  )
}
