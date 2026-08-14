'use client';

import { ExamRunner } from '@/components/jlpt/ExamRunner';

/** All four sections back to back, on one clock. */
export default function JlptRunSetPage({ params }: { params: { setId: string } }) {
  return <ExamRunner mode="set" id={params.setId} />;
}
