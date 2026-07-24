import { NextResponse, type NextRequest } from 'next/server';

import { getAuthStatus, OIDC_ENABLED_REQUEST_HEADER } from './lib/auth-status';

export async function proxy(request: NextRequest) {
  let status;
  try {
    status = await getAuthStatus();
  } catch {
    return NextResponse.json(
      { error: { code: 'AUTH_STATUS_UNAVAILABLE', message: '認証状態を確認できません' } },
      { status: 503 },
    );
  }

  if (
    status.enabled &&
    (!status.sessionCookieName || !request.cookies.has(status.sessionCookieName))
  ) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/auth/sign-in';
    loginUrl.search = new URLSearchParams({
      returnTo: `${request.nextUrl.pathname}${request.nextUrl.search}`,
    }).toString();
    return NextResponse.redirect(loginUrl);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(OIDC_ENABLED_REQUEST_HEADER, String(status.enabled));
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/', '/collections/:path*'],
};
