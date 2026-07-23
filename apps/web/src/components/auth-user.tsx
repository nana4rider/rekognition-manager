'use client';

import { currentUserResponseSchema } from '@rekognition-manager/contracts';
import { Typography } from '@mui/material';
import { useEffect, useState } from 'react';

export function AuthUser() {
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch('/auth/me', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return null;
        return currentUserResponseSchema.parse(await response.json());
      })
      .then((user) => {
        if (user) setDisplayName(user.displayName);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  if (!displayName) return null;
  return (
    <Typography variant="body2" aria-label="ログインユーザー">
      {displayName}
    </Typography>
  );
}
