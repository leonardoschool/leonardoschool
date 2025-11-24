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
      logo: '/images/NEW_LOGO_2026/LS Starter.png',
      badge: 'BASE',
      badgeColor: 'bg-green-500',
      headerColor: 'bg-gradient-to-br from-green-400 to-green-600',
      category: 'MEDICINA • ODONTOIATRIA • VETERINARIA',
      title: 'Leonardo Starter Class',
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
      ctaColor: 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700',
    },
    {
      id: 'academy',
      logo: '/images/NEW_LOGO_2026/ACADEMY.png',
      badge: 'AVANZATO',
      badgeColor: 'bg-blue-600',
      headerColor: 'bg-gradient-to-br from-blue-400 to-blue-600',
      category: 'MEDICINA • ODONTOIATRIA • VETERINARIA',
      title: 'Leonardo Academy',
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
      ctaColor: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800',
    },
    {
      id: 'intensive',
      logo: '/images/NEW_LOGO_2026/ACADEMY.png',
      badge: 'INTENSIVO',
      badgeColor: 'bg-pink-500',
      headerColor: 'bg-gradient-to-br from-pink-400 to-pink-600',
      category: 'MEDICINA • ODONTOIATRIA • VETERINARIA',
      title: 'Leonardo Academy Intensive',
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
      ctaColor: 'bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700',
    },
  ],
  imat: [
    {
      id: 'imat-standard',
      logo: '/images/NEW_LOGO_2026/IMAT.png',
      badge: 'STANDARD',
      badgeColor: 'bg-blue-700',
      headerColor: 'bg-gradient-to-br from-blue-500 to-blue-700',
      category: 'MEDICINA E ODONTOIATRIA IN INGLESE',
      title: 'IMAT Class',
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
      ctaColor: 'bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900',
    },
  ],
  snt: [
    {
      id: 'snt-class',
      logo: '/images/NEW_LOGO_2026/SNT.png',
      badge: 'AVANZATO',
      badgeColor: 'bg-orange-500',
      headerColor: 'bg-gradient-to-br from-orange-400 to-orange-600',
      category: 'PROFESSIONI SANITARIE',
      title: 'SNT Class',
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
      logo: '/images/NEW_LOGO_2026/arched.png',
      badge: 'AVANZATO',
      badgeColor: 'bg-purple-500',
      headerColor: 'bg-gradient-to-br from-purple-400 to-purple-600',
      category: 'ARCHITETTURA',
      title: 'ArchED Class',
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
      ctaColor: 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700',
    },
  ],
  altro: [
    {
      id: 'altro-class',
      logo: '/images/logo.png',
      badge: '',
      badgeColor: 'bg-gray-600',
      headerColor: 'bg-gradient-to-br from-gray-700 to-gray-900',
      category: 'ALTRI CORSI',
      title: 'Corso Personalizzato',
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
      ctaColor: 'bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-800 hover:to-black',
    },
  ],
};

function DidatticaContent() {
  const searchParams = useSearchParams();
  const corso = searchParams.get('corso') || 'medicina';

  const selectedCourses = coursesData[corso as keyof typeof coursesData] || coursesData.medicina;

  return (
    <div className="min-h-screen pb-16 bg-gray-50">

      {/* Hero Section */}
      <section className="relative py-20 bg-black text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-red-600 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-gray-600 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <h1 className="text-4xl md:text-6xl font-black mb-6">
            {corso === 'medicina' && 'Medicina, Odontoiatria e Veterinaria'}
            {corso === 'imat' && 'IMAT - International Medical Admissions Test'}
            {corso === 'snt' && 'Professioni Sanitarie'}
            {corso === 'arched' && 'Architettura'}
            {corso === 'altro' && 'Corsi Personalizzati'}
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
            Corsi preparatori per l&apos;ammissione alle facoltà mediche
          </p>
          
          {/* Course tabs integrated in hero */}
          <div className="flex flex-wrap justify-center gap-4 mt-12">
            <Link
              href="/didattica?corso=medicina"
              className={`px-8 py-4 rounded-2xl font-bold transition-all transform hover:scale-105 ${
                corso === 'medicina'
                  ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-xl shadow-red-500/50'
                  : 'bg-white/10 backdrop-blur-md text-white border border-white/20 hover:bg-white/20'
              }`}
            >
              Medicina
            </Link>
            <Link
              href="/didattica?corso=imat"
              className={`px-8 py-4 rounded-2xl font-bold transition-all transform hover:scale-105 ${
                corso === 'imat'
                  ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-xl shadow-red-500/50'
                  : 'bg-white/10 backdrop-blur-md text-white border border-white/20 hover:bg-white/20'
              }`}
            >
              IMAT
            </Link>
            <Link
              href="/didattica?corso=snt"
              className={`px-8 py-4 rounded-2xl font-bold transition-all transform hover:scale-105 ${
                corso === 'snt'
                  ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-xl shadow-red-500/50'
                  : 'bg-white/10 backdrop-blur-md text-white border border-white/20 hover:bg-white/20'
              }`}
            >
              Professioni Sanitarie
            </Link>
            <Link
              href="/didattica?corso=arched"
              className={`px-8 py-4 rounded-2xl font-bold transition-all transform hover:scale-105 ${
                corso === 'arched'
                  ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-xl shadow-red-500/50'
                  : 'bg-white/10 backdrop-blur-md text-white border border-white/20 hover:bg-white/20'
              }`}
            >
              Architettura
            </Link>
            <Link
              href="/didattica?corso=altro"
              className={`px-8 py-4 rounded-2xl font-bold transition-all transform hover:scale-105 ${
                corso === 'altro'
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 max-w-7xl mx-auto">
            {selectedCourses.map((course) => (
              <div
                key={course.id}
                className="group relative"
              >
                {/* Main Card */}
                <div className="relative bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 overflow-hidden border-2 border-gray-100 flex flex-col h-full">
                  
                  {/* Top colored section with integrated logo */}
                  <div className={`${course.headerColor} relative px-8 py-12 overflow-hidden flex-shrink-0`}>
                    {/* Decorative elements */}
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/20 rounded-full" />
                    <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-black/10 rounded-full" />
                    
                    <div className="relative z-10">
                      {/* Badge */}
                      <div className="absolute top-0 right-0">
                        <span className={`${course.badgeColor} text-white px-4 py-2 rounded-full text-xs font-black shadow-lg uppercase tracking-widest`}>
                          {course.badge}
                        </span>
                      </div>
                      
                      {/* Logo directly integrated - no background box */}
                      <div className="flex justify-center mt-4">
                        <Image
                          src={course.logo}
                          alt={course.title}
                          width={240}
                          height={90}
                          className="object-contain drop-shadow-2xl transform group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
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
                    <Link href="/contattaci">
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

      {/* CTA Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Non Sei Sicuro del Corso Adatto a Te?
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Prenota un colloquio gratuito e costruiremo insieme il percorso perfetto per te
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
