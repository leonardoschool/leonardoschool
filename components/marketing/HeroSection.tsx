import Link from 'next/link';
import Button from '@/components/ui/Button';
import ScienceCanvasLight from '@/components/ui/ScienceCanvasLight';
import AnimatedStats from '@/components/ui/AnimatedStats';
import { STATS } from '@/lib/constants';

/**
 * Hero section for the homepage
 * Contains the main headline, CTA buttons, and animated background
 */
export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
      {/* Interactive Science Canvas Background */}
      <ScienceCanvasLight />

      {/* Gradient overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80 z-10" />

      <div className="container mx-auto px-4 pt-32 pb-20 relative z-30">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          {/* Main Heading */}
          <div className="space-y-4">
            <h1 
              className="text-6xl font-bold text-white leading-tight font-bahnschrift" 
              style={{ fontSize: 'clamp(3.75rem, 8vw, 6.5rem)' }}
            >
              LEONARDO SCHOOL
            </h1>
            <div className="h-1.5 w-32 bg-gradient-to-r from-red-500 to-red-600 mx-auto rounded-full" />
          </div>

          {/* Subheading */}
          <h2 className="text-2xl md:text-4xl text-white font-light">
            Il tuo successo inizia qui
          </h2>

          {/* Description */}
          <p className="text-lg md:text-xl text-gray-200 max-w-3xxl mx-auto leading-relaxed">
            Preparazione d&apos;eccellenza per l&apos;ammissione ai corsi di laurea ad accesso programmato
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
                Esercitati con noi
              </Button>
            </Link>
          </div>

          {/* Quick Stats */}
          <AnimatedStats stats={STATS} />
        </div>
      </div>

      {/* Scroll Down Arrow */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce z-40">
        <a
          href="#about"
          className="block text-white opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Scorri verso il basso"
        >
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7M19 3l-7 7-7-7"
            />
          </svg>
        </a>
      </div>
    </section>
  );
}

export default HeroSection;
