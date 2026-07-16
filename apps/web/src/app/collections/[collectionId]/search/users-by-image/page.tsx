import { SearchUsersByImageClient } from './search-users-by-image-client';

export default async function SearchUsersByImagePage({
  params,
}: {
  params: Promise<{ collectionId: string }>;
}) {
  const { collectionId } = await params;
  return <SearchUsersByImageClient collectionId={collectionId} />;
}
