'use client';

import { useState } from 'react';
import Link from 'next/link';

// Helper function to check cookie acceptance on client
function getInitialBannerState(): boolean {
  if (typeof window === 'undefined') return false;
  return !localStorage.getItem('cookiesAccepted');
}

export default function CookieBanner() {
  // Use lazy initializer to avoid useEffect setState
  const [showBanner, setShowBanner] = useState(getInitialBannerState);

  const handleAccept = () => {
    localStorage.setItem('cookiesAccepted', 'true');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 p-4 z-50 shadow-2xl animate-fadeIn">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-center sm:text-left text-gray-700">
          Utilizziamo i cookie per salvare le tue preferenze sul sito. 
          Per maggiori informazioni visita la sezione{' '}
          <Link
            href="/privacy-policy.pdf"
            className="text-red-600 font-semibold underline hover:text-red-700 transition-colors"
          >
            Termini e Condizioni
          </Link>
          .
        </p>
        <button
          onClick={handleAccept}
          className="bg-red-600 text-white px-8 py-2.5 rounded-lg font-semibold hover:bg-red-700 transition-colors whitespace-nowrap shadow-lg"
        >
          Okay
        </button>
      </div>
    </div>
  );
}
