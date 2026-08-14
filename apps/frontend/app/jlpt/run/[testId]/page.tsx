'use client';

import { ExamRunner } from '@/components/jlpt/ExamRunner';

/** One section, on its own clock. */
export default function JlptRunTestPage({ params }: { params: { testId: string } }) {
  return <ExamRunner mode="test" id={params.testId} />;
}
