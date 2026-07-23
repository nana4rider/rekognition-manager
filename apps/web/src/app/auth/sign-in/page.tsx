import { Alert, Button, Paper, Stack, Typography } from '@mui/material';
import { redirect } from 'next/navigation';

import { getAuthStatus } from '../../../lib/auth-status';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[]; returnTo?: string | string[] }>;
}) {
  const status = await getAuthStatus();
  if (!status.enabled || !status.providerName) redirect('/collections');

  const params = await searchParams;
  const requestedReturnTo = params.returnTo;
  const returnTo = typeof requestedReturnTo === 'string' ? requestedReturnTo : '/collections';
  const loginUrl = `/auth/login?${new URLSearchParams({ returnTo }).toString()}`;
  const errorMessage = signInErrorMessage(params.error);

  return (
    <Paper variant="outlined" sx={{ maxWidth: 480, mx: 'auto', p: 4 }}>
      <Stack spacing={3} sx={{ alignItems: 'flex-start' }}>
        <Typography component="h1" variant="h5">
          Rekognition Managerへログイン
        </Typography>
        <Typography color="text.secondary">
          続行するには認証プロバイダーでログインしてください。
        </Typography>
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        <Button href={loginUrl} variant="contained">
          Sign in with {status.providerName}
        </Button>
      </Stack>
    </Paper>
  );
}

export function signInErrorMessage(error: string | string[] | undefined): string | null {
  if (error === 'access_denied') {
    return 'このサービスを利用する権限がありません。管理者にアクセス権を確認してください。';
  }
  if (error === 'provider_unavailable') {
    return '認証プロバイダーを一時的に利用できません。時間をおいて再度お試しください。';
  }
  if (error === 'authentication_failed') {
    return 'ログインを完了できませんでした。もう一度お試しください。';
  }
  return null;
}
