import type React from "react"
import type { Metadata } from "next"
import { Orbitron } from "next/font/google"
import { Roboto_Mono } from "next/font/google"
import { Suspense } from "react"
import "./globals.css"

const orbitron = Orbitron({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-orbitron",
})

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto-mono",
})

export const metadata: Metadata = {
  title: "Neon Chat - Cyberpunk Interface",
  description: "A futuristic chat interface with neon noir aesthetics",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  console.log("Rendering RootLayout");
  return (
    <html lang="en" className="dark">
      <body className={`font-sans ${orbitron.variable} ${robotoMono.variable} antialiased`}>
        <Suspense fallback={null}>
          {children}
        </Suspense>
      </body>
    </html>
  )
}