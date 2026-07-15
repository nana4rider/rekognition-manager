import { describe, expect, it } from 'vitest';

import { collectionIdSchema, userIdSchema } from './schemas.js';

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
