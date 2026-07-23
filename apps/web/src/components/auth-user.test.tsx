import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthUser } from './auth-user';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AuthUser', () => {
  it('BFFから取得したログインユーザー名を表示する', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ displayName: 'Nana Rider' })));

    render(<AuthUser />);

    expect(await screen.findByLabelText('ログインユーザー')).toHaveTextContent('Nana Rider');
  });

  it('ユーザー取得に失敗した場合は何も表示しない', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })));

    const { container } = render(<AuthUser />);

    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
