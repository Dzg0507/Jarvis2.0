"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { MatrixRain } from "@/components/chat/matrix-rain"
import { Particles } from "@/components/ui/particles"
import { cn } from "@/lib/utils"
import { LoginForm } from "@/components/auth/login-form"
import { SignUpForm } from "@/components/auth/signup-form"




function BootingSequence({ onBooted }: { onBooted: () => void }) {
  const [text, setText] = useState("")
  const bootText = "....[SYSTEM ONLINE]....J.A.R.V.I.S....Authentication required."

  useEffect(() => {
    let i = 0
    const typingInterval = setInterval(() => {
      if (i < bootText.length) {
        setText((prev) => prev + bootText.charAt(i))
        i++
      } else {
        clearInterval(typingInterval)
        setTimeout(onBooted, 750)
      }
    }, 50)

    return () => clearInterval(typingInterval)
  }, [onBooted])

  return (
    <div className="font-mono text-lg text-glow-cyan p-4">
      {text}
      <span className="animate-blink">|</span>
    </div>
  )
}

export default function AuthPage() {
  const [isLoginView, setIsLoginView] = useState(true)
  const [isBooted, setIsBooted] = useState(false)
  console.log("Rendering AuthPage");

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        window.location.href = '/chat';
      }
    };

    checkSession();
  }, []);

  const toggleView = () => {
    setIsLoginView(!isLoginView)
  }

  return (
    <main className="relative flex h-screen w-full flex-col items-center justify-center bg-black overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap');
        .font-orbitron { font-family: 'Orbitron', sans-serif; }
        .text-glow-cyan {
          color: #00ffff;
          text-shadow: 0 0 5px rgba(0, 255, 255, 0.7), 0 0 10px rgba(0, 255, 255, 0.5), 0 0 15px rgba(0, 255, 255, 0.3);
        }
        .grid-overlay {
            background-image: url('data:image/svg+xml;utf8,<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="none"/><path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0, 255, 255, 0.1)" stroke-width="1"/></pattern></defs><rect width="100%" height="100%" fill="url(%23grid)" /></svg>');
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-in.fade-in { animation: fadeIn 0.7s ease-in-out; }
        @keyframes blink { 50% { opacity: 0; } }
        .animate-blink { animation: blink 1s step-end infinite; }
      `}</style>

      <MatrixRain />
      <Particles className="absolute inset-0 -z-10" quantity={150} />
      <div className="absolute inset-0 grid-overlay z-0 opacity-30" />

      {/* Enhanced Background Effects */}
      <div className="absolute inset-0 z-5 pointer-events-none">
        <div className="scanlines"></div>
        {/* Floating Particles */}
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-matrix-cyan rounded-full opacity-40 animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      <div
        className="z-10 flex flex-col items-center text-center transition-opacity duration-1000"
        style={{ opacity: isBooted ? 1 : 0 }}
      >
        <h1 className={cn("text-6xl font-bold text-glow-cyan mb-4 float-animation", "font-orbitron")}>
          J.A.R.V.I.S
        </h1>
        <p className="text-lg text-glow-purple mb-8 color-shift">Just A Rather Very Intelligent System</p>

        <div className="w-full max-w-md">
          <div key={isLoginView ? "login" : "signup"} className="animate-in fade-in duration-700">
            {isLoginView ? <LoginForm onToggleView={toggleView} /> : <SignUpForm onToggleView={toggleView} />}
          </div>
        </div>
      </div>

      {!isBooted && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black">
          <BootingSequence onBooted={() => setIsBooted(true)} />
        </div>
      )}
    </main>
  )
}
