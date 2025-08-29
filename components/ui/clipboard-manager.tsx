"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { X } from "lucide-react"

interface ClipboardItem {
  id: string
  content: string
  type: "text" | "code" | "url" | "email" | "number" | "color" | "snippet"
  timestamp: Date
}

interface ClipboardManagerProps {
  isOpen: boolean
  onClose: () => void
  items: ClipboardItem[]
  onItemClick: (content: string) => void
  onClear: () => void
}

export function ClipboardManager({ isOpen, onClose, items, onItemClick, onClear }: ClipboardManagerProps) {
  const [searchTerm, setSearchTerm] = useState("")

  const detectContentType = (text: string): ClipboardItem["type"] => {
    if (text.match(/^https?:\/\//)) return "url"
    if (text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/)) return "email"
    if (text.match(/^\d+$/)) return "number"
    if (text.match(/^[A-F0-9]{6}$/i)) return "color"
    if (text.includes("function") || text.includes("const") || text.includes("=>")) return "code"
    if (text.length > 100) return "text"
    return "snippet"
  }

  const getTimeAgo = (timestamp: Date): string => {
    const seconds = Math.floor((Date.now() - timestamp.getTime()) / 1000)
    if (seconds < 60) return "now"
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  const filteredItems = items.filter((item) => item.content.toLowerCase().includes(searchTerm.toLowerCase()))

  if (!isOpen) return null

  return (
    <div className="absolute top-16 right-8 w-80 max-h-96 z-50">
      <Card className="glass-strong border-green-500/50 shadow-2xl shadow-green-500/20">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-green-400 font-bold text-sm">MEMORY FRAGMENTS</h3>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={onClear}
                className="text-red-400 hover:text-red-300 h-6 px-2 text-xs transition-all duration-300 hover:shadow-lg hover:shadow-red-400/30"
              >
                PURGE
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onClose}
                className="text-green-400 hover:text-green-300 h-6 px-2 transition-all duration-300 hover:shadow-lg hover:shadow-green-400/30"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>

          <Input
            placeholder="Search fragments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-3 h-8 text-xs glass border-green-500/30 focus:border-green-500 transition-all duration-300"
          />

          <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => onItemClick(item.content)}
                className="p-2 rounded glass border-green-500/20 hover:border-green-500/50 cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-green-500/30 hover:scale-[1.02]"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-green-400 font-bold uppercase">{item.type}</span>
                  <span className="text-xs text-muted-foreground">{getTimeAgo(item.timestamp)}</span>
                </div>
                <p className="text-xs text-white truncate font-mono">{item.content}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}
