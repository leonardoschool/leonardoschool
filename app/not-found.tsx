'use client';

import Link from 'next/link';
import { Home, Search, BookOpen, Mail, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 py-16">
      <div className="relative z-10 max-w-4xl w-full">
        {/* 404 Number */}
        <div className="text-center mb-8">
          <h1 className="text-[150px] md:text-[200px] font-black leading-none text-red-600 bg-clip-text mb-4">
            404
          </h1>
          <div className="h-1 w-32 mx-auto bg-gradient-to-r from-red-500 to-purple-500 rounded-full"></div>
        </div>

        {/* Message */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Pagina Non Trovata
          </h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Oops! La pagina che stai cercando non esiste o è stata spostata. 
            Non preoccuparti, ti aiutiamo a ritrovare la strada.
          </p>
        </div>

        {/* Quick Links Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Link
            href="/"
            className="group bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:from-red-500/20 hover:to-red-600/20 hover:border-red-500/30 transition-all duration-300"
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Home className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Home</h3>
                <p className="text-sm text-gray-400">Torna alla homepage</p>
              </div>
            </div>
          </Link>

          <Link
            href="/didattica"
            className="group bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:from-blue-500/20 hover:to-blue-600/20 hover:border-blue-500/30 transition-all duration-300"
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Didattica</h3>
                <p className="text-sm text-gray-400">Scopri i corsi</p>
              </div>
            </div>
          </Link>

          <Link
            href="/test"
            className="group bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:from-green-500/20 hover:to-green-600/20 hover:border-green-500/30 transition-all duration-300"
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Search className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Test</h3>
                <p className="text-sm text-gray-400">Simulazioni test</p>
              </div>
            </div>
          </Link>

          <Link
            href="/contattaci"
            className="group bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:from-purple-500/20 hover:to-purple-600/20 hover:border-purple-500/30 transition-all duration-300"
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Contattaci</h3>
                <p className="text-sm text-gray-400">Scrivici</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Back Button */}
        <div className="text-center">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-300 shadow-lg hover:shadow-red-500/25"
          >
            <ArrowLeft className="w-5 h-5" />
            Torna Indietro
          </button>
        </div>

        {/* Help Text */}
        <div className="text-center mt-8">
          <p className="text-gray-400">
            Hai bisogno di aiuto?{' '}
            <Link href="/contattaci" className="text-red-500 hover:text-red-400 transition-colors font-medium">
              Contattaci
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
