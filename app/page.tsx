import HeroCarousel from '@/components/ui/HeroCarousel';
import TestCard from '@/components/ui/TestCard';
import StatsSection from '@/components/ui/StatsSection';
import TestimonialsCarousel from '@/components/ui/TestimonialsCarousel';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import Image from 'next/image';
import { TestCard as TestCardType, Testimonial } from '@/types';

const tests: TestCardType[] = [
  {
    id: 'medicina',
    title: 'Test Medicina e Odontoiatria',
    description: 'Medicina e Odontoiatria in italiano',
    image: '/images/med.png',
    link: 'https://accessoprogrammato.mur.gov.it/2024/',
  },
  {
    id: 'veterinaria',
    title: 'Test Veterinaria',
    description: 'Medicina Veterinaria in italiano',
    image: '/images/vet.png',
    link: 'https://accessoprogrammato.mur.gov.it/2024/',
  },
  {
    id: 'imat',
    title: 'IMAT',
    description: 'Medicina e Odontoiatria in inglese',
    image: '/images/imat.png',
    link: 'https://accessoprogrammato.mur.gov.it/2024/',
  },
  {
    id: 'sanitarie',
    title: 'Test Professioni Sanitarie',
    description: 'Professioni Sanitarie in italiano o inglese',
    image: '/images/snt.png',
    link: 'https://www.mur.gov.it/it/atti-e-normativa/decreto-ministeriale-n-1116-del-31-07-2024',
  },
];

const testimonials: Testimonial[] = [
  {
    id: '1',
    name: 'Noemi C.',
    course: 'Medicina e Chirurgia',
    university: 'Catania',
    image: '/images/1.jpeg',
    text: 'Il loro modo di lavorare, la loro gentilezza e il loro sostegno dato, mi hanno permesso di raggiungere il mio più grande sogno.',
  },
  {
    id: '2',
    name: 'Sara O.',
    course: 'Medicina e Chirurgia',
    university: 'Catania',
    image: '/images/2.jpeg',
    text: 'Grazie a loro accurato metodo di insegnamento e alla loro disponibilità sono finalmente riuscita a raggiungere il mio obiettivo.',
  },
  {
    id: '3',
    name: 'Francesco G.',
    course: 'Fisioterapia',
    university: 'Catania',
    image: '/images/3.jpeg',
    text: 'Grazie all\'ottima preparazione, al costante interesse, aiuto e ai semplici trucchetti dei miei tutor sono riuscito ad entrare nel corso di laurea di Fisioterapia. Lo consiglio a tutti!',
  },
  {
    id: '4',
    name: 'Vittoria G.',
    course: 'Medicina e Chirurgia',
    university: 'Catania',
    image: '/images/4.jpeg',
    text: 'Entusiata del percorso fatto con i tutor, i progressi sono stati incredibili e tutto grazie alla passione e alla dedizione che questi ragazzi mettono nel loro lavoro.',
  },
  {
    id: '5',
    name: 'Delia B.',
    course: 'Medicina e Chirurgia',
    university: 'Torino',
    image: '/images/5.jpeg',
    text: 'Mesi di duro lavoro direzionato dai tutor super competenti e costantemente disponibili possono determinare il resto della tua vita! Tornando indietro mi affiderei altre cento volte: è stata la mossa più intelligente che abbia mai fatto. Grazie!',
  },
];

