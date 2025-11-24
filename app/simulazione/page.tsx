import Button from '@/components/ui/Button';
import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Simulazione Test',
  description: 'Prenota la tua simulazione del test di ammissione e metti alla prova la tua preparazione',
};

const testTypes = [
  {
    id: 'medicina-veterinaria',
    title: 'Medicina, Odontoiatria e Veterinaria',
    duration: '100 minuti',
    questions: '60 domande',
    color: 'bg-blue-500',
  },
  {
    id: 'professioni-sanitarie',
    title: 'Professioni Sanitarie',
    duration: '100 minuti',
    questions: '60 domande',
    color: 'bg-purple-500',
  },
  {
    id: 'architettura',
    title: 'Architettura',
    duration: '100 minuti',
    questions: '60 domande',
    color: 'bg-orange-500',
  },
];

export default function SimulazionePage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      {/* Hero Section */}
      <section className="bg-linear-to-br from-red-600 to-red-800 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Testa la Tua Preparazione
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
            Con le nostre simulazioni ufficiali
          </p>
          <p className="text-lg mb-8">
            Medicina-Odontoiatria • Veterinaria • Professioni Sanitarie • Architettura
          </p>
        </div>
      </section>

      {/* Test Types Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Scegli la Tua Simulazione
            </h2>
            <p className="text-lg text-gray-600">
              Simulazioni complete con correzione dettagliata e punteggio
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testTypes.map((test) => (
              <Link
                key={test.id}
                href={`/simulazione/${test.id}`}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow"
              >
                <div className={`${test.color} h-2`} />
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    {test.title}
                  </h3>
                  <div className="space-y-2 text-gray-600 mb-6">
                    <p className="flex items-center">
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {test.duration}
                    </p>
                    <p className="flex items-center">
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                        <path
                          fillRule="evenodd"
                          d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {test.questions}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Perché Fare una Simulazione?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Valuta la Tua Preparazione
              </h3>
              <p className="text-gray-600">
                Scopri il tuo livello attuale e identifica le aree da migliorare
              </p>
            </div>

            <div className="text-center">
              <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Gestione del Tempo
              </h3>
              <p className="text-gray-600">
                Impara a gestire il tempo durante il test vero
              </p>
            </div>

            <div className="text-center">
              <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                  <path
                    fillRule="evenodd"
                    d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Correzione Dettagliata
              </h3>
              <p className="text-gray-600">
                Ricevi feedback completo con spiegazioni per ogni risposta
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
