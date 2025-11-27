'use client';

import { useCallback, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Link from 'next/link';
import Button from './Button';

const slides = [
  {
    id: 1,
    title: 'LEONARDO SCHOOL',
    subtitle: 'VI DÀ IL BENVENUTO',
    description: 'Desideri accedere al corso di studi dei tuoi sogni?\nRealizziamolo insieme!',
    cta: { text: 'Didattica', href: '/didattica' },
  },
  {
    id: 2,
    title: 'TESTA LA TUA PREPARAZIONE',
    subtitle: 'CON LA NOSTRA SIMULAZIONE',
    description: 'Medicina-Odontoiatria • Veterinaria • Professioni Sanitarie • Architettura',
    cta: { text: 'Prenota Adesso', href: '/simulazione' },
  },
  {
    id: 3,
    title: 'UNA PREPARAZIONE A TUTTO TONDO!',
    subtitle: '',
    description: 'Scopri quali servizi rendono unica la nostra offerta formativa',
    cta: { text: 'I nostri servizi', href: '#about' },
  },
];

export default function HeroCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;

    const intervalId = setInterval(() => {
      emblaApi.scrollNext();
    }, 6000);

    return () => clearInterval(intervalId);
  }, [emblaApi]);

  return (
    <section className="relative min-h-[600px] md:min-h-[700px] bg-linear-to-br from-gray-900 via-gray-800 to-red-900 pt-20">
      <div className="absolute inset-0 bg-black/30" />
      
      <div className="relative h-full overflow-hidden" ref={emblaRef}>
        <div className="flex h-full">
          {slides.map((slide) => (
            <div
              key={slide.id}
              className="flex-[0_0_100%] min-w-0 flex items-center justify-center px-4"
            >
              <div className="container mx-auto text-center py-24">
                <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
                  <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 md:p-12 shadow-2xl">
                    <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
                      {slide.title}
                    </h1>
                    {slide.subtitle && (
                      <h4 className="text-2xl md:text-3xl font-light text-white mt-4 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
                        {slide.subtitle}
                      </h4>
                    )}
                    <h5 className="text-base md:text-lg text-white font-medium whitespace-pre-line max-w-2xl mx-auto mt-6 drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]">
                      {slide.description}
                    </h5>
                    <div className="pt-8">
                      <Link href={slide.cta.href}>
                        <Button variant="outline" size="lg">
                          {slide.cta.text}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={scrollPrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/30 backdrop-blur-md border border-white/20 rounded-full p-4 transition-all duration-300 hover:scale-110 z-10 shadow-xl"
        aria-label="Previous slide"
      >
        <svg
          className="w-6 h-6 text-white drop-shadow-lg"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>
      <button
        onClick={scrollNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/30 backdrop-blur-md border border-white/20 rounded-full p-4 transition-all duration-300 hover:scale-110 z-10 shadow-xl"
        aria-label="Next slide"
      >
        <svg
          className="w-6 h-6 text-white drop-shadow-lg"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-full p-3 shadow-xl">
          <svg
            className="w-6 h-6 text-white drop-shadow-lg"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </div>
      </div>
    </section>
  );
}
