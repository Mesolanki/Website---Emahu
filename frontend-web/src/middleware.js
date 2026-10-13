import { NextResponse } from 'next/server';

export function middleware(request) {
  // Intercept stale or scanner next-action requests to prevent "Failed to find Server Action" errors.
  // frontend-web uses client-side API calls and does not use Next.js Server Actions.
  if (request.headers.has('next-action')) {
    return new NextResponse(
      JSON.stringify({ error: 'Server Action not found. Deployment updated.' }),
      {
        status: 404,
        headers: { 'content-type': 'application/json' },
      }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};

