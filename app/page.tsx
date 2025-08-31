"use client";

import { useState, useEffect } from 'react';

// --- Placeholder Components (replace with your actual imports from your project) ---
const MatrixRain = () => <div className="absolute inset-0 bg-black z-[-2]"></div>;
const Particles = ({ className, quantity }: { className?: string, quantity?: number }) => <div className={className}></div>;
const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');
// --- End Placeholder Components ---

// The BootingSequence component, updated with a new "portal" animation
function BootingSequence({ onBooted }: { onBooted: () => void }) {
  // Text is now an array of lines to animate individually
  const bootLines = [
    "INITIALIZING SYSTEM...",
    "LOADING CORE MODULES...",
    "ESTABLISHING SECURE CONNECTION...",
    "CALIBRATING SENSORS...",
    "ENGAGING AI PROTOCOLS...",
    "[SYSTEM ONLINE]",
    "J.A.R.V.I.S.",
    "AUTHENTICATION CONFIRMED.",
    "ACCESS GRANTED."
  ];

  useEffect(() => {
    // Total animation time = (last line delay) + (animation duration) + (extra pause)
    // (3 * 600ms) + 800ms + 1500ms = 1800 + 800 + 1500 = 4100ms
    const totalAnimationTime = (bootLines.length - 1) * 600 + 800 + 1500;
    
    const bootTimer = setTimeout(onBooted, totalAnimationTime);

    return () => clearTimeout(bootTimer);
  }, [onBooted, bootLines.length]);

  return (
    <div className="font-mono text-2xl text-glow-cyan text-center flex flex-col items-center">
      {bootLines.map((line, index) => (
        <span
          key={index}
          className="portal-line"
          style={{ animationDelay: `${index * 0.6}s` }}
        >
          {line}
        </span>
      ))}
    </div>
  );
}


export default function AuthCallbackPage() {
  const [isBooted, setIsBooted] = useState(false);

  useEffect(() => {
    if (isBooted) {
      const timer = setTimeout(() => {
        // Use a full URL for the redirect to prevent errors.
        window.location.href = `${window.location.origin}/auth`; 
      }, 4000); // Increased delay to allow user to read the message

      return () => clearTimeout(timer);
    }
  }, [isBooted]);

  return (
    <main className="relative flex h-screen w-full flex-col items-center justify-center bg-background overflow-hidden">
        {/* These styles are copied from your AuthPage for consistency */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap');
        
        body { background-color: #000; color: #fff; }
        
        .font-orbitron {
            font-family: 'Orbitron', sans-serif;
        }

        .text-glow-cyan {
          color: #00ffff;
          text-shadow: 0 0 5px rgba(0, 255, 255, 0.7), 0 0 10px rgba(0, 255, 255, 0.5), 0 0 15px rgba(0, 255, 255, 0.3);
        }

         .grid-overlay {
            background-image: url('data:image/svg+xml;utf8,<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="smallGrid" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M 8 0 L 0 0 0 8" fill="none" stroke="rgba(0, 255, 255, 0.1)" stroke-width="0.5"/></pattern><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="url(%23smallGrid)"/><path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0, 255, 255, 0.2)" stroke-width="1"/></pattern></defs><rect width="100%" height="100%" fill="url(%23grid)" /></svg>');
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-in.fade-in { animation: fadeIn 0.7s ease-in-out; }

        /* --- New Animation for the Portal Effect --- */
        @keyframes portal-shoot-in {
          0% {
            opacity: 0;
            transform: scale(2.5) rotateZ(-25deg);
            filter: blur(8px) brightness(2.5);
          }
          70% {
            opacity: 1;
            transform: scale(0.9) rotateZ(3deg);
            filter: blur(1px) brightness(1.5);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotateZ(0deg);
            filter: blur(0) brightness(1);
          }
        }

        .portal-line {
          display: block;
          margin-bottom: 0.5em;
          opacity: 0; /* Start hidden */
          animation: portal-shoot-in 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }

      `}</style>
      
      <MatrixRain />
      <Particles className="absolute inset-0 z-[-1]" quantity={100} />
      <div className="absolute inset-0 grid-overlay z-0" />

      <div className="w-full max-w-2xl p-8 space-y-6 z-10">
        {!isBooted ? (
           <div className="absolute inset-0 flex items-center justify-center z-20 bg-black">
             <BootingSequence onBooted={() => setIsBooted(true)} />
           </div>
        ) : (
          <div className="text-center animate-in fade-in">
            <svg
              className="w-20 h-20 mx-auto text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            
            <h1 className={cn("mt-4 text-4xl font-bold text-glow-cyan", "font-orbitron")}>
              Account Activated
            </h1>
            <p className="mt-2 text-gray-300">
              Welcome. Your credentials have been verified.
            </p>
            <p className="mt-4 text-sm text-gray-500">
              Redirecting to login portal...
            </p>
          </div>
        )}
      </div>
    </main>
  );
};

