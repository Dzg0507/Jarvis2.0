import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If user is not signed in and the current path is not auth-related, redirect to signin
  if (!session && !req.nextUrl.pathname.startsWith('/signin') && !req.nextUrl.pathname.startsWith('/signup') && !req.nextUrl.pathname.startsWith('/reset-password') && !req.nextUrl.pathname.startsWith('/auth/')) {
    return NextResponse.redirect(new URL('/signin', req.url))
  }

  // If user is signed in and trying to access auth pages, redirect to main app
  if (session && (req.nextUrl.pathname.startsWith('/signin') || req.nextUrl.pathname.startsWith('/signup') || req.nextUrl.pathname.startsWith('/reset-password'))) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}