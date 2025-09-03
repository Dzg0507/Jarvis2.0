"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { useState } from "react"

interface LoginFormProps {
  onToggleView: () => void
}

export function LoginForm({ onToggleView }: LoginFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Successful login
        router.push(data.redirectTo || '/chat')
      } else {
        // Handle error
        setError(data.error || 'Sign in failed. Please check your credentials.')
      }
    } catch (error) {
      console.error('Sign in error:', error)
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="matrix-card border-animated shadow-lg shadow-matrix-green/20 transition-all duration-300 hover:shadow-matrix-green/40">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl text-glow-cyan float-animation">Welcome Back</CardTitle>
        <CardDescription className="text-glow-purple">Enter your credentials to access your session</CardDescription>
      </CardHeader>
      <form onSubmit={handleSignIn}>
        <CardContent className="space-y-4">
          {error && (
            <div className="text-red-500 text-sm text-center bg-red-500/10 border border-red-500/20 rounded p-2">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="user@domain.com"
              required
              className="terminal-input border-matrix-green/50 focus:border-matrix-green"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              className="terminal-input border-matrix-green/50 focus:border-matrix-green"
              disabled={loading}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            className="w-full neon-glow bg-primary hover:bg-primary/80"
            disabled={loading}
          >
            {loading ? "Signing In..." : "Sign In"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Button variant="link" type="button" onClick={onToggleView} className="p-0 h-auto text-secondary hover:text-secondary/80">
              Sign Up
            </Button>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
