'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has already accepted cookies
    const cookiesAccepted = localStorage.getItem('cookiesAccepted');
    if (!cookiesAccepted) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookiesAccepted', 'true');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 z-50 shadow-lg animate-fadeIn">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-center sm:text-left">
          <b>
            Utilizziamo i cookies per offrirti la migliore esperienza possibile sul
            nostro sito. Per maggiori informazioni visita la sezione{' '}
            <Link
              href="/privacy-policy.pdf"
              className="underline hover:text-red-400 transition-colors"
            >
              Termini e Condizioni
            </Link>
            .
          </b>
        </p>
        <button
          onClick={handleAccept}
          className="bg-white text-gray-900 px-6 py-2 rounded-full font-semibold hover:bg-gray-100 transition-colors whitespace-nowrap"
        >
          Okay
        </button>
      </div>
    </div>
  );
}
