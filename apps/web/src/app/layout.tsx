import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import {
  AppBar,
  Box,
  Container,
  CssBaseline,
  ThemeProvider,
  Toolbar,
  Typography,
} from '@mui/material';
import type { Metadata } from 'next';
import { headers } from 'next/headers';

import { AuthUser } from '../components/auth-user';
import { AuthHistoryGuard, LogoutButton } from '../components/auth-session-controls';
import { currentUserResponseSchema } from '@rekognition-manager/contracts';
import { OIDC_ENABLED_REQUEST_HEADER } from '../lib/auth-status';
import { theme } from '../theme';

export const metadata: Metadata = {
  title: 'Rekognition Manager',
  description: 'Amazon RekognitionのマスタメンテナンスUI',
};

export const dynamic = 'force-dynamic';

async function getCurrentUserDisplayName(requestHeaders: Headers): Promise<string | null> {
  const oidcEnabled = requestHeaders.get(OIDC_ENABLED_REQUEST_HEADER) === 'true';
  if (!oidcEnabled) return null;

  const cookie = requestHeaders.get('cookie') ?? '';
  if (!cookie) return null;

  const bffOrigin = process.env.BFF_ORIGIN ?? 'http://localhost:3001';
  const response = await fetch(new URL('/auth/me', bffOrigin), {
    headers: { cookie },
  });
  if (!response.ok) return null;

  const data = currentUserResponseSchema.safeParse(await response.json());
  if (!data.success) return null;
  return data.data.displayName;
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const requestHeaders = await headers();
  const oidcEnabled = requestHeaders.get(OIDC_ENABLED_REQUEST_HEADER) === 'true';
  const displayName = await getCurrentUserDisplayName(requestHeaders);

  return (
    <html lang="ja">
      <body style={{ margin: 0 }}>
        <AppRouterCacheProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            {oidcEnabled && <AuthHistoryGuard />}
            <AppBar
              position="static"
              color="inherit"
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              <Toolbar>
                <Typography
                  component="a"
                  href="/collections"
                  variant="h6"
                  color="inherit"
                  sx={{ textDecoration: 'none' }}
                >
                  Rekognition Manager
                </Typography>
                {oidcEnabled && (
                  <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 2 }}>
                    <AuthUser initialDisplayName={displayName} />
                    <LogoutButton />
                  </Box>
                )}
              </Toolbar>
            </AppBar>
            <Box component="main" sx={{ py: { xs: 3, md: 5 } }}>
              <Container maxWidth="lg">{children}</Container>
            </Box>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
