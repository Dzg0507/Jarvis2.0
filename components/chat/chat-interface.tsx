"use client"

import { useChat } from "@/hooks/use-chat"
import { ChatMessage } from "./chat-message"
import { ChatInput } from "./chat-input"
import { ThinkingAnimation } from "./thinking-animation"

export function ChatInterface() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, activeTool } = useChat()

  return (
    <div className="relative z-10 flex flex-col w-full max-w-4xl h-[90vh] glass-strong border-primary/30 rounded-lg shadow-lg shadow-primary/20">
      <header className="p-4 border-b border-primary/20 text-center">
        <h1 className="text-2xl font-bold text-glow-cyan">J.A.R.V.I.S.</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {messages.map((m) => (
          <ChatMessage key={m.id} message={m} />
        ))}
        {isLoading && <ThinkingAnimation activeTool={activeTool || "default"} />}
      </div>

      <div className="p-4 border-t border-primary/20">
        <ChatInput
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}