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
      " bg-[#a8012b]"
    )}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 text-sm font-bold group">
            <div className="transition-all duration-300 group-hover:scale-110">
              <Image
                src="/images/NEW_LOGO_2026/Logo_sito.png"
                alt="Leonardo School Logo"
                width={230}
                height={230}
                className="object-contain drop-shadow-lg"
              />
            </div>
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
                      <button className="px-4 py-2 text-sm uppercase font-medium text-white hover:text-base hover:font-bold hover: transition-all duration-300 flex items-center gap-1">
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
                          'absolute top-full left-0 min-w-[280px] bg-white shadow-2xl rounded-2xl py-3 mt-2 transition-all duration-300 border border-gray-200',
                          openSubmenu === item.label
                            ? 'opacity-100 visible translate-y-0'
                            : 'opacity-0 invisible -translate-y-2'
                        )}
                      >
                        {item.submenu.map((subitem) => (
                          <li key={subitem.label}>
                            <Link
                              href={subitem.href}
                              className="block px-5 py-3 text-xs whitespace-nowrap text-gray-800 hover:text-sm hover:font-bold hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 hover:text-red-600 transition-all duration-200 font-normal rounded-xl mx-2"
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
                      className="px-4 py-2 text-sm uppercase font-medium text-white hover:text-base hover:font-bold hover:text-white transition-all duration-300"
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
      </div>

      {/* Mobile Menu */}
      <div className={cn(
        'lg:hidden fixed left-0 right-0 bottom-0 transition-all duration-300 bg-[#a8012b] -mt-1',
        isMobileMenuOpen ? 'top-[70px] opacity-100 visible' : 'top-full opacity-0 invisible pointer-events-none'
      )}>
        <nav className="h-full overflow-y-auto pb-20" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <ul className="p-4 space-y-2">
              {NAVIGATION.map((item) => (
                <li key={item.label}>
                  {item.submenu ? (
                    <div className="rounded-2xl overflow-hidden bg-black/10">
                      <button
                        className={cn(
                          "w-full text-left px-6 py-4 text-base uppercase font-semibold flex items-center justify-between transition-all duration-200",
                          openSubmenu === item.label
                            ? 'text-white'
                            : 'text-white'
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
                        <ul className="border-t border-white/20">
                          {item.submenu.map((subitem) => (
                            <li key={subitem.label}>
                              <Link
                                href={subitem.href}
                                className="block px-8 py-3 text-sm text-white hover:bg-black/10 hover:pl-10 transition-all border-l-4 border-transparent hover:border-white"
                                onClick={() => setIsMobileMenuOpen(false)}
                              >
                                {subitem.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <Link
                      href={item.href}
                      className="block px-6 py-4 text-base uppercase font-semibold text-white bg-black/10 rounded-2xl hover:bg-black/20 transition-all"
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
    </header>
  );
}
