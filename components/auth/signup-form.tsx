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

interface SignUpFormProps {
  onToggleView: () => void
}

export function SignUpForm({ onToggleView }: SignUpFormProps) {
  const router = useRouter()

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Add actual registration logic
    // On success, you might want to log them in and redirect,
    // or just switch to the login view.
    onToggleView() // Switch to login view after signing up
  }

  return (
    <Card className="glass-strong border-accent/50 shadow-lg shadow-accent/20 transition-all duration-300 hover:shadow-accent/40 hover:border-accent/80">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl text-glow-purple">Create an Account</CardTitle>
        <CardDescription>Join the network to begin your journey</CardDescription>
      </CardHeader>
      <form onSubmit={handleSignUp}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" type="text" placeholder="Cyber Runner" required className="glass border-input focus:border-accent" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="user@domain.com" required className="glass border-input focus:border-accent" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required className="glass border-input focus:border-accent" />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full neon-glow bg-accent hover:bg-accent/80">
            Sign Up
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