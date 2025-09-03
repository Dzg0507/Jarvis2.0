'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCheck({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/dashboard')
      } else {
        setChecking(false)
      }
    })
  }, [router])

  if (checking) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white p-4">
        <div className="max-w-md rounded-lg border border-gray-700 bg-gray-900 p-8 text-center shadow-lg animate-pulse">
          <h1 className="mb-4 text-3xl font-bold text-cyan-400">Checking Authentication...</h1>
          <p className="text-gray-300">Please wait while we check your session.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}