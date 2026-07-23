import { Button, Paper, Stack, Typography } from '@mui/material';
import { redirect } from 'next/navigation';

import { getAuthStatus } from '../../../lib/auth-status';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const status = await getAuthStatus();
  if (!status.enabled || !status.providerName) redirect('/collections');

  const requestedReturnTo = (await searchParams).returnTo;
  const returnTo = typeof requestedReturnTo === 'string' ? requestedReturnTo : '/collections';
  const loginUrl = `/auth/login?${new URLSearchParams({ returnTo }).toString()}`;

  return (
    <Paper variant="outlined" sx={{ maxWidth: 480, mx: 'auto', p: 4 }}>
      <Stack spacing={3} sx={{ alignItems: 'flex-start' }}>
        <Typography component="h1" variant="h5">
          Rekognition Managerへログイン
        </Typography>
        <Typography color="text.secondary">
          続行するには認証プロバイダーでログインしてください。
        </Typography>
        <Button href={loginUrl} variant="contained">
          Sign in with {status.providerName}
        </Button>
      </Stack>
    </Paper>
  );
}
