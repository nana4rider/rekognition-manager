import { describe, expect, it } from 'vitest';

import { signInErrorMessage } from './page';

describe('サインイン画面のエラー表示', () => {
  it('権限拒否を利用者向けのメッセージへ変換する', () => {
    expect(signInErrorMessage('access_denied')).toBe(
      'このサービスを利用する権限がありません。管理者にアクセス権を確認してください。',
    );
  });

  it('未知のクエリ値を表示しない', () => {
    expect(signInErrorMessage('raw-provider-error')).toBeNull();
  });
});
