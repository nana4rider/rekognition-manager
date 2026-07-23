'use client';

import { Button } from '@mui/material';
import { useEffect } from 'react';

const SIGNED_OUT_STORAGE_KEY = 'rekognition-manager:signed-out';

export function AuthHistoryGuard() {
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (shouldRedirectAfterHistoryRestore(event.persisted, window.sessionStorage)) {
        window.location.replace('/auth/sign-in');
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  return null;
}

export function shouldRedirectAfterHistoryRestore(
  persisted: boolean,
  storage: Pick<Storage, 'getItem'>,
): boolean {
  return persisted && storage.getItem(SIGNED_OUT_STORAGE_KEY) === 'true';
}

export function LogoutButton() {
  return (
    <form
      action="/auth/logout"
      method="post"
      onSubmit={() => {
        window.sessionStorage.setItem(SIGNED_OUT_STORAGE_KEY, 'true');
      }}
    >
      <Button type="submit" color="inherit">
        ログアウト
      </Button>
    </form>
  );
}

export function SignInButton({ href, providerName }: { href: string; providerName: string }) {
  return (
    <Button
      href={href}
      variant="contained"
      onClick={() => {
        window.sessionStorage.removeItem(SIGNED_OUT_STORAGE_KEY);
      }}
    >
      Sign in with {providerName}
    </Button>
  );
}
