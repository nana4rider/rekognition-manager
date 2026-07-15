'use client';

import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Alert,
  Button,
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
  collectionListResponseSchema,
  collectionSchema,
  createCollectionRequestSchema,
  type Collection,
} from '@rekognition-manager/contracts';
import { useCallback, useEffect, useState } from 'react';

import { ConfirmDialog } from '../../components/confirm-dialog';
import { PageHeader } from '../../components/page-header';
import { apiDelete, apiRequest, errorMessage } from '../../lib/api';

export function CollectionsClient() {
  const [items, setItems] = useState<Collection[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [createOpen, setCreateOpen] = useState(false);
  const [collectionId, setCollectionId] = useState('');
  const [fieldError, setFieldError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Collection>();

  const load = useCallback(async (cursor?: string) => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await apiRequest(
        `/api/v1/collections?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
        collectionListResponseSchema,
      );
      setItems((current) => (cursor ? [...current, ...response.items] : response.items));
      setNextCursor(response.nextCursor);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => void load(), [load]);

  async function createCollection() {
    const parsed = createCollectionRequestSchema.safeParse({ collectionId });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? '入力内容を確認してください');
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await apiRequest('/api/v1/collections', collectionSchema, {
        method: 'POST',
        body: JSON.stringify(parsed.data),
      });
      setCreateOpen(false);
      setCollectionId('');
      await load();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function deleteCollection() {
    if (!deleteTarget) return;
    setBusy(true);
    setError(undefined);
    try {
      await apiDelete(`/api/v1/collections/${encodeURIComponent(deleteTarget.collectionId)}`);
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
      <PageHeader
        title="コレクション"
        description="Amazon Rekognitionのコレクションを管理します。"
        action={
          <Stack direction="row" spacing={1}>
            <Button startIcon={<RefreshIcon />} onClick={() => void load()} disabled={loading}>
              再読み込み
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
              作成
            </Button>
          </Stack>
        }
      />
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
              <TableCell>コレクションID</TableCell>
              <TableCell>モデルバージョン</TableCell>
              <TableCell>作成日時</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!loading && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Typography color="text.secondary" sx={{ py: 5 }}>
                    コレクションはありません
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {items.map((item) => (
              <TableRow key={item.collectionId} hover>
                <TableCell>
                  <Link
                    href={`/collections/${encodeURIComponent(item.collectionId)}`}
                    sx={{ fontWeight: 600 }}
                  >
                    {item.collectionId}
                  </Link>
                </TableCell>
                <TableCell>{item.faceModelVersion ?? '—'}</TableCell>
                <TableCell>
                  {item.creationTimestamp
                    ? new Date(item.creationTimestamp).toLocaleString('ja-JP')
                    : '—'}
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="削除">
                    <IconButton
                      color="error"
                      onClick={() => setDeleteTarget(item)}
                      aria-label={`${item.collectionId}を削除`}
                    >
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
        <DialogTitle>コレクションを作成</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="コレクションID"
            value={collectionId}
            onChange={(event) => {
              setCollectionId(event.target.value);
              setFieldError(undefined);
            }}
            error={Boolean(fieldError)}
            helperText={fieldError ?? '英数字、ピリオド、アンダースコア、ハイフンが使えます'}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} disabled={busy}>
            キャンセル
          </Button>
          <Button variant="contained" onClick={() => void createCollection()} loading={busy}>
            作成する
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="コレクションを削除"
        message={`「${deleteTarget?.collectionId ?? ''}」と、その中のユーザー・顔を削除します。この操作は元に戻せません。`}
        busy={busy}
        onCancel={() => setDeleteTarget(undefined)}
        onConfirm={() => void deleteCollection()}
      />
    </>
  );
}
