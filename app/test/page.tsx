import TestCard from '@/components/ui/TestCard';
import { TestCard as TestCardType } from '@/types';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Prove di Accesso',
  description: 'Informazioni su tutte le prove di accesso universitari: Medicina, Odontoiatria, Veterinaria, Professioni Sanitarie, Architettura e altro',
};

const allTests: TestCardType[] = [
  {
    id: 'medicina',
    title: 'Semestre Aperto',
    description: 'Medicina, Odontoiatria e Veterinaria',
    image: '/images/med.png',
    link: 'https://accessoprogrammato.mur.gov.it/2024/',
    details: 'Test di accesso per i corsi di Medicina e Chirurgia, Odontoiatria e Protesi Dentaria, e Medicina Veterinaria in lingua italiana.',
  },
  {
    id: 'imat',
    title: 'IMAT',
    description: 'Medicina, Odontoiatria e Veterinaria in Inglese',
    image: '/images/imat.png',
    link: 'https://accessoprogrammato.mur.gov.it/2024/',
    details: 'International Medical Admissions Test per i corsi di Medicina, Odontoiatria e Veterinaria in lingua inglese.',
  },
  {
    id: 'sanitarie',
    title: 'Professioni Sanitarie',
    description: 'Professioni Sanitarie',
    image: '/images/NEW_LOGO_2026/icon_snt.png',
    link: 'https://www.mur.gov.it/it/atti-e-normativa/decreto-ministeriale-n-1116-del-31-07-2024',
    details: 'Test di accesso per i corsi delle Professioni Sanitarie (Infermieristica, Fisioterapia, ecc.).',
  },
  {
    id: 'architettura',
    title: 'Test ARCHED',
    description: 'Architettura/Ingegneria edile-Architettura',
    image: '/images/arched.png',
    link: 'https://www.cisiaonline.it/area-tematica-architettura/test-arched-architettura-ingegneria-edile/struttura-della-prova-test-arched/',
    details: 'Test per i corsi di Architettura e Ingegneria Edile-Architettura.',
  },
];

