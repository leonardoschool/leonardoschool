import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Simulazioni | Leonardo School',
  description: 'Simulazioni gratuite test medicina, professioni sanitarie, architettura e TOLC. Preparati con le nostre simulazioni complete e valuta la tua preparazione.',
  keywords: ['simulazione test medicina', 'simulazione TOLC', 'test medicina online', 'simulazione professioni sanitarie', 'TOLC-MED', 'TOLC medicina simulazione', 'test architettura simulazione', 'CEnT simulazione'],
  openGraph: {
    title: 'Simulazioni | Leonardo School',
    description: 'Testa la tua preparazione con simulazioni gratuite',
    url: 'https://www.leonardoschool.it/simulazione',
  },
};

const testTypes = [
  {
    id: 'medicina-veterinaria',
    title: 'Medicina, Odontoiatria e Veterinaria',
    tests: [
      {
        subject: 'Chimica e Propedeutica Biochimica',
        duration: '45 minuti',
        questions: '31 domande',
        color: '#D54F8A',
      },
      {
        subject: 'Fisica',
        duration: '45 minuti',
        questions: '31 domande',
        color: '#68BCE8',
      },
      {
        subject: 'Biologia',
        duration: '45 minuti',
        questions: '31 domande',
        color: '#B5B240',
      },
    ],
    color: 'bg-[#EEB550]',
  },
  {
    id: 'imat',
    title: 'IMAT',
    duration: '100 minuti',
    questions: '60 domande',
    color: 'bg-[#19419B]',
  },
  {
    id: 'professioni-sanitarie',
    title: 'Professioni Sanitarie',
    duration: '100 minuti',
    questions: '60 domande',
    color: 'bg-orange-500',
  },
  {
    id: 'architettura',
    title: 'Architettura',
    duration: '100 minuti',
    questions: '50 domande',
    color: 'bg-[#EB635B]',
  },
];

const tolcTests = [
  {
    id: 'tolc-av',
    title: 'TOLC-AV',
    subtitle: 'Scienze agrarie e veterinarie',
    color: '#AED55F',
    questions: '80 domande',
    duration: '115 minuti',
  },
  {
    id: 'tolc-b',
    title: 'TOLC-B',
    subtitle: 'Scienze biologiche e Biotecnologie',
    color: '#EAA43E',
    questions: '80 domande',
    duration: '125 minuti',
  },
  {
    id: 'tolc-e',
    title: 'TOLC-E',
    subtitle: 'Economia, Statistica e Scienze sociali',
    color: '#794C93',
    questions: '66 domande',
    duration: '105 minuti',
  },
  {
    id: 'tolc-f',
    title: 'TOLC-F',
    subtitle: 'Scienze farmaceutiche',
    color: '#598579',
    questions: '80 domande',
    duration: '87 minuti',
  },
  {
    id: 'tolc-i',
    title: 'TOLC-I',
    subtitle: 'Ingegneria',
    color: '#4396D1',
    questions: '80 domande',
    duration: '125 minuti',
  },
  {
    id: 'tolc-lp',
    title: 'TOLC-LP',
    subtitle: 'Orientamento professionalizzante',
    color: '#265B7E',
    questions: '60 domande',
    duration: '105 minuti',
  },
  {
    id: 'tolc-psi',
    title: 'TOLC-PSI',
    subtitle: 'Scienze psicologiche',
    color: '#911C5B',
    questions: '80 domande',
    duration: '115 minuti',
  },
  {
    id: 'tolc-s',
    title: 'TOLC-S',
    subtitle: 'Scienze chimiche, fisiche, matematiche, geologiche e naturali',
    color: '#F8DE4A',
    questions: '85 domande',
    duration: '135 minuti',
  },
  {
    id: 'tolc-sps',
    title: 'TOLC-SPS',
    subtitle: 'Scienze politiche e sociali',
    color: '#F5C19E',
    questions: '70 domande',
    duration: '105 minuti',
  },
  {
    id: 'tolc-su',
    title: 'TOLC-SU',
    subtitle: 'Scienze umanistiche',
    color: '#D5484A',
    questions: '80 domande',
    duration: '115 minuti',
  },
  {
    id: 'cent-s',
    title: 'CEnT-S',
    subtitle: 'Ingegneria, Farmacia, Economia e altri corsi in ambito scientifico tenuti prevalentemente in lingua inglese',
    color: '#1E4C86',
    questions: '55 domande',
    duration: '110 minuti',
  },
];

