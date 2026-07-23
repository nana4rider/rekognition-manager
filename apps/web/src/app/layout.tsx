import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import {
  AppBar,
  Box,
  Container,
  CssBaseline,
  ThemeProvider,
  Toolbar,
  Typography,
  Button,
} from '@mui/material';
import type { Metadata } from 'next';
import { headers } from 'next/headers';

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
                  <Box component="form" action="/auth/logout" method="post" sx={{ ml: 'auto' }}>
                    <Button type="submit" color="inherit">
                      ログアウト
                    </Button>
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
