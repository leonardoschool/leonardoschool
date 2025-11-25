'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Suspense } from 'react';

const coursesData = {
  medicina: [
    {
      id: 'starter',
      logo: '/images/NEW_LOGO_2026/STARTER.png',
      badge: 'BASE',
      badgeColor: 'bg-[#42BFED]',
      headerColor: 'bg-[#42BFED]',
      category: 'MEDICINA • ODONTOIATRIA • VETERINARIA',
      title: 'STARTER CLASS',
      language: 'Italiano / Inglese (IMAT) / Prof. Sanitarie',
      details: [
        {
          icon: '🗓',
          label: 'PERIODO',
          text: 'dicembre-maggio 2026',
        },
        {
          icon: '🧑‍🏫',
          label: 'DIDATTICA FRONTALE',
          text: '42 ore',
        },
        {
          icon: '📊',
          label: 'ESERCITAZIONE',
          text: '21 ore',
        },
      ],
      ctaColor: 'bg-[#42BFED] hover:bg-[#5AACDB]',
    },
    {
      id: 'academy',
      logo: '/images/NEW_LOGO_2026/ACADEMY.png',
      badge: 'AVANZATO',
      badgeColor: 'bg-[#E7418B]',
      headerColor: 'bg-[#E7418B]',
      category: 'MEDICINA • ODONTOIATRIA • VETERINARIA',
      title: 'ACADEMY',
      language: 'Italiano',
      details: [
        {
          icon: '🗓',
          label: '1° PERIODO',
          text: 'luglio-agosto 2026',
        },
        {
          icon: '🧑‍🏫',
          label: 'DIDATTICA FRONTALE',
          text: '72 ore',
        },
        {
          icon: '📊',
          label: 'ESERCITAZIONE',
          text: '11 ore',
        },
        {
          icon: '🗓',
          label: '2° PERIODO',
          text: 'settembre-novembre 2026',
        },
        {
          icon: '🧑‍🏫',
          label: 'DIDATTICA FRONTALE',
          text: '66 ore',
        },
        {
          icon: '📊',
          label: 'ESERCITAZIONE',
          text: '66 ore',
        },
      ],
      ctaColor: 'bg-[#E7418B] hover:bg-[#C4407A]',
    },
    {
      id: 'intensive',
      logo: '/images/NEW_LOGO_2026/ACADEMY.png',
      badge: 'INTENSIVO',
      badgeColor: 'bg-[#B6B21D]',
      headerColor: 'bg-[#B6B21D]',
      category: 'MEDICINA • ODONTOIATRIA • VETERINARIA',
      title: 'ACADEMY INTENSIVE TRAINING',
      language: 'Italiano',
      details: [
        {
          icon: '🗓',
          label: 'PERIODO',
          text: 'novembre-dicembre 2026',
        },
        {
          icon: '🧑‍🏫',
          label: 'DIDATTICA FRONTALE',
          text: '42 ore',
        },
        {
          icon: '📊',
          label: 'ESERCITAZIONE',
          text: '42 ore',
        },
      ],
      ctaColor: 'bg-[#B6B21D] hover:bg-[#A5A238]',
    },
  ],
  imat: [
    {
      id: 'imat-starter',
      logo: '/images/NEW_LOGO_2026/STARTER.png',
      badge: 'BASE',
      badgeColor: 'bg-[#42BFED]',
      headerColor: 'bg-[#42BFED]',
      category: 'MEDICINA • ODONTOIATRIA • VETERINARIA',
      title: 'STARTER CLASS',
      language: 'Italiano / Inglese (IMAT) / Prof. Sanitarie',
      details: [
        {
          icon: '🗓',
          label: 'PERIODO',
          text: 'dicembre-maggio 2026',
        },
        {
          icon: '🧑‍🏫',
          label: 'DIDATTICA FRONTALE',
          text: '42 ore',
        },
        {
          icon: '✍',
          label: 'ESERCITAZIONE',
          text: '21 ore',
        },
      ],
      ctaColor: 'bg-[#42BFED] hover:bg-[#5AACDB]',
    },
    {
      id: 'imat-advanced',
      logo: '/images/NEW_LOGO_2026/IMAT.png',
      badge: 'AVANZATO',
      badgeColor: 'bg-[#19419B]',
      headerColor: 'bg-gradient-to-br from-[#19419B] to-[#19419B]',
      category: 'MEDICINA E ODONTOIATRIA E VETERINARIA IN INGLESE',
      title: 'IMAT CLASS',
      language: 'English',
      details: [
        {
          icon: '🗓',
          label: 'PERIOD',
          text: 'June-September 2026',
        },
        {
          icon: '🧑‍🏫',
          label: 'LECTURES',
          text: '30 ore',
        },
        {
          icon: '✍',
          label: 'TRAINING',
          text: '25 ore',
        },
      ],
      ctaColor: 'bg-gradient-to-r from-[#19419B] to-[#19419B] hover:from-[#19419B] hover:to-[#19419B]',
    },
  ],
  snt: [
    {
      id: 'starter',
      logo: '/images/NEW_LOGO_2026/STARTER.png',
      badge: 'BASE',
      badgeColor: 'bg-[#42BFED]',
      headerColor: 'bg-[#42BFED]',
      category: 'MEDICINA • ODONTOIATRIA • VETERINARIA',
      title: 'STARTER CLASS',
      language: 'Italiano / Inglese (IMAT) / Prof. Sanitarie',
      details: [
        {
          icon: '🗓',
          label: 'PERIODO',
          text: 'Dicembre - Maggio 2026',
          subtext: 'Sabato / Domenica',
        },
        {
          icon: '🧑‍🏫',
          label: 'DIDATTICA FRONTALE',
          text: '20 lezioni (42 ore)',
        },
        {
          icon: '📊',
          label: 'ESERCITAZIONE',
          subtext: '21 ore',
        },
      ],
      ctaColor: 'bg-[#42BFED] hover:bg-[#5AACDB]',
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
          icon: '🗓',
          label: 'PERIODO',
          text: 'luglio-settembre 2026',
        },
        {
          icon: '🧑‍🏫',
          label: 'DIDATTICA FRONTALE',
          text: '70 ore',
        },
        {
          icon: '📊',
          label: 'ESERCITAZIONE',
          text: '40 ore',
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
          icon: '🗓',
          label: 'PERIODO',
          text: 'luglio-settembre 2026',
        },
        {
          icon: '🧑‍🏫',
          label: 'DIDATTICA FRONTALE',
          text: '55 ore',
        },
        {
          icon: '📊',
          label: 'ESERCITAZIONE',
          text: '40 ore',
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
      <section className="relative pt-32 pb-24 bg-black text-white overflow-hidden">

        <div className="container mx-auto px-4 text-center relative z-10">
          <h1 className="text-4xl md:text-6xl font-black mb-6">
            {corso !== 'medicina' ? getHeroTitle() : 'MEDICINA, ODONTOIATRIA, VETERINARIA'}
          </h1>
          <div className="w-24 h-1.5 bg-gradient-to-r from-red-500 to-red-600 mx-auto rounded-full mb-8" />
          <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
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
      <section className="py-12 bg-gradient-to-b from-white via-gray-50 to-white relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <p className="text-lg text-gray-600 mt-6 mb-6 max-w-2xl mx-auto text-center">
            Scegli il corso di preparazione più adatto alle tue esigenze
          </p>
          <h2 className="text-4xl text-black text-center mb-10 font-bold">
            {getSectionTitle()}
          </h2>
          <div className="text-center mb-8">
            <span className="inline-block px-6 py-2 bg-[#a8012b] text-white rounded-full text-sm font-bold uppercase tracking-wider">
              {getHeroTitle()}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {selectedCourses.map((course) => (
              <div
                key={course.id}
                className="group relative"
              >
                {/* Main Card with premium design */}
                <div className="relative bg-gradient-to-br from-white via-white to-gray-50/50 rounded-3xl shadow-2xl hover:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] transition-all duration-700 transform hover:-translate-y-4 hover:scale-[1.02] overflow-hidden border border-gray-200/50 flex flex-col h-full backdrop-blur-sm">

                  {/* Top section with logo - glassmorphism effect - REDUCED HEIGHT */}
                  <div className="relative px-6 py-8 bg-gradient-to-br from-white/95 via-gray-50/80 to-white/95 overflow-hidden flex-shrink-0 h-48 flex items-center backdrop-blur-xl">
                    {/* Premium decorative gradient orbs */}
                    <div className={`absolute -top-12 -right-12 w-48 h-48 ${course.badgeColor} opacity-5 rounded-full blur-3xl group-hover:opacity-10 transition-opacity duration-700`} />
                    <div className={`absolute -bottom-10 -left-10 w-40 h-40 ${course.badgeColor} opacity-5 rounded-full blur-2xl group-hover:opacity-10 transition-opacity duration-700`} />
                    
                    {/* Animated gradient mesh background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-gray-50/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                    {/* Premium badge with gradient */}
                    <div className="absolute top-6 right-6 z-20">
                      <span className={`${course.badgeColor} text-white px-5 py-2.5 rounded-full text-xs font-black shadow-xl uppercase tracking-widest backdrop-blur-sm border border-white/20 transform group-hover:scale-110 transition-transform duration-300`}>
                        {course.badge}
                      </span>
                    </div>

                    {/* Logo with enhanced animation */}
                    <div className="relative z-10 flex justify-center w-full">
                      <div className="relative">
                        {/* Glow effect behind logo */}
                        <div className={`absolute inset-0 ${course.badgeColor} opacity-0 group-hover:opacity-20 blur-2xl transition-opacity duration-700`} />
                        <Image
                          src={course.logo}
                          alt={course.title}
                          width={200}
                          height={75}
                          className="object-contain transform group-hover:scale-110 transition-transform duration-700 relative z-10 drop-shadow-lg"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Premium gradient accent line */}
                  <div className={`h-1.5 bg-gradient-to-r ${course.headerColor} shadow-lg`} />

                  {/* Card content with premium spacing - REDUCED PADDING */}
                  <div className="p-6 flex flex-col flex-grow bg-gradient-to-b from-transparent to-gray-50/30">
                    {/* Category with gradient */}
                    <div className="text-[10px] text-gray-400 font-black mb-2 tracking-[0.2em] uppercase">
                      {course.category}
                    </div>

                    {/* Title with premium styling */}
                    <h3 className="text-xl font-black text-gray-900 mb-4 leading-tight bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text">
                      {course.title}
                    </h3>

                    {/* Details - enhanced design */}
                    <div className="mb-6 flex-grow">
                      <div className={course.details.length > 3 ? "grid grid-cols-3 gap-2 mt-6" : "flex flex-col gap-2.5 max-w-sm mx-auto"}>
                        {course.details.map((detail, index) => (
                          <div 
                            key={index} 
                            className={course.details.length > 3 
                              ? "text-center group/item" 
                              : "relative flex items-center gap-3 bg-gradient-to-br from-white to-gray-50/80 rounded-xl p-3 shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100/50 backdrop-blur-sm group/item hover:-translate-y-1"
                            }
                          >
                            {/* Icon with premium effects */}
                            <div className={`${course.badgeColor} text-white ${course.details.length > 3 ? 'w-12 h-12' : 'w-14 h-14 flex-shrink-0'} rounded-xl flex items-center justify-center font-black ${course.details.length > 3 ? 'mx-auto mb-1.5' : ''} shadow-xl text-lg transform group-hover/item:scale-110 group-hover/item:rotate-3 transition-all duration-300 relative overflow-hidden`}>
                              {/* Shine effect */}
                              <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-300" />
                              <span className="relative z-10">{detail.icon}</span>
                            </div>
                            <div className={course.details.length > 3 ? '' : 'flex-1 text-left'}>
                              <div className={`${course.details.length > 3 ? 'text-[10px]' : 'text-xs'} text-gray-400 font-black mb-1 uppercase tracking-wider leading-tight`}>
                                {detail.label}
                              </div>
                              {detail.text && (
                                <div className={`${course.details.length > 3 ? 'text-xs' : 'text-sm'} font-bold text-gray-900 leading-tight`}>
                                  {detail.text}
                                </div>
                              )}
                              {(detail as any).subtext && (
                                <div className="text-[10px] text-gray-600 mt-0.5 leading-tight">
                                  {(detail as any).subtext}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Premium CTA Button with advanced effects */}
                    <Link href={`/contattaci?oggetto=${encodeURIComponent(course.title)}`}>
                      <button
                        className={`w-full ${course.ctaColor} text-white font-black py-4 px-6 rounded-2xl transition-all duration-500 transform hover:scale-105 hover:shadow-2xl shadow-xl uppercase tracking-wider text-sm relative overflow-hidden group/btn border border-white/20`}
                      >
                        <span className="relative z-10 flex items-center justify-center gap-3">
                          <span>Contattaci Ora</span>
                          <svg className="w-5 h-5 transform group-hover/btn:translate-x-2 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </span>
                        {/* Multiple shine effects */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent transform -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                      </button>
                    </Link>
                  </div>

                  {/* Premium bottom accent with gradient */}
                  <div className={`h-2 bg-gradient-to-r ${course.headerColor} shadow-inner`} />
                </div>

                {/* Premium floating glow effect on hover */}
                <div className={`absolute inset-0 ${course.headerColor} opacity-0 group-hover:opacity-20 blur-3xl rounded-3xl transition-opacity duration-700 -z-10 scale-95 group-hover:scale-105`} />
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {coursesData.imat.map((course) => (
                <div
                  key={course.id}
                  className="group relative"
                >
                  {/* Main Card with premium design */}
                  <div className="relative bg-gradient-to-br from-white via-white to-gray-50/50 rounded-3xl shadow-2xl hover:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] transition-all duration-700 transform hover:-translate-y-4 hover:scale-[1.02] overflow-hidden border border-gray-200/50 flex flex-col h-full backdrop-blur-sm">

                    {/* Top section with logo - glassmorphism effect - REDUCED HEIGHT */}
                    <div className="relative px-6 py-8 bg-gradient-to-br from-white/95 via-gray-50/80 to-white/95 overflow-hidden flex-shrink-0 h-48 flex items-center backdrop-blur-xl">
                      {/* Premium decorative gradient orbs */}
                      <div className={`absolute -top-12 -right-12 w-48 h-48 ${course.badgeColor} opacity-5 rounded-full blur-3xl group-hover:opacity-10 transition-opacity duration-700`} />
                      <div className={`absolute -bottom-10 -left-10 w-40 h-40 ${course.badgeColor} opacity-5 rounded-full blur-2xl group-hover:opacity-10 transition-opacity duration-700`} />
                      
                      {/* Animated gradient mesh background */}
                      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-gray-50/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                      {/* Premium badge with gradient */}
                      <div className="absolute top-6 right-6 z-20">
                        <span className={`${course.badgeColor} text-white px-5 py-2.5 rounded-full text-xs font-black shadow-xl uppercase tracking-widest backdrop-blur-sm border border-white/20 transform group-hover:scale-110 transition-transform duration-300`}>
                          {course.badge}
                        </span>
                      </div>

                      {/* Logo with enhanced animation */}
                      <div className="relative z-10 flex justify-center w-full">
                        <div className="relative">
                          {/* Glow effect behind logo */}
                          <div className={`absolute inset-0 ${course.badgeColor} opacity-0 group-hover:opacity-20 blur-2xl transition-opacity duration-700`} />
                          <Image
                            src={course.logo}
                            alt={course.title}
                            width={200}
                            height={75}
                            className="object-contain transform group-hover:scale-110 transition-transform duration-700 relative z-10 drop-shadow-lg"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Premium gradient accent line */}
                    <div className={`h-1.5 bg-gradient-to-r ${course.headerColor} shadow-lg`} />

                    {/* Card content with premium spacing - REDUCED PADDING */}
                    <div className="p-6 flex flex-col flex-grow bg-gradient-to-b from-transparent to-gray-50/30">
                      {/* Category with gradient */}
                      <div className="text-[10px] text-gray-400 font-black mb-2 tracking-[0.2em] uppercase">
                        {course.category}
                      </div>

                      {/* Title with premium styling */}
                      <h3 className="text-xl font-black text-gray-900 mb-3 leading-tight bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text">
                        {course.title}
                      </h3>
                      
                      {/* Details - enhanced design */}
                      <div className="mb-6 flex-grow">
                        <div className={course.details.length > 3 ? "grid grid-cols-3 gap-2 mt-6" : "flex flex-col gap-2.5 max-w-sm mx-auto"}>
                          {course.details.map((detail, index) => (
                            <div 
                              key={index} 
                              className={course.details.length > 3 
                                ? "text-center group/item" 
                                : "relative flex items-center gap-3 bg-gradient-to-br from-white to-gray-50/80 rounded-xl p-3 shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100/50 backdrop-blur-sm group/item hover:-translate-y-1"
                              }
                            >
                              {/* Icon with premium effects */}
                              <div className={`${course.badgeColor} text-white ${course.details.length > 3 ? 'w-12 h-12' : 'w-14 h-14 flex-shrink-0'} rounded-xl flex items-center justify-center font-black ${course.details.length > 3 ? 'mx-auto mb-1.5' : ''} shadow-xl text-lg transform group-hover/item:scale-110 group-hover/item:rotate-3 transition-all duration-300 relative overflow-hidden`}>
                                {/* Shine effect */}
                                <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-300" />
                                <span className="relative z-10">{detail.icon}</span>
                              </div>
                              <div className={course.details.length > 3 ? '' : 'flex-1 text-left'}>
                                <div className={`${course.details.length > 3 ? 'text-[10px]' : 'text-xs'} text-gray-400 font-black mb-1 uppercase tracking-wider leading-tight`}>
                                  {detail.label}
                                </div>
                                {detail.text && (
                                  <div className={`${course.details.length > 3 ? 'text-xs' : 'text-sm'} font-bold text-gray-900 leading-tight`}>
                                    {detail.text}
                                  </div>
                                )}
                                {(detail as any).subtext && (
                                  <div className="text-[10px] text-gray-600 mt-0.5 leading-tight">
                                    {(detail as any).subtext}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Premium CTA Button with advanced effects */}
                      <Link href={`/contattaci?oggetto=${encodeURIComponent(course.title)}`}>
                        <button
                          className={`w-full ${course.ctaColor} text-white font-black py-4 px-6 rounded-2xl transition-all duration-500 transform hover:scale-105 hover:shadow-2xl shadow-xl uppercase tracking-wider text-sm relative overflow-hidden group/btn border border-white/20`}
                        >
                          <span className="relative z-10 flex items-center justify-center gap-3">
                            <span>Contattaci Ora</span>
                            <svg className="w-5 h-5 transform group-hover/btn:translate-x-2 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </span>
                          {/* Multiple shine effects */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent transform -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                        </button>
                      </Link>
                    </div>

                    {/* Premium bottom accent with gradient */}
                    <div className={`h-2 bg-gradient-to-r ${course.headerColor} shadow-inner`} />
                  </div>

                  {/* Premium floating glow effect on hover */}
                  <div className={`absolute inset-0 ${course.headerColor} opacity-0 group-hover:opacity-20 blur-3xl rounded-3xl transition-opacity duration-700 -z-10 scale-95 group-hover:scale-105`} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-40">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto bg-gradient-to-r from-red-600 to-red-700 rounded-2xl shadow-2xl p-12 text-center text-white">
            <h3 className="text-3xl font-bold mb-4">Hai bisogno di aiuto?</h3>
            <p className="text-xl text-red-100 mb-8">
              Contattaci per maggiori informazioni sui nostri corsi o per costruire insieme un percorso su misura per te.
            </p>
            <Link
              href="/contattaci"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-red-600 font-bold rounded-xl hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Contattaci
            </Link>
          </div>
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
