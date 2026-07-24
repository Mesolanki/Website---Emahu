import { NextResponse } from 'next/server';

export function middleware(request) {
  // Intercept invalid / scanner Next-Action requests to prevent "Failed to find Server Action" errors
  if (request.headers.has('next-action')) {
    const actionId = request.headers.get('next-action');
    // Valid Next.js Server Action IDs are 40-character hex strings.
    // If invalid or if Server Actions are not used by the application, reject early with 400 Bad Request.
    if (!actionId || actionId === 'x' || !/^[a-f0-9]{40}$/i.test(actionId)) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid Server Action' }),
        { status: 400, headers: { 'content-type': 'application/json' } }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};
