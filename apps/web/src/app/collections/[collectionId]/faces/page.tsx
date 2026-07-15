import { FacesClient } from './faces-client';

export default async function FacesPage({ params }: { params: Promise<{ collectionId: string }> }) {
  const { collectionId } = await params;
  return <FacesClient collectionId={collectionId} />;
}
