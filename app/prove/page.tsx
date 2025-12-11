'use client';
import Image from 'next/image';
import { useState } from 'react';

// Subject categories with their colors and PDFs
const subjects = [
    {
        id: 'chimica',
        name: 'Chimica',
        color: '#E7418B',
        icon: '🧪',
    },
    {
        id: 'fisica',
        name: 'Fisica',
        color: '#42BFED',
        icon: '⚛️',
    },
    {
        id: 'biologia',
        name: 'Biologia',
        color: '#B6B21D',
        icon: '🧬',
    },
];

const appeals = [
    {
        id: '1',
        title: '1° appello',
        description: 'Prima sessione d\'esame',
    },
    {
        id: '2',
        title: '2° appello',
        description: 'Seconda sessione d\'esame',
    },
];

export default function ProvePage() {
    const [selectedAppeal, setSelectedAppeal] = useState<string>('1');

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
            {/* Hero Section */}
            <section className="relative bg-gradient-to-r from-red-600 to-red-700 text-white pt-32 pb-16 overflow-hidden">
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="container mx-auto px-4 relative z-10">
                    <div className="max-w-4xl mx-auto text-center">
                        <h1 className="text-5xl md:text-6xl font-bold mb-6">
                            PROVE UFFICIALI
                        </h1>
                        <p className="text-xl text-red-100 mb-8">
                            Consulta le prove ufficiali per preparati al meglio all'ammissione universitaria
                        </p>
                        <div className="inline-flex items-center gap-2 bg-yellow-400/90 text-gray-900 px-6 py-3 rounded-lg font-semibold">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            Pagina in continuo aggiornamento
                        </div>
                    </div>
                </div>
            </section>

            {/* Main Content */}
            <section className="py-20">
                <div className="container mx-auto px-4">
                    {/* Appeal Tabs */}
                    <div className="mb-10">
                        <Image
                            src="/images/NEW_LOGO_2026/LogoSemestreAperto.png"
                            alt="Semestre Aperto"
                            width={200}
                            height={80}
                            className="mx-auto"
                        />
                    </div>
                    <div className="max-w-4xl mx-auto mb-12">
                        <div className="flex justify-center gap-4">
                            {appeals.map((appeal) => (
                                <button
                                    key={appeal.id}
                                    onClick={() => setSelectedAppeal(appeal.id)}
                                    className={`px-8 py-4 rounded-2xl font-bold transition-all transform hover:scale-105 ${selectedAppeal === appeal.id
                                            ? 'bg-gradient-to-r from-[#4565B0] to-[#4565B0] text-white shadow-xl shadow-gray-600/50'
                                            : 'bg-white/80 text-gray-900 border-2 border-gray-200 hover:border-red-400'
                                        }`}
                                >
                                    <div className="text-xl mb-1">{appeal.title}</div>
                                    <div className="text-sm opacity-80">{appeal.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>



                    {/* Subject Cards */}
                    <div className="max-w-6xl mx-auto">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">
                            Prove d'esame disponibili
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {subjects.map((subject) => {
                                const pdfFileName = `${subject.name} ${selectedAppeal}° – Soluzioni.pdf`;
                                const pdfPath = `/pdf/${pdfFileName}`;

                                return (
                                    <div
                                        key={subject.id}
                                        className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all transform hover:scale-105"
                                    >
                                        {/* Card Header */}
                                        <div
                                            className="h-32 flex items-center justify-center text-white"
                                            style={{ backgroundColor: subject.color }}
                                        >
                                            <div className="text-6xl">{subject.icon}</div>
                                        </div>

                                        {/* Card Content */}
                                        <div className="p-6">
                                            <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">
                                                {subject.name}
                                            </h3>

                                            {/* PDF Link */}
                                            <a
                                                href={pdfPath}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all group border-2 border-gray-200 hover:border-gray-300"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="text-white p-2 rounded-lg group-hover:scale-110 transition-transform"
                                                        style={{ backgroundColor: subject.color }}
                                                    >
                                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-900">
                                                            {selectedAppeal}° appello {selectedAppeal === '1' ? '(20 novembre 2025)' : '(10 dicembre 2025)'}
                                                        </p>
                                                        <p className="text-xs text-gray-500">Soluzioni</p>
                                                    </div>
                                                </div>
                                                <svg
                                                    className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-all"
                                                    style={{ color: subject.color }}
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </a>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