export default function SimulazionePage() {
  return (
    <div className="min-h-screen pb-16">
      {/* Hero Section */}
      <section className="relative pt-32 pb-24 bg-black text-white overflow-hidden">
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <h1 className="text-4xl md:text-6xl font-black mb-6">
            TESTA LA TUA PREPARAZIONE
          </h1>
          <div className="w-24 h-1.5 bg-gradient-to-r from-red-500 to-red-600 mx-auto rounded-full mb-8" />
          <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed mb-4">
            Esercitati con una simulazione gratuita
          </p>
          <p className="text-lg text-gray-300">
            Medicina-Odontoiatria-Veterinaria • IMAT • Professioni Sanitarie • Architettura • TOLC • CEnT
          </p>
        </div>
      </section>

      {/* Test Types Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-4">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Scegli la tua simulazione
            </h2>
            <p className="text-lg text-gray-600">
              Simulazioni complete con soluzione commentata e punteggio
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
            {/* Card Medicina - Occupa tutta la colonna sinistra */}
            <Link
              href={`/simulazione/${testTypes[0].id}`}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow h-full"
            >
              <div className={`${testTypes[0].color} h-2`} />
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">
                  {testTypes[0].title}
                </h3>
                
                <div className="space-y-6">
                  {testTypes[0].tests?.map((subTest) => (
                    <div key={subTest.subject} className={`bg-gray-50 rounded-lg p-4 border-l-4`} style={{ borderLeftColor: subTest.color }}>
                      <p className="font-bold text-gray-900 mb-3 text-base">{subTest.subject}</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center text-sm text-gray-700">
                          <svg
                            className="w-5 h-5 mr-2 text-gray-600"
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
                          <span className="font-medium">{subTest.questions}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-700">
                          <svg
                            className="w-5 h-5 mr-2 text-gray-600"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span className="font-medium">{subTest.duration}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Link>

            {/* Colonna destra con IMAT, Professioni Sanitarie e Architettura */}
            <div className="flex flex-col gap-6">
              {testTypes.slice(1).map((test) => {
                const subject = `Richiesta Simulazione: ${test.title}`;
                const contactHref = `/contattaci?oggetto=${encodeURIComponent(subject)}`;
                return (
                <Link
                  key={test.id}
                  href={contactHref}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow"
                >
                  <div className={`${test.color} h-2`} />
                  <div className="p-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">
                      {test.title}
                    </h3>
                    
                    <div className="space-y-1.5 text-gray-600 text-sm">
                      <p className="flex items-center">
                        <svg
                          className="w-4 h-4 mr-2"
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
                      <p className="flex items-center">
                        <svg
                          className="w-4 h-4 mr-2"
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
                    </div>
                  </div>
                </Link>
              );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* TOLC Tests Section */}
      <section className=" bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-4">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              TOLC & CEnT
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-4">
              Esercitati per i Test On-Line CISIA (TOLC) e il CEnT-S  (CISIA English Test-Sciences) utilizzati da molte università italiane per l&#39;accesso ai corsi di laurea.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto pb-16">
            {tolcTests.map((test) => {
              const subject = `Richiesta Simulazione: ${test.title}`;
              const contactHref = `/contattaci?oggetto=${encodeURIComponent(subject)}`;
              return (
              <Link
                key={test.id}
                href={contactHref}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow"
              >
                <div style={{ backgroundColor: test.color }} className="h-2" />
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {test.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    {test.subtitle}
                  </p>
                  <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between text-sm text-gray-600">
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                        <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                      </svg>
                      {test.questions}
                    </span>
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      {test.duration}
                    </span>
                  </div>
                </div>
              </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Perché fare una simulazione?
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
                Valuta la tua preparazione
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
                Correzione dettagliata
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
