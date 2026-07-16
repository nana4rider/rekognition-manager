'use client';

import SearchIcon from '@mui/icons-material/Search';
import {
  Alert,
  Button,
  Chip,
  FormHelperText,
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
  Typography,
} from '@mui/material';
import {
  searchUsersByImageOptionsSchema,
  searchUsersByImageResponseSchema,
  type SearchUsersByImageResponse,
} from '@rekognition-manager/contracts';
import { useState } from 'react';

import { apiRequest, errorMessage } from '../../../../../lib/api';
import { ImageDropZone } from '../../faces/image-drop-zone';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function SearchUsersByImageClient({ collectionId }: { collectionId: string }) {
  const [file, setFile] = useState<File>();
  const [fileError, setFileError] = useState<string>();
  const [userMatchThreshold, setUserMatchThreshold] = useState('80');
  const [maxUsers, setMaxUsers] = useState('10');
  const [result, setResult] = useState<SearchUsersByImageResponse>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  function selectFile(selectedFile?: File) {
    setResult(undefined);
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

  async function search() {
    if (!file) {
      setFileError('検索する顔画像を選択してください');
      return;
    }
    const options = searchUsersByImageOptionsSchema.safeParse({
      userMatchThreshold,
      maxUsers,
    });
    if (!options.success) {
      setError('類似度は0〜100、最大件数は1〜500で入力してください');
      return;
    }
    setBusy(true);
    setError(undefined);
    setResult(undefined);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('userMatchThreshold', String(options.data.userMatchThreshold));
      formData.append('maxUsers', String(options.data.maxUsers));
      const response = await apiRequest(
        `/api/v1/collections/${encodeURIComponent(collectionId)}/search/users-by-image`,
        searchUsersByImageResponseSchema,
        { method: 'POST', body: formData },
      );
      setResult(response);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h5">画像からユーザーを検索</Typography>
        <Typography color="text.secondary">
          画像内で最も大きい顔を使い、このコレクションに登録されたユーザーを検索します。
        </Typography>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={2}>
          <ImageDropZone
            file={file}
            disabled={busy}
            onSelect={selectFile}
            ariaLabel="検索画像を選択"
            emptyLabel="検索する画像をドラッグ&ドロップ"
          />
          {fileError && <FormHelperText error>{fileError}</FormHelperText>}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              type="number"
              label="最低類似度(%)"
              value={userMatchThreshold}
              onChange={(event) => setUserMatchThreshold(event.target.value)}
              slotProps={{ htmlInput: { min: 0, max: 100, step: 0.1 } }}
              fullWidth
            />
            <TextField
              type="number"
              label="最大件数"
              value={maxUsers}
              onChange={(event) => setMaxUsers(event.target.value)}
              slotProps={{ htmlInput: { min: 1, max: 500, step: 1 } }}
              fullWidth
            />
          </Stack>
          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            onClick={() => void search()}
            loading={busy}
            sx={{ alignSelf: 'flex-start' }}
          >
            検索する
          </Button>
        </Stack>
      </Paper>

      {result && (
        <Stack spacing={2}>
          {!result.searchedFaceFound ? (
            <Alert severity="warning">検索に使用できる顔が画像から見つかりませんでした。</Alert>
          ) : (
            <Alert severity="info">
              画像内で最も大きい顔を検索に使用しました
              {result.unsearchedFaceCount > 0 &&
                `(ほかに検索対象外の顔が${result.unsearchedFaceCount}件あります)`}
            </Alert>
          )}
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ユーザーID</TableCell>
                  <TableCell>状態</TableCell>
                  <TableCell>類似度</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {result.matches.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      <Typography color="text.secondary" sx={{ py: 4 }}>
                        条件に一致するユーザーはいません
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {result.matches.map((match) => (
                  <TableRow key={match.userId} hover>
                    <TableCell>
                      <Link
                        href={`/collections/${encodeURIComponent(collectionId)}/users/${encodeURIComponent(match.userId)}`}
                      >
                        {match.userId}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {match.userStatus ? <Chip label={match.userStatus} size="small" /> : '—'}
                    </TableCell>
                    <TableCell>{match.similarity.toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      )}
    </Stack>
  );
}
