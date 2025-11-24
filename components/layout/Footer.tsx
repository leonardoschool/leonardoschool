'use client';

import Link from 'next/link';
import Image from 'next/image';
import { SITE_NAME, SOCIAL_LINKS } from '@/lib/constants';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 items-start">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <Image
                src="/images/NEW_LOGO_2026/LS_monogramma_white.png"
                alt={SITE_NAME}
                width={100}
                height={100}
                className="object-contain"
              />
            </div>
            <p className="text-sm text-gray-400 mb-4 max-w-xs">
              Preparazione per l’ammissione ai corsi di laurea ad accesso programmato.
            </p>
            
            {/* Social Links - Moved here */}
            <div className="flex gap-2">
              <a
                href={SOCIAL_LINKS.facebook}
                className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center hover:bg-red-600 transition-colors"
                aria-label="Facebook"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a
                href={SOCIAL_LINKS.instagram}
                className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center hover:bg-red-600 transition-colors"
                aria-label="Instagram"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              <a
                href="https://www.tiktok.com/@leonardo.school"
                className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center hover:bg-red-600 transition-colors"
                aria-label="TikTok"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
              </a>
              <a
                href={SOCIAL_LINKS.youtube}
                className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center hover:bg-red-600 transition-colors"
                aria-label="YouTube"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
              <a
                href={SOCIAL_LINKS.linkedin}
                className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center hover:bg-red-600 transition-colors"
                aria-label="LinkedIn"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Link Rapidi</h4>
            <ul className="space-y-1.5">
              <li>
                <Link href="/didattica" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Didattica
                </Link>
              </li>
              <li>
                <Link href="/test" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Test
                </Link>
              </li>
              <li>
                <Link href="/chi-siamo" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Chi Siamo
                </Link>
              </li>
            </ul>
          </div>

          {/* Courses */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Corsi</h4>
            <ul className="space-y-1.5">
              <li>
                <Link href="/didattica?corso=medicina" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Medicina e Odontoiatria
                </Link>
              </li>
              <li>
                <Link href="/didattica?corso=imat" className="text-sm text-gray-400 hover:text-white transition-colors">
                  IMAT
                </Link>
              </li>
              <li>
                <Link href="/didattica?corso=snt" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Professioni Sanitarie
                </Link>
              </li>
              <li>
                <Link href="/didattica?corso=veterinaria" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Veterinaria
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Login */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Contatti</h4>
            <ul className="space-y-2 mb-4">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm text-gray-400">Catania, Italia</span>
              </li>
              <li>
                <Link href="/contattaci" className="text-sm text-gray-400 hover:text-white transition-colors inline-flex items-center gap-2">
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Contattaci
                </Link>
              </li>
            </ul>
            
            <a
              href="https://leonardo-school.web.app/#/login"
              className="inline-block bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-6 py-2 rounded-lg transition-colors"
            >
              Login
            </a>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-6 pt-4 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
          <p className="text-gray-400">
            © {currentYear} {SITE_NAME}. Tutti i diritti riservati.
          </p>
          <div className="flex gap-4">
            <Link href="/privacy-policy.pdf" className="text-gray-400 hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/privacy-policy.pdf" className="text-gray-400 hover:text-white transition-colors">
              Termini e Condizioni
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
