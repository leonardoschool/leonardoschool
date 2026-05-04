'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { PageLoader } from '@/components/ui/loaders';
import StudyModeContent from './StudyModeContent';

function StudyModeWrapper() {
  const searchParams = useSearchParams();
  const questionIds = searchParams.get('ids')?.split(',') || [];

  if (questionIds.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500 dark:text-gray-400">Nessuna domanda da visualizzare</p>
      </div>
    );
  }

  return <StudyModeContent questionIds={questionIds} />;
}

export default function StudyModePage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <StudyModeWrapper />
    </Suspense>
  );
}
