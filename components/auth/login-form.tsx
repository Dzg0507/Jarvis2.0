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

interface LoginFormProps {
  onToggleView: () => void
}

export function LoginForm({ onToggleView }: LoginFormProps) {
  const router = useRouter()

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Add actual authentication logic
    // On success, redirect to the chat page
    router.push("/chat") // Assuming the chat page is at /chat
  }

  return (
    <Card className="glass-strong border-primary/50 shadow-lg shadow-primary/20 transition-all duration-300 hover:shadow-primary/40 hover:border-primary/80">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl text-glow-cyan">Welcome Back</CardTitle>
        <CardDescription>Enter your credentials to access your session</CardDescription>
      </CardHeader>
      <form onSubmit={handleSignIn}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="user@domain.com" required className="glass border-input focus:border-primary" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required className="glass border-input focus:border-primary" />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full neon-glow bg-primary hover:bg-primary/80">
            Sign In
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