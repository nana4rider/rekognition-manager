type CurrentLocation = Pick<Location, 'pathname' | 'search'>;

export function buildSignInUrl(location: CurrentLocation): string {
  const returnTo = `${location.pathname}${location.search}`;
  return `/auth/sign-in?${new URLSearchParams({ returnTo }).toString()}`;
}

export function redirectToSignIn(
  location: CurrentLocation = window.location,
  replace: (url: string) => void = (url) => window.location.replace(url),
): void {
  replace(buildSignInUrl(location));
}
