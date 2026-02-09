import { notFound } from 'next/navigation';
import { FlashcardStudy } from '@/components/FlashcardStudy';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ level: string }>;
}

const VALID_LEVELS = ['1', '2', '3', '4', '5', '6', '7-9'];

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { level } = await params;
  if (!VALID_LEVELS.includes(level)) {
    return { title: 'Not Found' };
  }
  return {
    title: `HSK ${level} Flashcards - Chinese Dictionary`,
    description: `Study HSK level ${level} vocabulary with flashcards`,
  };
}

export function generateStaticParams() {
  return VALID_LEVELS.map((level) => ({ level }));
}

export default async function HSKLevelPage({ params }: PageProps) {
  const { level } = await params;
  if (!VALID_LEVELS.includes(level)) {
    notFound();
  }

  return <FlashcardStudy level={level} />;
}
