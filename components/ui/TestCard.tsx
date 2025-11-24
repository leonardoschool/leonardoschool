'use client';

import Image from 'next/image';
import { TestCard as TestCardType } from '@/types';
import { useState } from 'react';

interface TestCardProps {
  test: TestCardType;
  expandable?: boolean;
}

export default function TestCard({ test, expandable = false }: TestCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (expandable) {
    return (
      <div 
        className={`bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl p-6 transition-all duration-300 hover:shadow-2xl hover:bg-white hover:border-red-300 cursor-pointer group flex flex-col ${!isExpanded ? 'h-full' : ''}`}
      >
        <div className="flex items-center justify-center bg-gradient-to-br from-red-50 to-white rounded-2xl w-20 h-20 mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg">
          <Image src={test.image} alt={test.title} width={90} height={40} className="object-contain" />
        </div>
        <h5 className="text-lg font-semibold text-gray-900 mb-3 text-center">
          {test.title}
        </h5>
        <p className="text-gray-600 mb-4 text-center text-sm flex-grow">{test.description}</p>
        
        {isExpanded && test.details && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-gray-700 text-sm mb-4">{test.details}</p>
          </div>
        )}
        
        <div className="pt-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-center w-full text-red-600 hover:text-red-700 font-medium text-sm"
          >
            <svg
              className={`w-4 h-4 mr-2 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z"
                clipRule="evenodd"
              />
            </svg>
            {isExpanded ? 'Riduci' : 'Clicca per info'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl h-full p-6 transition-all duration-300 hover:shadow-2xl hover:bg-white hover:border-red-300 hover:-translate-y-1 cursor-pointer group">
      <div className="flex items-center justify-center bg-gradient-to-br from-red-50 to-white rounded-2xl w-20 h-20 mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg">
        <Image src={test.image} alt={test.title} width={90} height={40} className="object-contain" />
      </div>
      <h5 className="text-lg font-semibold text-gray-900 mb-3 text-center">
        {test.title}
      </h5>
      <p className="text-gray-600 mb-4 text-center text-sm">{test.description}</p>
      <div className="flex items-center justify-center text-red-600 hover:text-red-700 font-medium text-sm group-hover:underline">
        <svg
          className="w-4 h-4 mr-2"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z"
            clipRule="evenodd"
          />
        </svg>
        Informazioni
      </div>
    </div>
  );
}
