"use client"

import { useState, useEffect } from "react"
import { createClient } from "../../lib/supabase/client"

// --- Helper Components ---
const MatrixRain = () => <div className="absolute inset-0 bg-black z-[-2]"></div>;
const Particles = ({ className, quantity }: { className?: string, quantity?: number }) => <div className={className}></div>;
const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

// --- New, Styled Login Form ---
const LoginForm = ({ onToggleView }: { onToggleView: () => void }) => (
    <div className="p-8 border border-cyan-500/30 rounded-lg bg-black/50 backdrop-blur-sm space-y-6">
        <h2 className="text-2xl font-orbitron text-glow-cyan text-center">System Access</h2>
        <form action="/api/login" method="POST" className="space-y-4">
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-cyan-200/80 mb-1">Operator ID (Email)</label>
                <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    className="w-full bg-cyan-900/20 border border-cyan-500/30 rounded-md p-2 text-cyan-300 placeholder-cyan-500/50 focus:ring-2 focus:ring-cyan-400 focus:outline-none"
                />
            </div>
            <div>
                <label htmlFor="password"className="block text-sm font-medium text-cyan-200/80 mb-1">Password</label>
                <input
                    type="password"
                    id="password"
                    name="password"
                    required
                    className="w-full bg-cyan-900/20 border border-cyan-500/30 rounded-md p-2 text-cyan-300 placeholder-cyan-500/50 focus:ring-2 focus:ring-cyan-400 focus:outline-none"
                />
            </div>
            <button type="submit" className="w-full bg-cyan-500/20 border border-cyan-500 text-cyan-300 font-bold py-2 rounded-md hover:bg-cyan-500/40 transition-colors duration-300">
                Authenticate
            </button>
        </form>
        <p className="text-center text-sm text-gray-400">
            Need access? <button onClick={onToggleView} className="text-cyan-400 hover:underline">Authorize a new user</button>
        </p>
    </div>
);

// --- New, Styled Sign Up Form ---
const SignUpForm = ({ onToggleView }: { onToggleView: () => void }) => (
    <div className="p-8 border border-cyan-500/30 rounded-lg bg-black/50 backdrop-blur-sm space-y-6">
        <h2 className="text-2xl font-orbitron text-glow-cyan text-center">New User Authorization</h2>
        <form action="/api/signup" method="POST" className="space-y-4">
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-cyan-200/80 mb-1">Operator ID (Email)</label>
                <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    className="w-full bg-cyan-900/20 border border-cyan-500/30 rounded-md p-2 text-cyan-300 placeholder-cyan-500/50 focus:ring-2 focus:ring-cyan-400 focus:outline-none"
                />
            </div>
            <div>
                <label htmlFor="password"className="block text-sm font-medium text-cyan-200/80 mb-1">Password</label>
                <input
                    type="password"
                    id="password"
                    name="password"
                    required
                    className="w-full bg-cyan-900/20 border border-cyan-500/30 rounded-md p-2 text-cyan-300 placeholder-cyan-500/50 focus:ring-2 focus:ring-cyan-400 focus:outline-none"
                />
            </div>
             <button type="submit" className="w-full bg-cyan-500/20 border border-cyan-500 text-cyan-300 font-bold py-2 rounded-md hover:bg-cyan-500/40 transition-colors duration-300">
                Register Operator
            </button>
        </form>
        <p className="text-center text-sm text-gray-400">
            Already authorized? <button onClick={onToggleView} className="text-cyan-400 hover:underline">Access System</button>
        </p>
    </div>
);


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
  const supabase = createClient();
  
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        window.location.href = '/chat';
      }
    };

    checkSession();
  }, [supabase]);

  const toggleView = () => setIsLoginView(!isLoginView)

  return (
    <main className="relative flex h-screen w-full flex-col items-center justify-center bg-background overflow-hidden">
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
      <Particles className="absolute inset-0 -z-10" quantity={100} />
      <div className="absolute inset-0 grid-overlay z-0" />

      <div
        className="z-10 flex flex-col items-center text-center transition-opacity duration-1000"
        style={{ opacity: isBooted ? 1 : 0 }}
      >
        <h1 className={cn("text-6xl font-bold text-glow-cyan mb-4", "font-orbitron")}>
          J.A.R.V.I.S
        </h1>
        <p className="text-lg text-muted-foreground mb-8">Just A Rather Very Intelligent System</p>

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
