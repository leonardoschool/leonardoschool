'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { NAVIGATION } from '@/lib/constants';
import { cn } from '@/lib/utils';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
      isScrolled 
        ? "bg-gradient-to-b from-red-900/95 to-transparent backdrop-blur-xl" 
        : "bg-gradient-to-b from-red-900/80 to-transparent backdrop-blur-lg"
    )}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 text-sm font-bold group">
            <div className="transition-all duration-300 group-hover:scale-110">
              <Image
                src="/images/logo.png"
                alt="Leonardo School Logo"
                width={46}
                height={43}
                className="object-contain drop-shadow-lg"
              />
            </div>
            <span className="hidden sm:inline text-white font-bold tracking-wide text-shadow-lg">
              LEONARDO SCHOOL
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {NAVIGATION.map((item) => (
                <li
                  key={item.label}
                  className="relative group"
                  onMouseEnter={() => item.submenu && setOpenSubmenu(item.label)}
                  onMouseLeave={() => setOpenSubmenu(null)}
                >
                  {item.submenu ? (
                    <>
                      <button className="px-4 py-2 text-sm font-semibold text-white hover:text-red-400 transition-all duration-300 flex items-center gap-1">
                        {item.label}
                        <svg
                          className={cn(
                            'w-4 h-4 transition-transform duration-300',
                            openSubmenu === item.label && 'rotate-180'
                          )}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>
                      {/* Submenu */}
                      <ul
                        className={cn(
                          'absolute top-full left-0 min-w-[250px] bg-white shadow-2xl rounded-2xl py-3 mt-2 transition-all duration-300 border border-gray-200',
                          openSubmenu === item.label
                            ? 'opacity-100 visible translate-y-0'
                            : 'opacity-0 invisible -translate-y-2'
                        )}
                      >
                        {item.submenu.map((subitem) => (
                          <li key={subitem.label}>
                            <Link
                              href={subitem.href}
                              className="block px-5 py-3 text-sm text-gray-800 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 hover:text-red-600 transition-all duration-200 font-medium rounded-xl mx-2"
                            >
                              {subitem.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <Link
                      href={item.href}
                      className="px-4 py-2 text-sm font-semibold text-white hover:text-red-400 transition-all duration-300"
                    >
                      {item.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 text-white transition-all duration-300"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        <div className={cn(
          'lg:hidden overflow-hidden transition-all duration-300',
          isMobileMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
        )}>
          <nav className="pb-4 bg-gradient-to-br from-red-950/50 via-gray-900/60 to-black/70 backdrop-blur-2xl rounded-b-2xl shadow-2xl border-t border-white/10">
            <ul className="space-y-1 p-3">
              {NAVIGATION.map((item) => (
                <li key={item.label}>
                  {item.submenu ? (
                    <>
                      <button
                        className={cn(
                          "w-full text-left px-4 py-3 text-sm font-semibold rounded-xl flex items-center justify-between transition-all duration-200 backdrop-blur-md border",
                          openSubmenu === item.label
                            ? 'bg-white/15 text-white border-white/20'
                            : 'text-gray-200 hover:bg-white/10 hover:text-white border-transparent'
                        )}
                        onClick={() =>
                          setOpenSubmenu(openSubmenu === item.label ? null : item.label)
                        }
                      >
                        {item.label}
                        <svg
                          className={cn(
                            'w-4 h-4 transition-transform',
                            openSubmenu === item.label && 'rotate-180'
                          )}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>
                      <div className={cn(
                        'overflow-hidden transition-all duration-300',
                        openSubmenu === item.label ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                      )}>
                        <ul className="pl-4 space-y-1 py-2">
                          {item.submenu.map((subitem) => (
                            <li key={subitem.label}>
                              <Link
                                href={subitem.href}
                                className="block px-4 py-2 text-sm text-gray-300 hover:bg-white/15 hover:text-white rounded-xl transition-all backdrop-blur-md border border-transparent hover:border-white/10"
                                onClick={() => setIsMobileMenuOpen(false)}
                              >
                                {subitem.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  ) : (
                    <Link
                      href={item.href}
                      className="block px-4 py-3 text-sm font-semibold text-gray-200 hover:bg-white/15 hover:text-white rounded-xl transition-all backdrop-blur-md border border-transparent hover:border-white/10"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
}
