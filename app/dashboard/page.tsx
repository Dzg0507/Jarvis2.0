"use client";

// The "next/link" import is removed as it's causing compilation issues.
// We'll use a standard <a> tag instead.

export default function DashboardPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
      <h1 className="text-4xl font-bold mb-4">Welcome to your Dashboard</h1>
      <p className="text-lg mb-8">This is your new dashboard. You can add more components and features here.</p>
      {/* FIX: The <Link> component has been replaced with a standard <a> tag
        to resolve the "Could not resolve 'next/link'" error.
      */}
      <a href="/chat" className="text-cyan-400 hover:text-cyan-300 text-xl">
        Go to Chat
      </a>
    </div>
  );
}

