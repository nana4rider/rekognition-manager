import { UserDetailClient } from './user-detail-client';

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ collectionId: string; userId: string }>;
}) {
  const { collectionId, userId } = await params;
  return <UserDetailClient collectionId={collectionId} userId={userId} />;
}
