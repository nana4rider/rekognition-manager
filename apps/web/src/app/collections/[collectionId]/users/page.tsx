import { UsersClient } from './users-client';

export default async function UsersPage({ params }: { params: Promise<{ collectionId: string }> }) {
  const { collectionId } = await params;
  return <UsersClient collectionId={collectionId} />;
}
