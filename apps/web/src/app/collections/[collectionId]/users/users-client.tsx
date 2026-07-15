'use client';

import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  createUserRequestSchema,
  userListResponseSchema,
  userSchema,
  type User,
} from '@rekognition-manager/contracts';
import { useCallback, useEffect, useState } from 'react';

import { ConfirmDialog } from '../../../../components/confirm-dialog';
import { apiDelete, apiRequest, errorMessage } from '../../../../lib/api';

export function UsersClient({ collectionId }: { collectionId: string }) {
  const [items, setItems] = useState<User[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [createOpen, setCreateOpen] = useState(false);
  const [userId, setUserId] = useState('');
  const [fieldError, setFieldError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User>();
  const base = `/api/v1/collections/${encodeURIComponent(collectionId)}/users`;

  const load = useCallback(
    async (cursor?: string) => {
      setLoading(true);
      setError(undefined);
      try {
        const response = await apiRequest(
          `${base}?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
          userListResponseSchema,
        );
        setItems((current) => (cursor ? [...current, ...response.items] : response.items));
        setNextCursor(response.nextCursor);
      } catch (caught) {
        setError(errorMessage(caught));
      } finally {
        setLoading(false);
      }
    },
    [base],
  );

  useEffect(() => void load(), [load]);

  async function createUser() {
    const parsed = createUserRequestSchema.safeParse({ userId });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? '入力内容を確認してください');
      return;
    }
    setBusy(true);
    try {
      await apiRequest(base, userSchema, { method: 'POST', body: JSON.stringify(parsed.data) });
      setCreateOpen(false);
      setUserId('');
      await load();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await apiDelete(`${base}/${encodeURIComponent(deleteTarget.userId)}`);
      setDeleteTarget(undefined);
      await load();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ mb: 2, justifyContent: 'space-between' }}
      >
        <Typography variant="h5">ユーザー</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          ユーザーを作成
        </Button>
      </Stack>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <TableContainer component={Paper} sx={{ border: 1, borderColor: 'divider' }}>
        {loading && <LinearProgress />}
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ユーザーID</TableCell>
              <TableCell>ステータス</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!loading && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  <Typography color="text.secondary" sx={{ py: 5 }}>
                    ユーザーはありません
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {items.map((item) => (
              <TableRow key={item.userId} hover>
                <TableCell>
                  <Link
                    href={`/collections/${encodeURIComponent(collectionId)}/users/${encodeURIComponent(item.userId)}`}
                    sx={{ fontWeight: 600 }}
                  >
                    {item.userId}
                  </Link>
                </TableCell>
                <TableCell>
                  <Chip
                    label={item.userStatus ?? 'UNKNOWN'}
                    size="small"
                    color={item.userStatus === 'ACTIVE' ? 'success' : 'default'}
                  />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="削除">
                    <IconButton color="error" onClick={() => setDeleteTarget(item)}>
                      <DeleteOutlineIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {nextCursor && (
        <Stack sx={{ mt: 2, alignItems: 'center' }}>
          <Button onClick={() => void load(nextCursor)} loading={loading}>
            さらに読み込む
          </Button>
        </Stack>
      )}

      <Dialog
        open={createOpen}
        onClose={busy ? undefined : () => setCreateOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>ユーザーを作成</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="ユーザーID"
            value={userId}
            onChange={(event) => {
              setUserId(event.target.value);
              setFieldError(undefined);
            }}
            error={Boolean(fieldError)}
            helperText={fieldError ?? 'コレクション内で一意のIDを入力します'}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} disabled={busy}>
            キャンセル
          </Button>
          <Button variant="contained" onClick={() => void createUser()} loading={busy}>
            作成する
          </Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="ユーザーを削除"
        message={`ユーザー「${deleteTarget?.userId ?? ''}」を削除します。この操作は元に戻せません。`}
        busy={busy}
        onCancel={() => setDeleteTarget(undefined)}
        onConfirm={() => void deleteUser()}
      />
    </>
  );
}
