'use client';

import Image from 'next/image';
import { TestCard as TestCardType } from '@/types';
import { useState } from 'react';
import { sanitizeHtml } from '@/lib/utils/sanitizeHtml';

interface TestCardProps {
  test: TestCardType;
  expandable?: boolean;
}

export default function TestCard({ test, expandable = false }: TestCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (expandable) {
    return (
      <div 
        className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-red-500/10 hover:bg-white hover:border-red-300 cursor-pointer group flex flex-col min-h-[320px] hover:-translate-y-2"
      >
        {test.images && test.images.length > 0 ? (
          <div className="flex items-center justify-center gap-3 mb-4">
            {test.images.map((img, index) => (
              <div key={index} className="flex items-center justify-center bg-gradient-to-br from-red-50 to-white rounded-xl w-16 h-16 group-hover:scale-110 transition-transform shadow-lg">
                <Image src={img} alt={`${test.title} ${index + 1}`} width={50} height={50} className="object-contain" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center bg-gradient-to-br from-red-50 to-white rounded-2xl w-20 h-20 mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg">
            <Image src={test.image!} alt={test.title} width={90} height={40} className="object-contain" />
          </div>
        )}
        <h5 className="text-lg font-semibold text-gray-900 mb-3 text-center">
          {test.title}
        </h5>
        <p className="text-gray-600 mb-4 text-center text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(test.description.replace(' / ', '<br/>')) }}></p>
        
        {isExpanded && (test.details || test.dates || test.documents) && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            {test.details && (
              <p className="text-gray-700 text-sm mb-4">{test.details}</p>
            )}
            {test.dates && test.dates.length > 0 && (
              <div className="mb-4">
                <h6 className="text-sm font-semibold text-gray-900 mb-3">Date utili:</h6>
                <div className="space-y-2">
                  {test.dates.map((dateInfo, index) => (
                    dateInfo.url ? (
                      <a
                        key={index}
                        href={dateInfo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start text-sm group/date"
                      >
                        <svg className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-red-600 group-hover/date:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        <div className="leading-tight">
                          <span className="font-medium text-gray-900 group-hover/date:text-red-600 transition-colors">{dateInfo.label}:</span>
                          <span className="text-gray-700 group-hover/date:text-red-600 transition-colors ml-1">{dateInfo.date}</span>
                        </div>
                      </a>
                    ) : (
                      <div key={index} className="flex items-start text-sm">
                        <svg className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        <div className="leading-tight">
                          <span className="font-medium text-gray-900">{dateInfo.label}:</span>
                          <span className="text-gray-700 ml-1">{dateInfo.date}</span>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}
            {test.documents && test.documents.length > 0 && (
              <div className="space-y-2">
                <h6 className="text-sm font-semibold text-gray-900 mb-3">Documenti utili:</h6>
                {test.documents.map((doc, index) => (
                  <a
                    key={index}
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start text-sm text-gray-700 hover:text-red-600 transition-colors group"
                  >
                    <svg className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                    <span className="leading-tight">{doc.title}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
        
        <div className="pt-4 mt-auto">
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
    <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl h-full p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-red-500/10 hover:bg-white hover:border-red-300 hover:-translate-y-2 cursor-pointer group">
      {test.images && test.images.length > 0 ? (
        <div className="flex items-center justify-center gap-3 mb-4">
          {test.images.map((img, index) => (
            <div key={index} className="flex items-center justify-center bg-gradient-to-br from-red-50 to-white rounded-xl w-16 h-16 group-hover:scale-110 transition-transform shadow-lg">
              <Image src={img} alt={`${test.title} ${index + 1}`} width={50} height={50} className="object-contain" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center bg-gradient-to-br from-red-50 to-white rounded-2xl w-20 h-20 mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg">
          <Image src={test.image!} alt={test.title} width={90} height={40} className="object-contain" />
        </div>
      )}
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
