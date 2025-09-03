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

interface SignUpFormProps {
  onToggleView: () => void
}

export function SignUpForm({ onToggleView }: SignUpFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Successful signup
        if (data.requiresConfirmation) {
          router.push('/confirm-email')
        } else {
          router.push(data.redirectTo || '/chat')
        }
      } else {
        // Handle error
        setError(data.error || 'Sign up failed. Please try again.')
      }
    } catch (error) {
      console.error('Sign up error:', error)
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="matrix-card border-animated shadow-lg shadow-matrix-purple/20 transition-all duration-300 hover:shadow-matrix-purple/40">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl text-glow-purple float-animation">Create an Account</CardTitle>
        <CardDescription className="text-glow-orange">Join the network to begin your journey</CardDescription>
      </CardHeader>
      <form onSubmit={handleSignUp}>
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
              className="glass border-input focus:border-accent"
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
              minLength={8}
              className="glass border-input focus:border-accent"
              disabled={loading}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            className="w-full neon-glow bg-accent hover:bg-accent/80"
            disabled={loading}
          >
            {loading ? "Creating Account..." : "Sign Up"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Button variant="link" type="button" onClick={onToggleView} className="p-0 h-auto text-secondary hover:text-secondary/80">
              Sign In
            </Button>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
