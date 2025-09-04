'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import './splash.css';

export default function SplashScreen() {
  const [currentStage, setCurrentStage] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const stages = [
      { duration: 1500, name: 'gears' },      // 0-1.5s: Gear Mechanics
      { duration: 1000, name: 'matrix' },     // 1.5-2.5s: Matrix Boot
      { duration: 1500, name: 'circuits' },   // 2.5-4s: Circuit Awakening
      { duration: 1000, name: 'glitch' }      // 4-5s: Glitch Transition
    ];

    let totalTime = 0;
    stages.forEach((stage, index) => {
      setTimeout(() => {
        setCurrentStage(index);
      }, totalTime);
      totalTime += stage.duration;
    });

    // Complete splash and transition to main app
    setTimeout(() => {
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        (window as any).electronAPI.splashComplete();
      } else {
        // Fallback for web version
        router.push('/chat');
      }
    }, totalTime);

  }, [router]);

  return (
    <div className="splash-container">
      {/* Stage 1: Gear Mechanics (0-1.5s) */}
      <div className={`stage stage-gears ${currentStage >= 0 ? 'active' : ''}`}>
        <div className="gears-container">
          <svg className="gear gear-1" viewBox="0 0 100 100" width="120" height="120">
            <circle cx="50" cy="50" r="35" fill="none" stroke="#00ff41" strokeWidth="2"/>
            <g className="gear-teeth">
              {Array.from({ length: 12 }, (_, i) => (
                <rect
                  key={i}
                  x="48"
                  y="10"
                  width="4"
                  height="8"
                  fill="#00ff41"
                  transform={`rotate(${i * 30} 50 50)`}
                />
              ))}
            </g>
            <circle cx="50" cy="50" r="8" fill="#00ff41"/>
          </svg>
          
          <svg className="gear gear-2" viewBox="0 0 100 100" width="80" height="80">
            <circle cx="50" cy="50" r="25" fill="none" stroke="#00ff41" strokeWidth="2"/>
            <g className="gear-teeth">
              {Array.from({ length: 8 }, (_, i) => (
                <rect
                  key={i}
                  x="48"
                  y="20"
                  width="4"
                  height="6"
                  fill="#00ff41"
                  transform={`rotate(${i * 45} 50 50)`}
                />
              ))}
            </g>
            <circle cx="50" cy="50" r="6" fill="#00ff41"/>
          </svg>
          
          <svg className="gear gear-3" viewBox="0 0 100 100" width="60" height="60">
            <circle cx="50" cy="50" r="20" fill="none" stroke="#00ff41" strokeWidth="2"/>
            <g className="gear-teeth">
              {Array.from({ length: 6 }, (_, i) => (
                <rect
                  key={i}
                  x="48"
                  y="25"
                  width="4"
                  height="5"
                  fill="#00ff41"
                  transform={`rotate(${i * 60} 50 50)`}
                />
              ))}
            </g>
            <circle cx="50" cy="50" r="5" fill="#00ff41"/>
          </svg>
        </div>
      </div>

      {/* Stage 2: Matrix Boot Sequence (1.5-2.5s) */}
      <div className={`stage stage-matrix ${currentStage >= 1 ? 'active' : ''}`}>
        <div className="matrix-container">
          {Array.from({ length: 20 }, (_, i) => (
            <div key={i} className={`matrix-column column-${i}`}>
              <div className="matrix-chars">
                {Array.from({ length: 15 }, (_, j) => (
                  <span key={j} className="matrix-char">
                    {String.fromCharCode(0x30A0 + Math.random() * 96)}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="boot-text">
          <div className="boot-line">INITIALIZING JARVIS PROTOCOL...</div>
          <div className="boot-line">LOADING NEURAL NETWORKS...</div>
          <div className="boot-line">ESTABLISHING QUANTUM LINK...</div>
          <div className="boot-line">SYSTEM READY</div>
        </div>
      </div>

      {/* Stage 3: Circuit Awakening (2.5-4s) */}
      <div className={`stage stage-circuits ${currentStage >= 2 ? 'active' : ''}`}>
        <svg className="circuit-board" viewBox="0 0 800 600" width="100%" height="100%">
          {/* Main circuit paths */}
          <path
            className="circuit-path path-1"
            d="M100,300 L200,300 L200,200 L400,200 L400,100 L600,100"
            fill="none"
            stroke="#00ff41"
            strokeWidth="3"
          />
          <path
            className="circuit-path path-2"
            d="M100,400 L300,400 L300,500 L500,500 L500,300 L700,300"
            fill="none"
            stroke="#00ffff"
            strokeWidth="3"
          />
          <path
            className="circuit-path path-3"
            d="M200,100 L200,250 L450,250 L450,450 L650,450"
            fill="none"
            stroke="#ff00ff"
            strokeWidth="2"
          />
          
          {/* Circuit nodes */}
          <circle className="circuit-node node-1" cx="200" cy="200" r="8" fill="#00ff41"/>
          <circle className="circuit-node node-2" cx="400" cy="100" r="6" fill="#00ff41"/>
          <circle className="circuit-node node-3" cx="300" cy="400" r="8" fill="#00ffff"/>
          <circle className="circuit-node node-4" cx="500" cy="300" r="6" fill="#00ffff"/>
          <circle className="circuit-node node-5" cx="450" cy="250" r="7" fill="#ff00ff"/>
          <circle className="circuit-node node-6" cx="650" cy="450" r="5" fill="#ff00ff"/>
        </svg>
      </div>

      {/* Stage 4: Glitch Transition (4-5s) */}
      <div className={`stage stage-glitch ${currentStage >= 3 ? 'active' : ''}`}>
        <div className="glitch-overlay">
          <div className="glitch-layer glitch-1"></div>
          <div className="glitch-layer glitch-2"></div>
          <div className="glitch-layer glitch-3"></div>
        </div>
        <div className="glitch-text">
          <span className="glitch-char">J</span>
          <span className="glitch-char">A</span>
          <span className="glitch-char">R</span>
          <span className="glitch-char">V</span>
          <span className="glitch-char">I</span>
          <span className="glitch-char">S</span>
        </div>
      </div>

      {/* Background */}
      <div className="splash-bg"></div>
    </div>
  );
}
