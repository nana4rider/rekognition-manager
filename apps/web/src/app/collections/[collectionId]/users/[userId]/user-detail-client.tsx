'use client';

import LinkOffIcon from '@mui/icons-material/LinkOff';
import LinkIcon from '@mui/icons-material/Link';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Checkbox,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  associateFacesResponseSchema,
  faceListResponseSchema,
  userDetailResponseSchema,
  type Face,
  type UserDetailResponse,
} from '@rekognition-manager/contracts';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ConfirmDialog } from '../../../../../components/confirm-dialog';
import { apiDelete, apiRequest, errorMessage } from '../../../../../lib/api';

export function UserDetailClient({
  collectionId,
  userId,
}: {
  collectionId: string;
  userId: string;
}) {
  const [detail, setDetail] = useState<UserDetailResponse>();
  const [allFaces, setAllFaces] = useState<Face[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [unlinkTarget, setUnlinkTarget] = useState<Face>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [previewFace, setPreviewFace] = useState<Face>();
  const root = `/api/v1/collections/${encodeURIComponent(collectionId)}`;

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const [userResponse, facesResponse] = await Promise.all([
        apiRequest(`${root}/users/${encodeURIComponent(userId)}`, userDetailResponseSchema),
        apiRequest(`${root}/faces?limit=100`, faceListResponseSchema),
      ]);
      setDetail(userResponse);
      setAllFaces(facesResponse.items);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [root, userId]);

  useEffect(() => void load(), [load]);
  const associatedIds = useMemo(
    () => new Set(detail?.faces.map((face) => face.faceId) ?? []),
    [detail],
  );
  const availableFaces = allFaces.filter((face) => !associatedIds.has(face.faceId) && !face.userId);

  async function associate() {
    if (selected.length === 0) return;
    setBusy(true);
    try {
      await apiRequest(
        `${root}/users/${encodeURIComponent(userId)}/faces`,
        associateFacesResponseSchema,
        {
          method: 'POST',
          body: JSON.stringify({ faceIds: selected }),
        },
      );
      setSelected([]);
      await load();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function disassociate() {
    if (!unlinkTarget) return;
    setBusy(true);
    try {
      await apiDelete(
        `${root}/users/${encodeURIComponent(userId)}/faces/${encodeURIComponent(unlinkTarget.faceId)}`,
      );
      setUnlinkTarget(undefined);
      await load();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  if (loading && !detail)
    return (
      <Stack sx={{ py: 8, alignItems: 'center' }}>
        <CircularProgress />
      </Stack>
    );
  return (
    <>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{ mb: 3, justifyContent: 'space-between' }}
      >
        <Box>
          <Typography variant="h5">{userId}</Typography>
          <Chip label={detail?.user.userStatus ?? 'UNKNOWN'} size="small" sx={{ mt: 1 }} />
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 320 }}>
            <InputLabel>紐づける顔</InputLabel>
            <Select
              multiple
              value={selected}
              label="紐づける顔"
              onChange={(event) =>
                setSelected(
                  typeof event.target.value === 'string'
                    ? event.target.value.split(',')
                    : event.target.value,
                )
              }
              renderValue={(values) => `${values.length}件選択`}
            >
              {availableFaces.map((face) => (
                <MenuItem key={face.faceId} value={face.faceId}>
                  <Checkbox checked={selected.includes(face.faceId)} />
                  <ListItemText
                    primary={face.externalImageId ?? face.faceId}
                    secondary={face.faceId}
                  />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<LinkIcon />}
            disabled={selected.length === 0}
            loading={busy}
            onClick={() => void associate()}
          >
            紐づけ
          </Button>
        </Stack>
      </Stack>
      {availableFaces.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          紐づけ可能な未割り当ての顔がありません。
        </Alert>
      )}
      <TableContainer component={Paper} sx={{ border: 1, borderColor: 'divider' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Face ID</TableCell>
              <TableCell>External Image ID</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(detail?.faces.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  <Typography color="text.secondary" sx={{ py: 5 }}>
                    紐づけられた顔はありません
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {detail?.faces.map((face) => (
              <TableRow key={face.faceId}>
                <TableCell sx={{ fontFamily: 'monospace' }}>{face.faceId}</TableCell>
                <TableCell>{face.externalImageId ?? '—'}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                    <Button
                      color="primary"
                      startIcon={<VisibilityIcon />}
                      onClick={() => setPreviewFace(face)}
                    >
                      画像を見る
                    </Button>
                    <Button
                      color="error"
                      startIcon={<LinkOffIcon />}
                      onClick={() => setUnlinkTarget(face)}
                    >
                      紐づけ解除
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
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
                src={`${root}/faces/${encodeURIComponent(previewFace.faceId)}/image`}
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
        open={Boolean(unlinkTarget)}
        title="顔の紐づけを解除"
        message={`Face ID「${unlinkTarget?.faceId ?? ''}」の紐づけを解除します。顔自体は削除されません。`}
        busy={busy}
        onCancel={() => setUnlinkTarget(undefined)}
        onConfirm={() => void disassociate()}
      />
    </>
  );
}
