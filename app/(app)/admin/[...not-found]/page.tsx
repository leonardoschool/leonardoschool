'use client';

import Link from 'next/link';
import { colors } from '@/lib/theme/colors';
import { 
  Home, 
  ArrowLeft, 
  Users,
  FileText
} from 'lucide-react';

export default function AdminNotFound() {
  return (
    <div className={`min-h-[80vh] ${colors.background.primary} flex items-center justify-center px-4 py-16`}>
      <div className="max-w-2xl w-full text-center">
        {/* 404 Number */}
        <div className="mb-8">
          <h1 className={`text-[120px] md:text-[150px] font-black leading-none ${colors.primary.text}`}>
            404
          </h1>
          <div className={`h-1 w-24 mx-auto ${colors.primary.bg} rounded-full`}></div>
        </div>

        {/* Message */}
        <div className="mb-10">
          <h2 className={`text-2xl md:text-3xl font-bold ${colors.text.primary} mb-4`}>
            Pagina Non Trovata
          </h2>
          <p className={`text-lg ${colors.text.secondary} max-w-lg mx-auto`}>
            La pagina che stai cercando non esiste nell&apos;area amministrativa.
          </p>
        </div>

        {/* Quick Actions */}
        <div className={`${colors.background.card} rounded-2xl ${colors.effects.shadow.xl} p-6 mb-8`}>
          <h3 className={`font-semibold ${colors.text.primary} mb-4`}>Cosa vuoi fare?</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Go Back */}
            <button
              onClick={() => window.history.back()}
              className={`p-4 rounded-xl ${colors.background.secondary} hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-3`}
            >
              <div className={`w-10 h-10 rounded-lg ${colors.status.info.softBg} flex items-center justify-center`}>
                <ArrowLeft className={`w-5 h-5 ${colors.status.info.text}`} />
              </div>
              <div className="text-left">
                <p className={`font-medium ${colors.text.primary}`}>Torna Indietro</p>
                <p className={`text-sm ${colors.text.muted}`}>Pagina precedente</p>
              </div>
            </button>

            {/* Dashboard */}
            <Link
              href="/admin"
              className={`p-4 rounded-xl ${colors.background.secondary} hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-3`}
            >
              <div className={`w-10 h-10 rounded-lg ${colors.primary.softBg} flex items-center justify-center`}>
                <Home className={`w-5 h-5 ${colors.primary.text}`} />
              </div>
              <div className="text-left">
                <p className={`font-medium ${colors.text.primary}`}>Dashboard Admin</p>
                <p className={`text-sm ${colors.text.muted}`}>Vai alla home</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Additional Links */}
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/admin/utenti"
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${colors.text.secondary} hover:${colors.text.primary} transition-colors`}
          >
            <Users className="w-4 h-4" />
            Gestione Utenti
          </Link>
          <Link
            href="/admin/contratti"
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${colors.text.secondary} hover:${colors.text.primary} transition-colors`}
          >
            <FileText className="w-4 h-4" />
            Template Contratti
          </Link>
        </div>

        {/* Help Link */}
        <div className={`mt-8 pt-8 border-t ${colors.border.primary}`}>
          <p className={`text-sm ${colors.text.muted}`}>
            Hai bisogno di aiuto?{' '}
            <Link href="/contattaci" className={`${colors.primary.text} hover:underline`}>
              Contattaci
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
