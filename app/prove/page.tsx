import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Prove - Leonardo School Catania',
  description: 'Pagina delle prove disponibili per la preparazione ai test di ammissione universitari.',
  keywords: ['prove test medicina', 'prove universitarie', 'esercitazioni test', 'prove catania'],
  openGraph: {
    title: 'Prove - Leonardo School Catania',
    description: 'Pagina delle prove disponibili',
    url: 'https://leonardoschool.it/prove',
  },
};

export default function ProvePage() {
  return (
    <div className="min-h-screen pt-24 pb-16 bg-gray-50">
      <div className="container mx-auto px-4">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Prove
          </h1>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto">
            Esercitati con le nostre prove per preparare al meglio i test di ammissione universitari
          </p>
        </div>

        {/* Content Section */}
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8 md:p-12">
          <div className="text-center">
            <div className="mb-8">
              <svg
                className="w-24 h-24 mx-auto text-red-600 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Contenuto in Arrivo
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Stiamo preparando materiali esclusivi di esercitazione per te.
              </p>
            </div>

            <div className="space-y-4">
              <p className="text-gray-700">
                Nel frattempo, puoi esplorare le nostre altre sezioni:
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/simulazione"
                  className="inline-flex items-center justify-center px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
                >
                  Simulazioni
                </Link>
                <Link
                  href="/test"
                  className="inline-flex items-center justify-center px-6 py-3 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Test di Accesso
                </Link>
                <Link
                  href="/didattica"
                  className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Corsi
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Hai domande?
          </h3>
          <p className="text-gray-600 mb-6">
            Contattaci per maggiori informazioni sui nostri corsi e servizi
          </p>
          <Link
            href="/contattaci"
            className="inline-flex items-center justify-center px-8 py-4 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors shadow-lg hover:shadow-xl"
          >
            Contattaci
          </Link>
        </div>
      </div>
    </div>
  );
}
