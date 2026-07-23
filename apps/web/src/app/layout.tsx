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
import { OIDC_ENABLED_REQUEST_HEADER } from '../lib/auth-status';
import { theme } from '../theme';

export const metadata: Metadata = {
  title: 'Rekognition Manager',
  description: 'Amazon RekognitionのマスタメンテナンスUI',
};

export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const oidcEnabled = (await headers()).get(OIDC_ENABLED_REQUEST_HEADER) === 'true';
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
                    <AuthUser />
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
