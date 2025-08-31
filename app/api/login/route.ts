import { createClient } from '../../../lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get('email'));
  const password = String(formData.get('password'));
  const supabase = createClient();

  // Use the Supabase client to sign in the user
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // Get the origin from the request headers
  const origin = request.headers.get('origin') || 'http://localhost:3000';

  if (error) {
    console.error('Supabase sign-in error:', error.message);
    // If there's an error, redirect back to the auth page with a message
    const url = `${origin}/auth?error=${encodeURIComponent(error.message)}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  // After a successful login, redirect the user to the chat page
  const url = `${origin}/chat`;
  return NextResponse.redirect(url, { status: 303 });
}

