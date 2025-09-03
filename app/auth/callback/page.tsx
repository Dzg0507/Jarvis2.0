"use client";

import { useEffect } from 'react';

// You can use your existing UI components or simple Tailwind CSS
// For this example, I'll use components that look like shadcn/ui
// to maintain visual consistency with your other code.

const AuthCallbackPage = () => {

  // Automatically redirect the user to the login page after 4 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      // Use window.location for redirection to avoid Next.js router dependency issues in some environments
      window.location.href = '/auth'; 
    }, 4000);

    // Clean up the timer if the component is unmounted
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <div className="text-center">
          {/* Success Icon */}
          <svg
            className="w-16 h-16 mx-auto text-green-500"
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
          
          <h1 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">
            Email Confirmed!
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Thank you for verifying your email address. Your account is now active.
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            You will be automatically redirected to the login page shortly.
          </p>
        </div>
        
        <div className="mt-6">
          {/* Use a standard anchor tag for the link */}
          <a href="/auth">
             <button className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-indigo-500 dark:hover:bg-indigo-600">
                Go to Login Now
              </button>
          </a>
        </div>
      </div>
    </div>
  );
};

export default AuthCallbackPage;

