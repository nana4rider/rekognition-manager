import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmDialog } from './confirm-dialog';

describe('ConfirmDialog', () => {
  it('確認してから削除処理を呼び出す', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open
        title="コレクションを削除"
        message="この操作は元に戻せません"
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText('この操作は元に戻せません')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '削除する' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('閉じるアニメーション中は直前のメッセージを維持する', () => {
    const { rerender } = render(
      <ConfirmDialog
        open
        title="ユーザーを削除"
        message="ユーザー「test-user」を削除します。この操作は元に戻せません。"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    rerender(
      <ConfirmDialog
        open={false}
        title="ユーザーを削除"
        message="ユーザー「」を削除します。この操作は元に戻せません。"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(
      screen.getByText('ユーザー「test-user」を削除します。この操作は元に戻せません。'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('ユーザー「」を削除します。この操作は元に戻せません。'),
    ).not.toBeInTheDocument();
  });
});
