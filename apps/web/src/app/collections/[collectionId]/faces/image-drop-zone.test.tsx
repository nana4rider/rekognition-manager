import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ImageDropZone } from './image-drop-zone';

describe('ImageDropZone', () => {
  it('ドロップした画像を選択する', () => {
    const onSelect = vi.fn();
    const file = new File(['image'], 'face.jpg', { type: 'image/jpeg' });
    const { container } = render(<ImageDropZone file={undefined} onSelect={onSelect} />);

    fireEvent.drop(container.querySelector('[role="button"]')!, {
      dataTransfer: { files: [file] },
    });

    expect(onSelect).toHaveBeenCalledWith(file);
  });

  it('通常のファイル選択にも対応する', () => {
    const onSelect = vi.fn();
    const file = new File(['image'], 'face.png', { type: 'image/png' });
    const { container } = render(<ImageDropZone file={undefined} onSelect={onSelect} />);

    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: { files: [file] },
    });

    expect(onSelect).toHaveBeenCalledWith(file);
  });

  it('無効時はドロップした画像を選択しない', () => {
    const onSelect = vi.fn();
    const file = new File(['image'], 'face.jpg', { type: 'image/jpeg' });
    const { container } = render(<ImageDropZone file={undefined} disabled onSelect={onSelect} />);

    fireEvent.drop(container.querySelector('[role="button"]')!, {
      dataTransfer: { files: [file] },
    });

    expect(onSelect).not.toHaveBeenCalled();
  });
});
