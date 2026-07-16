import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SearchUsersByImageClient } from './search-users-by-image-client';

describe('SearchUsersByImageClient', () => {
  afterEach(() => vi.restoreAllMocks());

  it('画像を送信して検索結果を表示する', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          matches: [{ userId: 'user-001', userStatus: 'ACTIVE', similarity: 98.5 }],
          searchedFaceFound: true,
          unsearchedFaceCount: 0,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    render(<SearchUsersByImageClient collectionId="employees" />);

    fireEvent.drop(screen.getByLabelText('検索画像を選択'), {
      dataTransfer: {
        files: [new File([Uint8Array.from([1, 2, 3])], 'face.png', { type: 'image/png' })],
      },
    });
    fireEvent.click(screen.getByRole('button', { name: '検索する' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(await screen.findByText('user-001')).toBeInTheDocument();
    expect(screen.getByText('98.5%')).toBeInTheDocument();
    const [path, init] = fetchMock.mock.calls[0] ?? [];
    expect(path).toBe('/api/v1/collections/employees/search/users-by-image');
    expect(init?.method).toBe('POST');
    expect(init?.body).toBeInstanceOf(FormData);
  });
});
