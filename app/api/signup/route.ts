// File: app/api/signup/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabaseClient'; // Import your new Supabase client

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const email = String(formData.get('email'));
    const password = String(formData.get('password'));

    // Use the Supabase client to sign up a new user
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) {
      console.error('Supabase error:', error.message);
      // Return a more specific error
      return new NextResponse(error.message, { status: 400 });
    }

    // A user is created, but they need to confirm their email
    console.log('Supabase signup successful:', data);

    // Redirect to a page that tells them to check their email
    const url = request.headers.get('origin') + '/confirm-email';
    return NextResponse.redirect(url, { status: 303 });

  } catch (error) {
    console.error('API Route error:', error);
    return new NextResponse('Something went wrong.', { status: 500 });
  }
}