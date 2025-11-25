'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Image from 'next/image';
import { Suspense } from 'react';

const coursesData = {
  medicina: [
    {
      id: 'starter',
      logo: '/images/NEW_LOGO_2026/STARTER.png',
      badge: 'BASE',
      badgeColor: 'bg-[#68BCE8]',
      headerColor: 'bg-[#68BCE8]',
      category: 'MEDICINA • ODONTOIATRIA • VETERINARIA',
      title: 'STARTER CLASS',
      language: 'Italiano / Inglese (IMAT) / Prof. Sanitarie',
      details: [
        {
          icon: '📅',
          label: 'PERIODO',
          text: 'Gennaio - Maggio 2026',
          subtext: 'Sabato / Domenica',
        },
        {
          icon: '📚',
          label: 'DIDATTICA',
          text: '20 lezioni (42 ore)',
        },
        {
          icon: '✓',
          label: 'SIMULAZIONI',
          subtext: '18 tematiche + 1 completa',
        },
      ],
      ctaColor: 'bg-[#68BCE8] hover:bg-[#5AACDB]',
    },
    {
      id: 'academy',
      logo: '/images/NEW_LOGO_2026/ACADEMY.png',
      badge: 'AVANZATO',
      badgeColor: 'bg-[#D54F8A]',
      headerColor: 'bg-[#D54F8A]',
      category: 'MEDICINA • ODONTOIATRIA • VETERINARIA',
      title: 'ACADEMY',
      language: 'Italiano',
      details: [
        {
          icon: 'A',
          label: 'LECTURES',
          text: 'Luglio - Agosto 2026',
          subtext: '24 lezioni • 22 simulazioni',
        },
        {
          icon: 'B',
          label: 'TRAINING',
          text: 'Settembre - Novembre 2026',
          subtext: '22 simulazioni complete + correzioni',
        },
      ],
      ctaColor: 'bg-[#D54F8A] hover:bg-[#C4407A]',
    },
    {
      id: 'intensive',
      logo: '/images/NEW_LOGO_2026/ACADEMY.png',
      badge: 'INTENSIVO',
      badgeColor: 'bg-[#B5B240]',
      headerColor: 'bg-[#B5B240]',
      category: 'MEDICINA • ODONTOIATRIA • VETERINARIA',
      title: 'ACADEMY INTENSIVE TRAINING',
      language: 'Italiano',
      details: [
        {
          icon: '📅',
          label: 'PERIODO',
          text: 'Novembre - Dicembre 2026',
          subtext: 'Lunedì - Domenica',
        },
        {
          icon: '⚡',
          label: 'PROGRAMMA',
          text: '14 simulazioni complete',
          subtext: 'Correzioni commentate (42 ore)',
        },
      ],
      ctaColor: 'bg-[#B5B240] hover:bg-[#A5A238]',
    },
  ],
  imat: [
    {
      id: 'imat-standard',
      logo: '/images/NEW_LOGO_2026/IMAT.png',
      badge: 'STANDARD',
      badgeColor: 'bg-[#19419B]',
      headerColor: 'bg-gradient-to-br from-[#19419B] to-[#19419B]',
      category: 'MEDICINA E ODONTOIATRIA E VETERINARIA IN INGLESE',
      title: 'IMAT CLASS',
      language: 'English',
      details: [
        {
          icon: '📅',
          label: 'PERIOD',
          text: 'June - September 2026',
          subtext: 'Intensive preparation',
        },
        {
          icon: '📚',
          label: 'PROGRAM',
          text: 'Complete IMAT syllabus',
          subtext: 'Medical terminology in English',
        },
        {
          icon: '✓',
          label: 'TESTS',
          text: 'Weekly mock exams',
          subtext: 'Official IMAT past papers',
        },
      ],
      ctaColor: 'bg-gradient-to-r from-[#19419B] to-[#19419B] hover:from-[#19419B] hover:to-[#19419B]',
    },
  ],
  snt: [
    {
      id: 'starter-snt',
      logo: '/images/NEW_LOGO_2026/STARTER.png',
      badge: 'BASE',
      badgeColor: 'bg-[#68BCE8]',
      headerColor: 'bg-[#68BCE8]',
      category: 'PROFESSIONI SANITARIE',
      title: 'STARTER CLASS',
      language: 'Italiano / Prof. Sanitarie',
      details: [
        {
          icon: '📅',
          label: 'PERIODO',
          text: 'Gennaio - Maggio 2026',
          subtext: 'Sabato / Domenica',
        },
        {
          icon: '📚',
          label: 'DIDATTICA',
          text: '20 lezioni (42 ore)',
        },
        {
          icon: '✓',
          label: 'SIMULAZIONI',
          subtext: '18 tematiche + 1 completa',
        },
      ],
      ctaColor: 'bg-[#68BCE8] hover:bg-[#5AACDB]',
    },
    {
      id: 'snt-class',
      logo: '/images/NEW_LOGO_2026/SNT.png',
      badge: 'AVANZATO',
      badgeColor: 'bg-orange-500',
      headerColor: 'bg-orange-500',
      category: 'PROFESSIONI SANITARIE',
      title: 'SNT CLASS',
      language: 'Italiano',
      details: [
        {
          icon: '📅',
          label: 'PERIODO',
          text: 'Luglio - Settembre 2026',
          subtext: 'Preparazione mirata',
        },
        {
          icon: '📚',
          label: 'DIDATTICA',
          text: 'Focus materie principali',
          subtext: 'Biologia, Chimica, Fisica',
        },
        {
          icon: '✓',
          label: 'SIMULAZIONI',
          text: 'Test settimanali',
          subtext: 'Ripasso intensivo',
        },
      ],
      ctaColor: 'bg-orange-500 hover:bg-orange-600',
    },
  ],
  arched: [
    {
      id: 'arched-class',
      logo: '/images/NEW_LOGO_2026/ARCHED.png',
      badge: '',
      badgeColor: 'bg-[#EB635B]',
      headerColor: 'bg-[#EB635B]',
      category: 'ARCHITETTURA',
      title: 'ARCHED CLASS',
      language: 'Italiano',
      details: [
        {
          icon: '📅',
          label: 'PERIODO',
          text: 'Luglio - Settembre 2026',
          subtext: 'Preparazione completa',
        },
        {
          icon: '📚',
          label: 'DIDATTICA',
          text: 'Materie specifiche',
          subtext: 'Matematica, Fisica, Disegno',
        },
        {
          icon: '✓',
          label: 'SIMULAZIONI',
          text: 'Test completi settimanali',
          subtext: 'Correzioni dettagliate',
        },
      ],
      ctaColor: 'bg-[#EB635B] hover:bg-[#D94F49]',
    },
  ],
  altro: [
    {
      id: 'tolc-class',
      logo: '/images/NEW_LOGO_2026/TOLC.png',
      badge: '',
      badgeColor: 'bg-[#1C4865]',
      headerColor: 'bg-[#1C4865]',
      category: 'TOLC',
      title: 'TOLC CLASS',
      language: 'Italiano',
      details: [
        {
          icon: '📊',
          label: 'TEST',
          text: 'TOLC-MED, TOLC-I, TOLC-SU',
          subtext: 'Preparazione specifica',
        },
        {
          icon: '📚',
          label: 'PROGRAMMA',
          text: 'Materie mirate per ogni TOLC',
          subtext: 'Logica, Matematica, Scienze',
        },
        {
          icon: '✅',
          label: 'MODALITÀ',
          text: 'Lezioni ed esercitazioni',
          subtext: 'Simulazioni complete',
        },
      ],
      ctaColor: 'bg-[#1C4865] hover:bg-[#15354A]',
    },
    {
      id: 'altro-class',
      logo: '/images/NEW_LOGO_2026/PT.png',
      badge: '',
      badgeColor: 'bg-gray-600',
      headerColor: 'bg-gray-600',
      category: 'PERCORSI PERSONALIZZATI',
      title: 'Personal Training',
      language: 'Italiano',
      details: [
        {
          icon: '🎯',
          label: 'OBIETTIVO',
          text: 'Su misura per te',
          subtext: 'Programma personalizzato',
        },
        {
          icon: '📚',
          label: 'MATERIE',
          text: 'Scegli il tuo percorso',
          subtext: 'Flessibilità totale',
        },
        {
          icon: '👥',
          label: 'MODALITÀ',
          text: 'Individuale o gruppo',
          subtext: 'Online o in presenza',
        },
      ],
      ctaColor: 'bg-gray-600 hover:bg-gray-700',
    },
  ],
};

