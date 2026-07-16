'use client';

import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import { Box, Stack, Typography } from '@mui/material';
import { useRef, useState, type DragEvent, type KeyboardEvent } from 'react';

type ImageDropZoneProps = {
  file: File | undefined;
  disabled?: boolean;
  onSelect: (file?: File) => void;
  ariaLabel?: string;
  emptyLabel?: string;
};

export function ImageDropZone({
  file,
  disabled = false,
  onSelect,
  ariaLabel = '顔画像を選択',
  emptyLabel = '画像をドラッグ＆ドロップ',
}: ImageDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function openFilePicker() {
    if (!disabled) inputRef.current?.click();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openFilePicker();
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (!disabled) onSelect(event.dataTransfer.files[0]);
  }

  return (
    <Box
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label={ariaLabel}
      onClick={openFilePicker}
      onKeyDown={handleKeyDown}
      onDragEnter={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      sx={{
        border: 2,
        borderStyle: 'dashed',
        borderColor: dragging ? 'primary.main' : 'divider',
        borderRadius: 1,
        bgcolor: dragging ? 'action.hover' : 'transparent',
        color: disabled ? 'text.disabled' : 'text.primary',
        cursor: disabled ? 'default' : 'pointer',
        p: 3,
        textAlign: 'center',
        transition: (theme) =>
          theme.transitions.create(['background-color', 'border-color'], {
            duration: theme.transitions.duration.shortest,
          }),
        '&:focus-visible': {
          outline: 2,
          outlineColor: 'primary.main',
          outlineOffset: 2,
        },
      }}
    >
      <input
        ref={inputRef}
        hidden
        type="file"
        accept="image/jpeg,image/png"
        disabled={disabled}
        onChange={(event) => {
          onSelect(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      <Stack spacing={1} sx={{ alignItems: 'center' }}>
        <AddPhotoAlternateIcon color={dragging ? 'primary' : 'inherit'} />
        <Typography sx={{ fontWeight: 500 }}>{file?.name ?? emptyLabel}</Typography>
        <Typography variant="body2" color="text.secondary">
          またはクリックして選択(JPEG／PNG、5MB以下)
        </Typography>
      </Stack>
    </Box>
  );
}
