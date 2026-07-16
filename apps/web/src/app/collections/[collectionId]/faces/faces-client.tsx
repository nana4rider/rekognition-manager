'use client';

import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormHelperText,
  IconButton,
  LinearProgress,
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
  externalImageIdSchema,
  faceListResponseSchema,
  registerFaceResponseSchema,
  type Face,
} from '@rekognition-manager/contracts';
import { useCallback, useEffect, useState } from 'react';

import { ConfirmDialog } from '../../../../components/confirm-dialog';
import { apiDelete, apiRequest, errorMessage } from '../../../../lib/api';
import { ImageDropZone } from './image-drop-zone';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function FacesClient({ collectionId }: { collectionId: string }) {
  const [items, setItems] = useState<Face[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [registerOpen, setRegisterOpen] = useState(false);
  const [file, setFile] = useState<File>();
  const [externalImageId, setExternalImageId] = useState('');
  const [fileError, setFileError] = useState<string>();
  const [fieldError, setFieldError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Face>();
  const [previewFace, setPreviewFace] = useState<Face>();
  const base = `/api/v1/collections/${encodeURIComponent(collectionId)}/faces`;

  function selectFile(selectedFile?: File) {
    if (!selectedFile) {
      setFile(undefined);
      setFileError(undefined);
      return;
    }
    if (!['image/jpeg', 'image/png'].includes(selectedFile.type)) {
      setFile(undefined);
      setFileError('JPEGまたはPNG形式の画像を選択してください');
      return;
    }
    if (selectedFile.size === 0 || selectedFile.size > MAX_IMAGE_BYTES) {
      setFile(undefined);
      setFileError('画像のサイズは1バイト以上5MB以下にしてください');
      return;
    }
    setFile(selectedFile);
    setFileError(undefined);
  }

  const load = useCallback(
    async (cursor?: string) => {
      setLoading(true);
      setError(undefined);
      try {
        const response = await apiRequest(
          `${base}?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
          faceListResponseSchema,
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

  async function registerFace() {
    if (!file) {
      setFileError('顔画像を選択してください');
      return;
    }
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setFileError('JPEGまたはPNG形式の画像を選択してください');
      return;
    }
    if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
      setFileError('画像のサイズは1バイト以上5MB以下にしてください');
      return;
    }
    const parsedId = externalImageIdSchema.safeParse(externalImageId || undefined);
    if (!parsedId.success) {
      setFieldError('External Image IDの形式が正しくありません');
      return;
    }
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      if (parsedId.data) formData.append('externalImageId', parsedId.data);
      const result = await apiRequest(base, registerFaceResponseSchema, {
        method: 'POST',
        body: formData,
      });
      if (result.faces.length === 0) setError('登録できる品質の顔が画像から見つかりませんでした');
      setRegisterOpen(false);
      setFile(undefined);
      setExternalImageId('');
      setFileError(undefined);
      setFieldError(undefined);
      await load();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function deleteFace() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await apiDelete(`${base}/${encodeURIComponent(deleteTarget.faceId)}`);
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
        <Typography variant="h5">顔</Typography>
        <Button
          variant="contained"
          startIcon={<AddPhotoAlternateIcon />}
          onClick={() => setRegisterOpen(true)}
        >
          顔を登録
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
              <TableCell>Face ID</TableCell>
              <TableCell>External Image ID</TableCell>
              <TableCell>ユーザー</TableCell>
              <TableCell>信頼度</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!loading && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography color="text.secondary" sx={{ py: 5 }}>
                    登録された顔はありません
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {items.map((face) => (
              <TableRow key={face.faceId} hover>
                <TableCell sx={{ fontFamily: 'monospace' }}>{face.faceId}</TableCell>
                <TableCell>{face.externalImageId ?? '—'}</TableCell>
                <TableCell>
                  {face.userId ? <Chip label={face.userId} size="small" /> : '未割り当て'}
                </TableCell>
                <TableCell>
                  {face.confidence !== undefined ? `${face.confidence.toFixed(1)}%` : '—'}
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="画像を見る">
                    <IconButton color="primary" onClick={() => setPreviewFace(face)}>
                      <VisibilityIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="削除">
                    <IconButton color="error" onClick={() => setDeleteTarget(face)}>
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
        open={registerOpen}
        onClose={busy ? undefined : () => setRegisterOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>顔を登録</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <ImageDropZone file={file} disabled={busy} onSelect={selectFile} />
            {fileError && <FormHelperText error>{fileError}</FormHelperText>}
            <TextField
              label="External Image ID（任意）"
              value={externalImageId}
              onChange={(event) => {
                setExternalImageId(event.target.value);
                setFieldError(undefined);
              }}
              helperText={fieldError ?? '画像を識別する任意のIDです。元画像自体は保存されません。'}
              error={Boolean(fieldError)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRegisterOpen(false)} disabled={busy}>
            キャンセル
          </Button>
          <Button variant="contained" onClick={() => void registerFace()} loading={busy}>
            登録する
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={Boolean(previewFace)}
        onClose={() => setPreviewFace(undefined)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>顔画像</DialogTitle>
        <DialogContent>
          {previewFace && (
            <Stack spacing={2} sx={{ py: 1, alignItems: 'center' }}>
              <img
                src={`/api/v1/collections/${encodeURIComponent(collectionId)}/faces/${encodeURIComponent(previewFace.faceId)}/image`}
                alt={`Face ${previewFace.faceId}`}
                style={{ maxWidth: '100%', maxHeight: 480, objectFit: 'contain' }}
              />
              <Typography variant="body2" color="text.secondary">
                {previewFace.faceId}
              </Typography>
            </Stack>
          )}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="顔を削除"
        message={`Face ID「${deleteTarget?.faceId ?? ''}」を削除します。ユーザーとの紐づけも失われ、元に戻せません。`}
        busy={busy}
        onCancel={() => setDeleteTarget(undefined)}
        onConfirm={() => void deleteFace()}
      />
    </>
  );
}
