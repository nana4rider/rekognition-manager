import { CollectionOverview } from './collection-overview';

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ collectionId: string }>;
}) {
  const { collectionId } = await params;
  return <CollectionOverview collectionId={collectionId} />;
}
