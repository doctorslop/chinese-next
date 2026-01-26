import { notFound } from 'next/navigation';
import { FlashcardStudy } from '@/components/FlashcardStudy';
import type { Metadata } from 'next';

interface PageProps {
  params: { level: string };
}

const VALID_LEVELS = ['1', '2', '3', '4', '5', '6', '7-9'];

export function generateMetadata({ params }: PageProps): Metadata {
  if (!VALID_LEVELS.includes(params.level)) {
    return { title: 'Not Found' };
  }
  return {
    title: `HSK ${params.level} Flashcards - Chinese Dictionary`,
    description: `Study HSK level ${params.level} vocabulary with flashcards`,
  };
}

export function generateStaticParams() {
  return VALID_LEVELS.map((level) => ({ level }));
}

export default function HSKLevelPage({ params }: PageProps) {
  if (!VALID_LEVELS.includes(params.level)) {
    notFound();
  }

  return <FlashcardStudy level={params.level} />;
}
