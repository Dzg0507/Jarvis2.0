"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { SendHorizonal } from "lucide-react"

interface ChatInputProps {
  input: string
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  isLoading: boolean
}

export function ChatInput({ input, handleInputChange, handleSubmit, isLoading }: ChatInputProps) {
  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-4">
      <Input
        value={input}
        onChange={handleInputChange}
        placeholder="Initiate communication protocol..."
        disabled={isLoading}
        className="flex-1 h-12 text-base glass-strong border-primary/50 focus:border-primary focus:ring-primary/50"
      />
      <Button type="submit" disabled={isLoading || !input.trim()} className="h-12 w-12 p-0 neon-glow bg-primary hover:bg-primary/80" size="icon">
        <SendHorizonal className="w-6 h-6" />
      </Button>
    </form>
  )
}