import { describe, expect, it } from 'vitest';

import {
  authStatusResponseSchema,
  collectionIdSchema,
  collectionSchema,
  currentUserResponseSchema,
  searchUsersByImageOptionsSchema,
  userIdSchema,
} from './schemas.js';

describe('識別子スキーマ', () => {
  it('有効なコレクションIDを受け入れる', () => {
    expect(collectionIdSchema.parse('employees.prod-1')).toBe('employees.prod-1');
  });

  it('スラッシュを含むコレクションIDを拒否する', () => {
    expect(collectionIdSchema.safeParse('employees/tokyo').success).toBe(false);
  });

  it('コロンを含むユーザーIDを受け入れる', () => {
    expect(userIdSchema.parse('tenant:user-001')).toBe('tenant:user-001');
  });
});

describe('現在のユーザースキーマ', () => {
  it('表示名を検証する', () => {
    expect(currentUserResponseSchema.parse({ displayName: 'Nana Rider' })).toEqual({
      displayName: 'Nana Rider',
    });
  });
});

describe('画像検索オプションスキーマ', () => {
  it('フォーム文字列を数値へ変換する', () => {
    expect(
      searchUsersByImageOptionsSchema.parse({ userMatchThreshold: '90', maxUsers: '5' }),
    ).toEqual({ userMatchThreshold: 90, maxUsers: 5 });
  });

  it('範囲外の値を拒否する', () => {
    expect(
      searchUsersByImageOptionsSchema.safeParse({ userMatchThreshold: 101, maxUsers: 0 }).success,
    ).toBe(false);
  });
});

describe('認証状態スキーマ', () => {
  it('OIDC有効状態とCookie名を検証する', () => {
    expect(
      authStatusResponseSchema.parse({
        enabled: true,
        providerName: 'Pocket ID',
        sessionCookieName: 'rekognition-manager-session',
      }),
    ).toEqual({
      enabled: true,
      providerName: 'Pocket ID',
      sessionCookieName: 'rekognition-manager-session',
    });
  });
});

describe('コレクションスキーマ', () => {
  it('ARNを含む入力は無視して、必要なフィールドだけを返す', () => {
    expect(collectionSchema.parse({ collectionId: 'employees', collectionArn: 'arn:aws' })).toEqual(
      {
        collectionId: 'employees',
      },
    );
  });
});
