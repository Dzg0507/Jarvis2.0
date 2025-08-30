"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { Mail, ArrowLeft, Zap } from "lucide-react"
import Link from "next/link"

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!email) {
      setError("Email address is required")
      return
    }

    setIsLoading(true)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password-confirm`
      })

      if (resetError) {
        throw resetError
      }

      setSuccess("Password reset instructions have been sent to your email.")
    } catch (error: any) {
      setError(error.message || "An error occurred while sending reset instructions")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden flex items-center justify-center">
      {/* Animated background elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-cyan-400 rounded-full particle opacity-30"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 6}s`,
              }}
            />
          ))}
        </div>
        
        <div 
          className="absolute inset-0 grid-overlay opacity-20" 
          style={{
            backgroundImage: `linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      <Link href="/signin" className="absolute top-6 left-6 z-20">
        <Button variant="ghost" className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Sign In
        </Button>
      </Link>

      <div className="relative z-10 w-full max-w-md px-6">
        <Card className="glass-strong border-cyan-500/50 shadow-2xl shadow-cyan-500/20">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-cyan-500/20 border border-cyan-500/50">
                <Zap className="w-8 h-8 text-cyan-400" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-cyan-400 neon-glow">
              Neural Credential Reset
            </CardTitle>
            <CardDescription className="text-gray-300">
              Restore access to your neural interface
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 text-sm">
                  {error}
                </div>
              )}
              
              {success && (
                <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/50 text-green-400 text-sm">
                  {success}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm text-cyan-400 font-medium">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="neural.user@domain.com"
                    className="pl-10 glass border-cyan-500/30 focus:border-cyan-500 bg-black/50 text-white"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-black font-bold py-3 neon-glow transition-all duration-300"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2" />
                    Sending Reset Signal...
                  </div>
                ) : (
                  "Send Reset Instructions"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-400 text-sm">
                Remember your credentials?{" "}
                <Link href="/signin" className="text-cyan-400 hover:text-cyan-300 font-medium">
                  Sign In
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}