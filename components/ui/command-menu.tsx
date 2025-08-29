"use client"

import { Card } from "@/components/ui/card"

interface CommandItem {
  id: string
  name: string
  description: string
  action: () => void
}

interface CommandMenuProps {
  isOpen: boolean
  commands: CommandItem[]
  inputValue: string
  suggestions: string[]
}

export function CommandMenu({ isOpen, commands, inputValue, suggestions }: CommandMenuProps) {
  if (!isOpen) return null

  const filteredCommands = commands.filter((cmd) => cmd.name.toLowerCase().includes(inputValue.toLowerCase().slice(1)))

  return (
    <div className="absolute bottom-36 left-1/2 transform -translate-x-1/2 w-96 z-50">
      <Card className="glass-strong border-purple-500/30 shadow-lg shadow-purple-500/10">
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-purple-400 font-bold text-xs">NEURAL HINTS</h3>
            <span className="text-xs text-muted-foreground">AI Suggestions</span>
          </div>

          {/* Smart Suggestions */}
          <div className="mb-3">
            <p className="text-xs text-purple-300 mb-1">Suggested based on context:</p>
            <div className="space-y-1">
              {suggestions.slice(0, 2).map((suggestion, index) => (
                <div key={index} className="text-xs text-muted-foreground italic">
                  "/{suggestion.toLowerCase().replace(/\s+/g, " ")}"
                </div>
              ))}
            </div>
          </div>

          {/* Available Commands */}
          <div className="space-y-1">
            {filteredCommands.slice(0, 4).map((command) => (
              <div
                key={command.id}
                onClick={command.action}
                className="p-2 rounded glass border-purple-500/20 hover:border-purple-500/40 hover:bg-purple-500/5 cursor-pointer transition-all duration-200 hover:scale-[1.01]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-purple-400 font-mono text-xs font-bold">{command.name}</span>
                  <span className="text-xs text-muted-foreground truncate ml-2">{command.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}
