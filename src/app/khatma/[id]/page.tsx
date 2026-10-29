import React from 'react';
import KhatmaPageClient from '../../../components/KhatmaPageClient';

interface KhatmaPageProps {
  params: Promise<{ id: string }>;
}

export default async function KhatmaPage({ params }: KhatmaPageProps) {
  const { id } = await params;
  return <KhatmaPageClient khatmaId={id} />;
}
