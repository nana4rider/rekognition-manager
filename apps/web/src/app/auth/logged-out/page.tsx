import { Button, Paper, Stack, Typography } from '@mui/material';

export default function LoggedOutPage() {
  return (
    <Paper variant="outlined" sx={{ maxWidth: 480, mx: 'auto', p: 4 }}>
      <Stack spacing={3} sx={{ alignItems: 'flex-start' }}>
        <Typography component="h1" variant="h5">
          ログアウトしました
        </Typography>
        <Typography color="text.secondary">
          OIDCプロバイダー側のセッションは終了していません。
        </Typography>
        <Button href="/auth/sign-in" variant="contained">
          もう一度ログイン
        </Button>
      </Stack>
    </Paper>
  );
}
