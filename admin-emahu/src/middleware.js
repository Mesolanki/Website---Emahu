import { NextResponse } from 'next/server';

export function middleware(request) {
  // Strip next-action header from scanners/bots or old deployments to prevent "Failed to find Server Action" error
  if (request.headers.has('next-action')) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.delete('next-action');
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};
