import { describe, expect, it, vi } from 'vitest';

import { buildSignInUrl, redirectToSignIn } from './auth-navigation';

describe('認証画面への遷移', () => {
  it('現在の画面をログイン後の戻り先にする', () => {
    expect(
      buildSignInUrl({
        pathname: '/collections/employees/users',
        search: '?limit=20',
      }),
    ).toBe('/auth/sign-in?returnTo=%2Fcollections%2Femployees%2Fusers%3Flimit%3D20');
  });

  it('履歴に期限切れ画面を残さずログイン画面へ置き換える', () => {
    const replace = vi.fn();

    redirectToSignIn({ pathname: '/collections', search: '' }, replace);

    expect(replace).toHaveBeenCalledWith('/auth/sign-in?returnTo=%2Fcollections');
  });
});
