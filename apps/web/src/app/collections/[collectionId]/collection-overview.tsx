'use client';

import { Alert, Card, CardContent, CircularProgress, Grid, Stack, Typography } from '@mui/material';
import { collectionSchema, type Collection } from '@rekognition-manager/contracts';
import { useEffect, useState } from 'react';

import { apiRequest, errorMessage } from '../../../lib/api';

export function CollectionOverview({ collectionId }: { collectionId: string }) {
  const [collection, setCollection] = useState<Collection>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    void apiRequest(`/api/v1/collections/${encodeURIComponent(collectionId)}`, collectionSchema)
      .then(setCollection)
      .catch((caught: unknown) => setError(errorMessage(caught)));
  }, [collectionId]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!collection)
    return (
      <Stack sx={{ py: 8, alignItems: 'center' }}>
        <CircularProgress />
      </Stack>
    );
  const cards = [
    ['顔の件数', collection.faceCount?.toLocaleString('ja-JP') ?? '—'],
    ['ユーザーの件数', collection.userCount?.toLocaleString('ja-JP') ?? '—'],
    ['顔モデル', collection.faceModelVersion ?? '—'],
  ];
  return (
    <Grid container spacing={2}>
      {cards.map(([label, value]) => (
        <Grid key={label} size={{ xs: 12, md: 4 }}>
          <Card sx={{ border: 1, borderColor: 'divider', height: '100%' }}>
            <CardContent>
              <Typography color="text.secondary" variant="body2">
                {label}
              </Typography>
              <Typography variant="h4" sx={{ mt: 1 }}>
                {value}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
