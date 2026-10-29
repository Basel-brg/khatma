import React from 'react';
import { notFound } from 'next/navigation';
import KhatmaPageClient from '../../../components/KhatmaPageClient';
import { isValidKhatmaId } from '../../../lib/validation';

export function generateStaticParams() {
  return [
    { id: 'view' },
    { id: 'demo-ramadan' },
  ];
}

interface KhatmaPageProps {
  params: Promise<{ id: string }>;
}

export default async function KhatmaPage({ params }: KhatmaPageProps) {
  const { id } = await params;
  if (!isValidKhatmaId(id)) {
    notFound();
  }
  return <KhatmaPageClient khatmaId={id} />;
}
