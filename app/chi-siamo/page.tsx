import Image from 'next/image';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chi Siamo',
  description: 'Scopri chi siamo e il nostro metodo di insegnamento innovativo con tutor studenti e neolaureati',
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
                src="/images/545.jpg"
                alt="Team Leonardo School"
                fill
                className="object-cover transition duration-500 group-hover:scale-105"
                priority
              />
            </div>
          </div>

          {/* Content Section */}
          <div className="space-y-8">
            <div className="bg-white rounded-2xl p-8 lg:p-10 border border-gray-200 shadow-lg">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Il Nostro Metodo
              </h2>
              
              <div className="space-y-4 text-gray-700 leading-relaxed text-lg">
                <p>
                  I nostri <span className="text-red-600 font-semibold">tutor</span>, tutti studenti o neolaureati, seguono da anni le nostre
                  classi con <span className="text-gray-900 font-semibold">metodi di insegnamento rapidi e innovativi</span>, creando un
                  coinvolgimento tale da abbattere ogni barriera d'insegnamento.
                </p>
                
                <p>
                  Sono sempre <span className="text-red-600 font-semibold">disponibili</span>, anche al di fuori delle lezioni, per chiarimenti
                  o spiegazioni aggiuntive!
                </p>
                
                <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded-r-lg mt-6">
                  <p className="font-semibold text-gray-900 text-xl">
                    Cosa aspetti? Vieni a conoscere il nostro metodo!
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <Link href="/contattaci">
                  <Button variant="primary" size="lg" className="w-full sm:w-auto text-lg px-8">
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
