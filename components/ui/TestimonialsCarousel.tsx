'use client';

import { useCallback, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Image from 'next/image';
import { Testimonial } from '@/types';

interface TestimonialsCarouselProps {
  testimonials: Testimonial[];
}

export default function TestimonialsCarousel({ testimonials }: TestimonialsCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' });

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
    }, 5000);

    return () => clearInterval(intervalId);
  }, [emblaApi]);

  return (
    <section className="py-16 bg-gradient-to-b from-white via-gray-50 to-white relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            Cosa dicono di noi
          </h1>
        </div>

        <div className="relative">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex">
              {testimonials.map((testimonial) => (
                <div
                  key={testimonial.id}
                  className="flex-[0_0_100%] min-w-0 md:flex-[0_0_50%] lg:flex-[0_0_33.333%] px-4"
                >
                  <div className="bg-white rounded-lg shadow-md p-6 h-full flex flex-col">
                    <div className="flex justify-center mb-4">
                      <Image
                        src={testimonial.image}
                        alt={testimonial.name}
                        width={100}
                        height={100}
                        className="rounded-full object-cover border-4 border-gray-100"
                      />
                    </div>
                    <div className="flex-1 mb-4">
                      <p className="text-gray-600 text-sm italic text-center">
                        &ldquo;{testimonial.text}&rdquo;
                      </p>
                    </div>
                    <div className="text-center">
                      <h5 className="font-semibold text-gray-900">{testimonial.name}</h5>
                      <span className="text-sm text-gray-500 italic">
                        {testimonial.course}, {testimonial.university}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Buttons */}
          <button
            onClick={scrollPrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 bg-white rounded-full p-3 shadow-lg hover:bg-gray-100 transition-colors z-10"
            aria-label="Previous"
          >
            <svg
              className="w-6 h-6 text-gray-800"
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
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 bg-white rounded-full p-3 shadow-lg hover:bg-gray-100 transition-colors z-10"
            aria-label="Next"
          >
            <svg
              className="w-6 h-6 text-gray-800"
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
        </div>
      </div>
    </section>
  );
}
