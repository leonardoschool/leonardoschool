import Link from 'next/link';
import Button from '@/components/ui/Button';
import TestCard from '@/components/ui/TestCard';
import { TestCard as TestCardType } from '@/types';

interface TestsSectionProps {
  tests: TestCardType[];
}

/**
 * Tests/Admissions section for the homepage
 * Displays available admission tests with expandable cards
 */
export function TestsSection({ tests }: TestsSectionProps) {
  return (
    <section 
      id="about" 
      className="py-20 bg-gradient-to-b from-white via-gray-50 to-white relative overflow-hidden"
    >
      {/* Decorative Elements */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-red-100 rounded-full blur-3xl opacity-30 animate-float" />
      <div 
        className="absolute bottom-20 right-10 w-80 h-80 bg-red-50 rounded-full blur-3xl opacity-40 animate-float" 
        style={{ animationDelay: '2s' }} 
      />

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-10">
          <div className="inline-block mb-4">
            <span className="text-sm font-semibold text-red-600 bg-red-50 px-4 py-2 rounded-full uppercase tracking-wider">
              PROVE DI AMMISSIONE
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Quale test vuoi sostenere?
          </h1>
          <div className="w-24 h-1.5 bg-gradient-to-r from-red-500 to-red-600 mx-auto rounded-full" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 mb-16 items-start">
          {tests.map((test) => (
            <TestCard key={test.id} test={test} expandable={true} />
          ))}
        </div>

        <div className="text-center">
          <Link href="/test">
            <Button 
              variant="primary" 
              size="lg" 
              className="shadow-xl shadow-red-600/20 hover:shadow-2xl hover:shadow-red-600/30"
            >
              Scopri di più
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

export default TestsSection;
