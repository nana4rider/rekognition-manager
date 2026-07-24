'use client';

import { useLayoutEffect, useState } from 'react';

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';

export function ConfirmDialog({
  open,
  title,
  message,
  busy = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [displayedContent, setDisplayedContent] = useState({ title, message });

  useLayoutEffect(() => {
    if (open) {
      setDisplayedContent({ title, message });
    }
  }, [message, open, title]);

  return (
    <Dialog open={open} onClose={busy ? undefined : onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>{displayedContent.title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{displayedContent.message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={busy}>
          キャンセル
        </Button>
        <Button onClick={onConfirm} color="error" variant="contained" loading={busy}>
          削除する
        </Button>
      </DialogActions>
    </Dialog>
  );
}
