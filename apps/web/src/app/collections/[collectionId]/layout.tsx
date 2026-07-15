import { CollectionNav } from '../../../components/collection-nav';
import { PageHeader } from '../../../components/page-header';

export default async function CollectionLayout({
  children,
  params,
}: Readonly<{ children: React.ReactNode; params: Promise<{ collectionId: string }> }>) {
  const { collectionId } = await params;
  return (
    <>
      <PageHeader
        title={collectionId}
        description="コレクション内のユーザーと顔を管理します。"
        breadcrumbs={[{ label: 'コレクション', href: '/collections' }, { label: collectionId }]}
      />
      <CollectionNav collectionId={collectionId} />
      {children}
    </>
  );
}