function DidatticaContent() {
  const searchParams = useSearchParams();
  const corso = searchParams.get('corso') || 'medicina';

  const selectedCourses = coursesData[corso as keyof typeof coursesData] || coursesData.medicina;
  const showImat = corso === 'medicina'; // Mostra IMAT solo quando si visualizza medicina

  // Funzione per ottenere il titolo della sezione
  const getSectionTitle = () => {
    switch (corso) {
      case 'medicina':
        return 'Semestre Aperto';
      case 'snt':
        return 'Professioni Sanitarie';
      case 'arched':
        return 'ARCHED';
      case 'altro':
        return 'TOLC, CEnT e Didattica Personalizzata';
      default:
        return 'Corsi Disponibili';
    }
  };

  // Funzione per ottenere il titolo dell'hero
  const getHeroTitle = () => {
    switch (corso) {
      case 'medicina':
        return 'MEDICINA • ODONTOIATRIA • VETERINARIA';
      case 'imat':
        return 'IMAT - International Medical Admissions Test';
      case 'snt':
        return 'PROFESSIONI SANITARIE';
      case 'arched':
        return 'ARCHITETTURA';
      case 'altro':
        return 'Test CISIA e Altri Corsi';
      default:
        return 'Corsi Disponibili';
    }
  };

  // Funzione per ottenere la descrizione dell'hero
  const getHeroDescription = () => {
    switch (corso) {
      case 'medicina':
        return 'Preparazione completa per l\'ammissione a Medicina e Chirurgia, Odontoiatria e Protesi Dentaria e Medicina Veterinaria';
      case 'imat':
        return 'Corso intensivo per il test di ammissione in lingua inglese a Medicina e Odontoiatria';
      case 'snt':
        return 'Preparazione completa per l\'ammissione ai Corsi di Laurea delle Professioni Sanitarie';
      case 'arched':
        return 'Preparazione completa per l\'ammissione ai Corsi di Laurea direttamente finalizzati alla professione di Architetto';
      case 'altro':
        return 'Test CISIA e percorsi didattici personalizzati per ogni tua esigenza';
      default:
        return 'Scegli il percorso più adatto alle tue esigenze';
    }
  };

  return (
    <div className="min-h-screen pb-16 bg-gray-50">

      {/* Hero Section */}
      <section className="relative py-24 bg-black text-white overflow-hidden">

        <div className="container mx-auto px-4 text-center relative z-10">
          <h1 className="text-4xl md:text-6xl font-black mb-6">
            { corso !== 'medicina' ? getHeroTitle() : 'MEDICINA, ODONTOIATRIA, VETERINARIA' }
          </h1>
          <p className="text-xl text-gray-300">
            {getHeroDescription()}
          </p>

          {/* Course tabs integrated in hero */}
          <div className="flex flex-wrap justify-center gap-4 mt-12">
            <Link
              href="/didattica?corso=medicina"
              className={`px-8 py-4 rounded-2xl font-bold transition-all transform hover:scale-105 ${corso === 'medicina'
                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-xl shadow-red-500/50'
                : 'bg-white/10 backdrop-blur-md text-white border border-white/20 hover:bg-white/20'
                }`}
            >
              Medicina
            </Link>
            <Link
              href="/didattica?corso=snt"
              className={`px-8 py-4 rounded-2xl font-bold transition-all transform hover:scale-105 ${corso === 'snt'
                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-xl shadow-red-500/50'
                : 'bg-white/10 backdrop-blur-md text-white border border-white/20 hover:bg-white/20'
                }`}
            >
              Professioni Sanitarie
            </Link>
            <Link
              href="/didattica?corso=arched"
              className={`px-8 py-4 rounded-2xl font-bold transition-all transform hover:scale-105 ${corso === 'arched'
                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-xl shadow-red-500/50'
                : 'bg-white/10 backdrop-blur-md text-white border border-white/20 hover:bg-white/20'
                }`}
            >
              Architettura
            </Link>
            <Link
              href="/didattica?corso=altro"
              className={`px-8 py-4 rounded-2xl font-bold transition-all transform hover:scale-105 ${corso === 'altro'
                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-xl shadow-red-500/50'
                : 'bg-white/10 backdrop-blur-md text-white border border-white/20 hover:bg-white/20'
                }`}
            >
              Altro
            </Link>
          </div>
        </div>
      </section>

      {/* Courses Grid */}
      <section className="py-24 bg-gradient-to-b from-white via-gray-50 to-white relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <h2 className="text-4xl text-black text-center mb-10 font-bold">
            {getSectionTitle()}
          </h2>
          <div className="text-center mb-8">
            <span className="inline-block px-6 py-2 bg-[#a8012b] text-white rounded-full text-sm font-bold uppercase tracking-wider">
              {getHeroTitle()}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 max-w-7xl mx-auto">
            {selectedCourses.map((course) => (
              <div
                key={course.id}
                className="group relative"
              >
                {/* Main Card */}
                <div className="relative bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 overflow-hidden border-2 border-gray-100 flex flex-col h-full">

                  {/* Top white section with logo */}
                  <div className="relative px-8 py-12 bg-white overflow-hidden flex-shrink-0 h-64 flex items-center">
                    {/* Subtle decorative elements */}
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-gray-50 rounded-full" />
                    <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-gray-50 rounded-full" />

                    {/* Badge colorato */}
                    <div className="absolute top-4 right-4 z-20">
                      <span className={`${course.badgeColor} text-white px-4 py-2 rounded-full text-xs font-black shadow-lg uppercase tracking-widest`}>
                        {course.badge}
                      </span>
                    </div>

                    {/* Logo */}
                    <div className="relative z-10 flex justify-center w-full">
                      <Image
                        src={course.logo}
                        alt={course.title}
                        width={240}
                        height={90}
                        className="object-contain transform group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                  </div>

                  {/* Colored accent line */}
                  <div className={`h-1 ${course.headerColor}`} />

                  {/* Card content */}
                  <div className="p-8 flex flex-col flex-grow">
                    {/* Category */}
                    <div className="text-xs text-gray-400 font-black mb-3 tracking-widest uppercase">
                      {course.category}
                    </div>

                    {/* Title */}
                    <h3 className="text-2xl font-black text-gray-900 mb-3 leading-tight">
                      {course.title}
                    </h3>

                    {/* Details - flex-grow pushes button to bottom */}
                    <div className="space-y-5 mb-8 flex-grow">
                      {course.details.map((detail, index) => (
                        <div key={index} className="flex gap-4 items-start">
                          <div className={`${course.badgeColor} text-white min-w-[52px] h-[52px] rounded-2xl flex items-center justify-center font-black shrink-0 shadow-lg text-xl transform group-hover:rotate-6 transition-transform`}>
                            {detail.icon}
                          </div>
                          <div className="flex-1 pt-1">
                            <div className="text-xs text-gray-400 font-black mb-1.5 uppercase tracking-wider">
                              {detail.label}
                            </div>
                            <div className="text-base font-bold text-gray-900 leading-snug mb-1">
                              {detail.text}
                            </div>
                            {detail.subtext && (
                              <div className="text-sm text-gray-600">
                                {detail.subtext}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* CTA Button - always at same position */}
                    <Link href={`/contattaci?oggetto=${encodeURIComponent(course.title)}`}>
                      <button
                        className={`w-full ${course.ctaColor} text-white font-black py-5 px-6 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-2xl uppercase tracking-wider text-sm relative overflow-hidden group/btn`}
                      >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                          Contattaci Ora
                          <svg className="w-5 h-5 transform group-hover/btn:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
                      </button>
                    </Link>
                  </div>

                  {/* Bottom accent line */}
                  <div className={`h-2 ${course.headerColor}`} />
                </div>

                {/* Floating glow effect on hover */}
                <div className={`absolute inset-0 ${course.headerColor} opacity-0 group-hover:opacity-20 blur-2xl rounded-3xl transition-opacity duration-500 -z-10`} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* IMAT Section - Separata */}
      {showImat && (
        <section className="bg-gradient-to-b from-gray-50 via-white to-gray-50 relative overflow-hidden">
          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center mb-8">
              <h2 className="text-4xl text-black font-bold mb-4">
                IMAT
              </h2>
              <span className="inline-block px-6 py-2 bg-[#a8012b] text-white rounded-full text-sm font-bold uppercase tracking-wider mb-4">
                International Medical Admissions Test
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 max-w-7xl mx-auto">
              {coursesData.imat.map((course) => (
                <div
                  key={course.id}
                  className="group relative"
                >
                  {/* Main Card */}
                  <div className="relative bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 overflow-hidden border-2 border-gray-100 flex flex-col h-full">

                    {/* Top white section with logo */}
                    <div className="relative px-8 py-12 bg-white overflow-hidden flex-shrink-0 h-64 flex items-center">
                      {/* Subtle decorative elements */}
                      <div className="absolute -top-10 -right-10 w-40 h-40 bg-gray-50 rounded-full" />
                      <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-gray-50 rounded-full" />

                      {/* Badge colorato */}
                      <div className="absolute top-4 right-4 z-20">
                        <span className={`${course.badgeColor} text-white px-4 py-2 rounded-full text-xs font-black shadow-lg uppercase tracking-widest`}>
                          {course.badge}
                        </span>
                      </div>

                      {/* Logo */}
                      <div className="relative z-10 flex justify-center w-full">
                        <Image
                          src={course.logo}
                          alt={course.title}
                          width={240}
                          height={90}
                          className="object-contain transform group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                    </div>

                    {/* Card content */}
                    <div className="p-8 flex flex-col flex-grow">
                      {/* Category */}
                      <div className="text-xs text-gray-400 font-black mb-3 tracking-widest uppercase">
                        {course.category}
                      </div>

                      {/* Title */}
                      <h3 className="text-2xl font-black text-gray-900 mb-3 leading-tight">
                        {course.title}
                      </h3>

                      {/* Language badge */}
                      <div className="inline-block mb-8">
                        <span className={`text-sm font-bold ${course.headerColor} text-white px-4 py-1.5 rounded-full shadow-md`}>
                          {course.language}
                        </span>
                      </div>

                      {/* Details - flex-grow pushes button to bottom */}
                      <div className="space-y-5 mb-8 flex-grow">
                        {course.details.map((detail, index) => (
                          <div key={index} className="flex gap-4 items-start">
                            <div className={`${course.badgeColor} text-white min-w-[52px] h-[52px] rounded-2xl flex items-center justify-center font-black shrink-0 shadow-lg text-xl transform group-hover:rotate-6 transition-transform`}>
                              {detail.icon}
                            </div>
                            <div className="flex-1 pt-1">
                              <div className="text-xs text-gray-400 font-black mb-1.5 uppercase tracking-wider">
                                {detail.label}
                              </div>
                              <div className="text-base font-bold text-gray-900 leading-snug mb-1">
                                {detail.text}
                              </div>
                              {detail.subtext && (
                                <div className="text-sm text-gray-600">
                                  {detail.subtext}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* CTA Button - always at same position */}
                      <Link href={`/contattaci?oggetto=${encodeURIComponent(course.title)}`}>
                        <button
                          className={`w-full ${course.ctaColor} text-white font-black py-5 px-6 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-2xl uppercase tracking-wider text-sm relative overflow-hidden group/btn`}
                        >
                          <span className="relative z-10 flex items-center justify-center gap-2">
                            Contattaci Ora
                            <svg className="w-5 h-5 transform group-hover/btn:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </span>
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
                        </button>
                      </Link>
                    </div>

                    {/* Bottom accent line */}
                    <div className={`h-2 ${course.headerColor}`} />
                  </div>

                  {/* Floating glow effect on hover */}
                  <div className={`absolute inset-0 ${course.headerColor} opacity-0 group-hover:opacity-20 blur-2xl rounded-3xl transition-opacity duration-500 -z-10`} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Hai bisogno di aiuto?
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Prenota un colloquio gratuito e costruiremo insieme un percorso su misura per te
          </p>
          <Link href="/contattaci">
            <Button variant="primary" size="lg">
              Prenota un Colloquio
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

export default function DidatticaPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    }>
      <DidatticaContent />
    </Suspense>
  );
}