export default function Home() {
  return (
    <>
      {/* Hero Section with Animated Background Images */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Background Images */}
        <div className="absolute inset-0">
          {/* Base gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/100 z-10" />
          
          {/* Animated images that fade in and out */}
          <div className="absolute inset-0">
            <div className="absolute inset-0 animate-fadeInOut" style={{ animationDelay: '0s' }}>
              <Image src="/images/conference.jpg" alt="" fill className="object-cover" priority />
            </div>
            <div className="absolute inset-0 animate-fadeInOut" style={{ animationDelay: '5s' }}>
              <Image src="/images/student.jpg" alt="" fill className="object-cover" />
            </div>
            <div className="absolute inset-0 animate-fadeInOut" style={{ animationDelay: '10s' }}>
              <Image src="/images/student2.jpg" alt="" fill className="object-cover" />
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 pt-32 pb-20 relative z-30">
          <div className="max-w-5xl mx-auto text-center space-y-8">
            {/* Main Heading */}
            <div className="space-y-4">
              <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight">
                LEONARDO SCHOOL
              </h1>
              <div className="h-1.5 w-32 bg-gradient-to-r from-red-500 to-red-600 mx-auto rounded-full" />
            </div>

            {/* Subheading */}
            <h2 className="text-2xl md:text-4xl text-white font-light">
              Il tuo successo inizia qui
            </h2>

            {/* Description */}
            <p className="text-lg md:text-xl text-gray-200 max-w-3xl mx-auto leading-relaxed">
              Preparazione d&apos;eccellenza per i test di Medicina, Odontoiatria, Veterinaria, 
              IMAT e Professioni Sanitarie. Metodi innovativi e tutor qualificati per realizzare il tuo sogno.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
              <Link href="/didattica">
                <Button variant="primary" size="lg" className="min-w-[200px]">
                  Scopri i Corsi
                </Button>
              </Link>
              <Link href="/simulazione">
                <Button variant="outline" size="lg" className="min-w-[200px]">
                  Prova una Simulazione
                </Button>
              </Link>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-16">
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-red-500 mb-2">+150</div>
                <div className="text-sm text-gray-300">Studenti Soddisfatti</div>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-red-500 mb-2">89%</div>
                <div className="text-sm text-gray-300">Ammessi alla Prima Scelta</div>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-red-500 mb-2">+4000</div>
                <div className="text-sm text-gray-300">Ore di Corso Svolte</div>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-red-500 mb-2">+20</div>
                <div className="text-sm text-gray-300">Giovani Tutor</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tests Section */}
      <section id="about" className="py-24 bg-gradient-to-b from-white via-gray-50 to-white relative">
        {/* Decorative Elements */}
        <div className="absolute top-20 left-10 w-64 h-64 bg-red-100 rounded-full blur-3xl opacity-30" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-red-50 rounded-full blur-3xl opacity-40" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-10">
            <div className="inline-block mb-4">
              <span className="text-sm font-semibold text-red-600 bg-red-50 px-4 py-2 rounded-full uppercase tracking-wider">
                I nostri corsi
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Quale test vuoi sostenere?
            </h1>
            <div className="w-24 h-1.5 bg-gradient-to-r from-red-500 to-red-600 mx-auto rounded-full" />
            <p className="text-lg text-gray-600 mt-6 max-w-2xl mx-auto">
              Scegli il corso di preparazione più adatto alle tue esigenze
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            {tests.map((test) => (
              <TestCard key={test.id} test={test} />
            ))}
          </div>

          <div className="text-center">
            <Link href="/test">
              <Button variant="primary" size="lg" className="shadow-xl shadow-red-600/20 hover:shadow-2xl hover:shadow-red-600/30">
                Scopri tutti i corsi
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section - Modern Split Design */}
      <section className="bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 max-w-7xl mx-auto rounded-3xl overflow-hidden shadow-2xl">
            {/* Left Side - Dark Card */}
            <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 p-12 lg:p-16 flex flex-col justify-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-red-600/10 rounded-full blur-3xl" />
              
              <div className="relative z-10">
                <div className="inline-block mb-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
                
                <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6 leading-tight">
                  Costruiamo insieme<br />il tuo successo
                </h2>
                
                <p className="text-gray-300 text-lg leading-relaxed mb-8">
                  Analizziamo il tuo punto di partenza, ci prefissiamo obiettivi periodici 
                  e ti indirizziamo verso il percorso didattico più adatto alle tue esigenze.
                </p>
                
                <div className="space-y-4 mb-10">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-red-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-gray-300">Lezioni in presenza e online</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-red-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-gray-300">Supporto didattico personalizzato</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-red-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-gray-300">Monitoraggio costante dei progressi</p>
                  </div>
                </div>
                
                <Link href="/contattaci">
                  <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                    Prenota un colloquio gratuito
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right Side - Image */}
            <div className="relative h-[400px] lg:h-auto min-h-[500px]">
              <Image
                src="/images/conference.jpg"
                alt="Studenti Leonardo School"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <TestimonialsCarousel testimonials={testimonials} />

      {/* Partner Section - Minimalist */}
      <section className="bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              I nostri Partner
            </h2>
            
            <div className="w-20 h-1 bg-gradient-to-r from-red-500 to-red-600 mx-auto rounded-full mb-5" />
            
            <a
              href="https://www.fonolinguistico.it/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block group"
            >
              <div className="bg-black border-2 border-gray-200 rounded-2xl p-12 hover:border-red-500 hover:shadow-xl transition-all duration-300">
                <img
                  src="/images/partner.png"
                  alt="Partner - Centro Fonolinguistico"
                  className="max-w-full h-auto mx-auto group-hover:scale-105 transition-transform duration-300"
                  style={{ maxWidth: '450px' }}
                />
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* WhatsApp Floating Button */}
      <a
        href="https://wa.me/+393516467873"
        className="fixed bottom-8 right-8 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-full p-5 shadow-2xl hover:shadow-green-500/50 hover:scale-110 transition-all duration-300 z-50 group animate-bounce hover:animate-none"
        aria-label="Contattaci su WhatsApp"
      >
        <svg className="w-8 h-8 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>
      </a>
    </>
  );
}
