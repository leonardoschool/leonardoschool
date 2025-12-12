'use client';

import QuestionForm from '@/components/admin/QuestionForm';

export default function NuovaDomandaCollaboratorePage() {
  return (
    <div className="p-6 sm:p-8 lg:p-10">
      <QuestionForm basePath="/collaboratore/domande" />
    </div>
  );
}
