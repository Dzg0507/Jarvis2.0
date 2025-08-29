"use client"

interface ThinkingAnimationProps {
  activeTool: string
}

export function ThinkingAnimation({ activeTool }: ThinkingAnimationProps) {
  const getToolConfig = () => {
    switch (activeTool) {
      case "video":
        return {
          color: "text-purple-400",
          label: "SCANNING MULTIMEDIA DATABASES",
          animation: "video-scan",
        }
      case "search":
        return {
          color: "text-blue-400",
          label: "CRAWLING NEURAL NETWORKS",
          animation: "network-scan",
        }
      case "memory":
        return {
          color: "text-green-400",
          label: "ACCESSING MEMORY FRAGMENTS",
          animation: "data-pulse",
        }
      case "file":
        return {
          color: "text-yellow-400",
          label: "ANALYZING DOCUMENT STRUCTURE",
          animation: "file-scanner",
        }
      default:
        return {
          color: "text-cyan-400",
          label: "PROCESSING NEURAL PATHWAYS",
          animation: "neural-scan",
        }
    }
  }

  const config = getToolConfig()

  return (
    <div className="flex justify-start">
      <div className="max-w-[70%] p-4 rounded-3xl glass-strong border-secondary text-white shadow-lg shadow-secondary/30">
        <div className="thinking-container">
          <div className={`scanner ${config.animation}`}>
            <div className="scanner-bar"></div>
            <div className="scanner-grid"></div>
            <div className={`scanner-text ${config.color}`}>{config.label}...</div>
          </div>
          <div className="thinking-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    </div>
  )
}
