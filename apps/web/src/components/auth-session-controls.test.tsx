import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  LogoutButton,
  shouldRedirectAfterHistoryRestore,
  SignInButton,
} from './auth-session-controls';

describe('OIDCセッションのブラウザ履歴制御', () => {
  afterEach(() => {
    window.sessionStorage.clear();
  });

  it('ログアウト送信時にログアウト済みフラグを保存する', () => {
    render(<LogoutButton />);

    fireEvent.submit(screen.getByRole('button', { name: 'ログアウト' }).closest('form')!);

    expect(window.sessionStorage.getItem('rekognition-manager:signed-out')).toBe('true');
  });

  it('ログイン開始時にログアウト済みフラグを削除する', () => {
    window.sessionStorage.setItem('rekognition-manager:signed-out', 'true');
    render(<SignInButton href="/auth/login" providerName="Pocket ID" />);

    const preventDefault = vi.fn();
    window.addEventListener('click', (event) => {
      if (event.target instanceof HTMLAnchorElement) {
        event.preventDefault();
        preventDefault();
      }
    });

    fireEvent.click(screen.getByRole('link', { name: 'Sign in with Pocket ID' }));

    expect(preventDefault).toHaveBeenCalled();
    expect(window.sessionStorage.getItem('rekognition-manager:signed-out')).toBeNull();
  });

  it('ログアウト後の履歴キャッシュ復元時にログイン画面へ移動する', () => {
    window.sessionStorage.setItem('rekognition-manager:signed-out', 'true');

    expect(shouldRedirectAfterHistoryRestore(true, window.sessionStorage)).toBe(true);
    expect(shouldRedirectAfterHistoryRestore(false, window.sessionStorage)).toBe(false);
  });
});
