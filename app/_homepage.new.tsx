/**
 * Homepage component - Refactored
 * 
 * Uses modular sections from components/marketing/ and
 * data from lib/data/ for better separation of concerns
 */

import { 
  HeroSection, 
  TestsSection, 
  MethodSection, 
  WhatsAppButton 
} from '@/components/marketing';
import TestimonialsCarousel from '@/components/ui/TestimonialsCarousel';
import { ADMISSION_TESTS } from '@/lib/data/admissionTests';
import { TESTIMONIALS } from '@/lib/data/testimonials';

export default function Home() {
  return (
    <>
      {/* Hero Section with Interactive Science Animation */}
      <HeroSection />

      {/* Tests/Admission Section */}
      <TestsSection tests={ADMISSION_TESTS} />

      {/* Why Choose Us - Method Section */}
      <MethodSection />

      {/* Testimonials Section */}
      <TestimonialsCarousel testimonials={TESTIMONIALS} />

      {/* WhatsApp Floating Button */}
      <WhatsAppButton />
    </>
  );
}