export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative py-24 bg-black text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-red-600 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-gray-600 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <h1 className="text-4xl md:text-6xl font-black mb-6">
            Prove di Accesso
          </h1>
          <div className="w-24 h-1.5 bg-gradient-to-r from-red-500 to-red-600 mx-auto rounded-full mb-8" />
          <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Scopri tutti i test di accesso per il tuo percorso di studi e ottieni informazioni dettagliate
            su date, modalità e contenuti.
          </p>
        </div>
      </section>

      {/* Tests Grid Section - Test Ministeriali */}
      <section className="py-20 relative overflow-hidden">

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
              Test Ministeriali
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Informazioni ufficiali sui test di accesso regolati dal MUR
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto mb-20 items-start">
            {allTests.map((test) => (
              <TestCard key={test.id} test={test} expandable={true} />
            ))}
          </div>

          {/* Università Private Section */}
          <div className="mt-20">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
                Test Universitari Specifici
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {/* UniSR */}
              <div className="bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 p-8 border-2 border-gray-100">
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center shadow-lg">
                    <img src="/images/uniSR.jpeg" alt="UniSR" className="w-14 h-14 object-contain rounded-full" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-3 text-center">Test UniSR</h3>
                <p className="text-sm text-gray-600 mb-6 text-center">Università Vita-Salute San Raffaele</p>
                <div className="space-y-2">
                  <a href="https://www.unisr.it" target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-gray-700 hover:text-red-600 transition-colors">
                    <span className="text-red-600 mr-2">›</span> Medicina e Odontoiatria
                  </a>
                  <a href="https://www.unisr.it" target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-gray-700 hover:text-red-600 transition-colors">
                    <span className="text-red-600 mr-2">›</span> Professioni sanitarie
                  </a>
                  <a href="https://www.unisr.it" target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-gray-700 hover:text-red-600 transition-colors">
                    <span className="text-red-600 mr-2">›</span> Medicina in inglese
                  </a>
                </div>
              </div>

              {/* UniCamillus */}
              <div className="bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 p-8 border-2 border-gray-100">
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center shadow-lg">
                    <img src="/images/uniCamillus.png" alt="UniCamillus" className="w-14 h-14 object-contain" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-3 text-center">Test UniCamillus</h3>
                <p className="text-sm text-gray-600 mb-6 text-center">Saint Camillus International University</p>
                <div className="space-y-2">
                  <a href="https://www.unicamillus.org" target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-gray-700 hover:text-red-600 transition-colors">
                    <span className="text-red-600 mr-2">›</span> Medicina in inglese (Roma)
                  </a>
                  <a href="https://www.unicamillus.org" target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-gray-700 hover:text-red-600 transition-colors">
                    <span className="text-red-600 mr-2">›</span> Medicina in inglese (Venezia)
                  </a>
                  <a href="https://www.unicamillus.org" target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-gray-700 hover:text-red-600 transition-colors">
                    <span className="text-red-600 mr-2">›</span> Odontoiatria (Roma)
                  </a>
                  <a href="https://www.unicamillus.org" target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-gray-700 hover:text-red-600 transition-colors">
                    <span className="text-red-600 mr-2">›</span> Professioni sanitarie
                  </a>
                </div>
              </div>

              {/* UniCatt */}
              <div className="bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 p-8 border-2 border-gray-100">
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center shadow-lg">
                    <img src="/images/unicatt.png" alt="UniCatt" className="w-14 h-14 object-contain" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-3 text-center">Test UniCatt</h3>
                <p className="text-sm text-gray-600 mb-6 text-center">Università Cattolica del Sacro Cuore</p>
                <div className="space-y-2">
                  <a href="https://www.unicatt.it" target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-gray-700 hover:text-red-600 transition-colors">
                    <span className="text-red-600 mr-2">›</span> Medicina e Odontoiatria
                  </a>
                  <a href="https://www.unicatt.it" target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-gray-700 hover:text-red-600 transition-colors">
                    <span className="text-red-600 mr-2">›</span> Medicina in inglese
                  </a>
                </div>
              </div>

              {/* UCBM */}
              <div className="bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 p-8 border-2 border-gray-100">
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center shadow-lg">
                    <img src="/images/ucbm.png" alt="UCBM" className="w-14 h-14 object-contain" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-3 text-center">Test UCBM</h3>
                <p className="text-sm text-gray-600 mb-6 text-center">Università Campus Bio-Medico di Roma</p>
                <div className="space-y-2">
                  <a href="https://www.unicampus.it" target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-gray-700 hover:text-red-600 transition-colors">
                    <span className="text-red-600 mr-2">›</span> Medicina
                  </a>
                  <a href="https://www.unicampus.it" target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-gray-700 hover:text-red-600 transition-colors">
                    <span className="text-red-600 mr-2">›</span> Odontoiatria
                  </a>
                  <a href="https://www.unicampus.it" target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-gray-700 hover:text-red-600 transition-colors">
                    <span className="text-red-600 mr-2">›</span> Medicina in inglese
                  </a>
                  <a href="https://www.unicampus.it" target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-gray-700 hover:text-red-600 transition-colors">
                    <span className="text-red-600 mr-2">›</span> Medicina in inglese "MedTech"
                  </a>
                </div>
              </div>

              {/* Hunimed */}
              <div className="bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 p-8 border-2 border-gray-100">
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center shadow-lg">
                    <img src="/images/hunimed.png" alt="Hunimed" className="w-14 h-14 object-contain" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-3 text-center">Test Hunimed</h3>
                <p className="text-sm text-gray-600 mb-6 text-center">Humanitas University</p>
                <div className="space-y-2">
                  <a href="https://www.hunimed.eu" target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-gray-700 hover:text-red-600 transition-colors">
                    <span className="text-red-600 mr-2">›</span> Medicina in inglese
                  </a>
                  <a href="https://www.hunimed.eu" target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-gray-700 hover:text-red-600 transition-colors">
                    <span className="text-red-600 mr-2">›</span> Medicina in inglese "MedTech"
                  </a>
                  <a href="https://www.hunimed.eu" target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-gray-700 hover:text-red-600 transition-colors">
                    <span className="text-red-600 mr-2">›</span> Professioni sanitarie in inglese
                  </a>
                </div>
              </div>

              {/* UniLink */}
              <div className="bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 p-8 border-2 border-gray-100">
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center shadow-lg">
                    <img src="/images/unilink.png" alt="UniLink" className="w-14 h-14 object-contain" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-3 text-center">Test UniLink</h3>
                <p className="text-sm text-gray-600 mb-6 text-center">Link Campus University</p>
                <div className="space-y-2">
                  <a href="https://www.unilink.it" target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-gray-700 hover:text-red-600 transition-colors">
                    <span className="text-red-600 mr-2">›</span> Medicina
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
