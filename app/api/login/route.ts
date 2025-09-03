import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    // Check if this is a fetch request or form submission
    const contentType = request.headers.get('content-type');
    const isJsonRequest = contentType?.includes('application/json');

    let email: string;
    let password: string;

    if (isJsonRequest) {
      const body = await request.json();
      email = body.email;
      password = body.password;
    } else {
      const formData = await request.formData();
      email = String(formData.get('email'));
      password = String(formData.get('password'));
    }

    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Missing Supabase environment variables');
      const errorMessage = 'Authentication service not configured. Please check environment variables.';

      if (isJsonRequest) {
        return NextResponse.json({ error: errorMessage }, { status: 500 });
      }
      return NextResponse.redirect(new URL(`/auth?error=${encodeURIComponent(errorMessage)}`, request.url));
    }

    const supabase = createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Supabase login error:', error.message);

      // For fetch requests, return JSON response
      if (isJsonRequest) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }

      // For HTML form submissions, redirect back to auth page with error
      return NextResponse.redirect(new URL(`/auth?error=${encodeURIComponent(error.message)}`, request.url));
    }

    if (data.user) {
      // For fetch requests, return JSON success response
      if (isJsonRequest) {
        return NextResponse.json(
          {
            success: true,
            user: data.user,
            session: data.session,
            redirectTo: '/chat'
          },
          { status: 200 }
        );
      }

      // For HTML form submissions, redirect to chat page on success
      return NextResponse.redirect(new URL('/chat', request.url));
    }

    // Handle case where no user is returned
    if (isJsonRequest) {
      return NextResponse.json(
        { error: 'Login failed' },
        { status: 400 }
      );
    }

    return NextResponse.redirect(new URL('/auth?error=Login failed', request.url));
  } catch (error) {
    console.error('Login error:', error);

    // Check if this was a JSON request for error response
    const contentType = request.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    return NextResponse.redirect(new URL('/auth?error=Internal server error', request.url));
  }
}
