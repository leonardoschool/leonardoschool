'use client';

import { useEffect, useState } from 'react';

export default function Preloader() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Hide preloader after a short delay
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-white z-9999 flex items-center justify-center">
      <div className="flex gap-3">
        <div className="w-4 h-4 bg-red-600 rounded-full animate-[jump_1.4s_ease-in-out_-0.32s_infinite]" />
        <div className="w-4 h-4 bg-red-600 rounded-full animate-[jump_1.4s_ease-in-out_-0.16s_infinite]" />
        <div className="w-4 h-4 bg-red-600 rounded-full animate-[jump_1.4s_ease-in-out_infinite]" />
      </div>
    </div>
  );
}
