import Image from 'next/image';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chi Siamo - Leonardo School Catania',
  description: 'Leonardo School Catania: scuola di preparazione test medicina, odontoiatria e professioni sanitarie. Metodo innovativo con tutor studenti e neolaureati.',
  keywords: ['chi siamo leonardo school', 'scuola preparazione catania', 'metodo insegnamento medicina', 'tutor medicina catania'],
  openGraph: {
    title: 'Chi Siamo - Leonardo School Catania',
    description: 'Scopri chi siamo e il nostro metodo di insegnamento innovativo',
    url: 'https://leonardoschool.it/chi-siamo',
  },
};

export default function ChiSiamoPage() {
  return (
    <div className="min-h-screen pt-24 pb-16 bg-gray-50">
      <div className="container mx-auto px-4">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Chi Siamo
          </h1>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto">
            Scopri il nostro metodo innovativo e il team che ti accompagnerà verso il successo
          </p>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto mb-20">
          {/* Image Section */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-red-800 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-500"></div>
            <div className="relative h-[400px] lg:h-[600px] rounded-2xl overflow-hidden">
              <Image
                src="/images/NEW_LOGO_2026/chi_siamo.png"
                alt="Team Leonardo School"
                fill
                className="object-cover transition duration-500 group-hover:scale-105"
                priority
              />
            </div>
          </div>

          {/* Content Section */}
          <div className="space-y-8">
            <div className="bg-white rounded-2xl p-8 lg:p-10 border border-gray-200 shadow-lg hover:shadow-2xl transition-shadow duration-300">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Il metodo Leonardo School
              </h2>
              
              <div className="space-y-6 text-gray-700 leading-relaxed text-lg">
                <p>
                  I nostri <span className="text-red-600 font-semibold">tutor</span>, studenti e neolaureati selezionati, seguono da anni le nostre classi con un <span className="text-gray-900 font-semibold">metodo rapido, moderno e coinvolgente</span>, capace di rendere l'apprendimento <span className="text-red-600 font-semibold">immediato e naturale</span>.
                </p>
                
                <p>
                  Sono sempre <span className="text-red-600 font-semibold">disponibili</span> anche fuori dall'orario delle lezioni per dubbi, chiarimenti e supporto aggiuntivo.
                </p>
                
                <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-600 p-6 rounded-r-xl mt-8 shadow-md">
                  <p className="font-bold text-gray-900 text-xl mb-1">
                    Cosa aspetti?
                  </p>
                  <p className="text-red-700 font-semibold text-lg">
                    Vieni a conoscere il nostro metodo!
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <Link href="/contattaci">
                  <Button variant="primary" size="lg" className="w-full sm:w-auto text-lg px-8 shadow-lg hover:shadow-xl transition-shadow">
                    Contattaci Ora
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto mb-20">
          <div className="bg-white rounded-2xl p-6 border border-gray-200 text-center shadow-lg">
            <div className="text-4xl font-bold text-red-600 mb-2">150+</div>
            <div className="text-gray-700">Studenti</div>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-gray-200 text-center shadow-lg">
            <div className="text-4xl font-bold text-red-600 mb-2">89%</div>
            <div className="text-gray-700">Tasso di Successo</div>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-gray-200 text-center shadow-lg">
            <div className="text-4xl font-bold text-red-600 mb-2">20+</div>
            <div className="text-gray-700">Tutor Qualificati</div>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-gray-200 text-center shadow-lg">
            <div className="text-4xl font-bold text-red-600 mb-2">4000+</div>
            <div className="text-gray-700">Ore di Lezione</div>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Feature 1 */}
          <div className="bg-white rounded-2xl p-8 border border-gray-200 hover:border-red-300 hover:shadow-xl transition-all duration-300 group shadow-lg">
            <div className="w-16 h-16 rounded-xl bg-red-50 flex items-center justify-center mb-6 group-hover:bg-red-100 transition-colors">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Metodo Innovativo</h3>
            <p className="text-gray-700">
              Tecniche di insegnamento moderne e coinvolgenti che rendono l'apprendimento efficace e piacevole.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white rounded-2xl p-8 border border-gray-200 hover:border-red-300 hover:shadow-xl transition-all duration-300 group shadow-lg">
            <div className="w-16 h-16 rounded-xl bg-red-50 flex items-center justify-center mb-6 group-hover:bg-red-100 transition-colors">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Tutor Esperti</h3>
            <p className="text-gray-700">
              Studenti universitari e neolaureati che conoscono perfettamente le sfide dei test d'ingresso.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white rounded-2xl p-8 border border-gray-200 hover:border-red-300 hover:shadow-xl transition-all duration-300 group shadow-lg">
            <div className="w-16 h-16 rounded-xl bg-red-50 flex items-center justify-center mb-6 group-hover:bg-red-100 transition-colors">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Supporto Continuo</h3>
            <p className="text-gray-700">
              Assistenza anche fuori dall'orario di lezione per garantire il tuo successo in ogni momento.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
