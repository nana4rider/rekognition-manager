'use client';

import { Tab, Tabs } from '@mui/material';
import { usePathname } from 'next/navigation';

export function CollectionNav({ collectionId }: { collectionId: string }) {
  const pathname = usePathname();
  const root = `/collections/${encodeURIComponent(collectionId)}`;
  const value = pathname.includes('/search/users-by-image')
    ? `${root}/search/users-by-image`
    : pathname.includes('/users')
      ? `${root}/users`
      : pathname.includes('/faces')
        ? `${root}/faces`
        : root;
  return (
    <Tabs value={value} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
      <Tab label="概要" value={root} href={root} />
      <Tab label="ユーザー" value={`${root}/users`} href={`${root}/users`} />
      <Tab label="顔" value={`${root}/faces`} href={`${root}/faces`} />
      <Tab
        label="画像検索"
        value={`${root}/search/users-by-image`}
        href={`${root}/search/users-by-image`}
      />
    </Tabs>
  );
}
