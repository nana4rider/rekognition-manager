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

import { theme } from '../theme';

export const metadata: Metadata = {
  title: 'Rekognition Manager',
  description: 'Amazon RekognitionのマスタメンテナンスUI',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
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
