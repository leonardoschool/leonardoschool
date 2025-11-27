'use client';

import { useEffect, useRef, useState } from 'react';

interface AnimatedStatsProps {
  stats: Array<{
    icon: string;
    value: number;
    suffix: string;
    label: string;
    prefix?: string;
  }>;
}

function AnimatedNumber({ 
  end, 
  duration = 2000, 
  suffix = '', 
  prefix = '' 
}: { 
  end: number; 
  duration?: number; 
  suffix?: string; 
  prefix?: string;
}) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [hasAnimated]);

  useEffect(() => {
    if (!hasAnimated) return;

    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);
      
      // Easing function per un'animazione più fluida
      const easeOutQuart = 1 - Math.pow(1 - percentage, 4);
      const currentCount = Math.floor(end * easeOutQuart);

      setCount(currentCount);

      if (percentage < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [hasAnimated, end, duration]);

  return (
    <div ref={ref} className="text-5xl md:text-6xl font-bold text-red-500 mb-3">
      {prefix}{count}{suffix}
    </div>
  );
}

export default function AnimatedStats({ stats }: AnimatedStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-16">
      {stats.map((stat, index) => (
        <div key={index} className="text-center">
          <AnimatedNumber 
            end={stat.value} 
            suffix={stat.suffix} 
            prefix={stat.prefix || ''}
            duration={2000}
          />
          <div className="text-base md:text-lg text-gray-300 font-light">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}
