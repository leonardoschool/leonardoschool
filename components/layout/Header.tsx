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
  // Use true as initial state since component is always mounted client-side
  const [isMounted] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(globalThis.scrollY > 50);
    };

    globalThis.addEventListener('scroll', handleScroll);
    return () => globalThis.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      <header className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        isScrolled 
          ? "bg-gradient-to-r from-[#a8012b] via-[#8a0125] to-[#a8012b] shadow-2xl backdrop-blur-lg" 
          : "bg-gradient-to-r from-[#a8012b]/95 via-[#8a0125]/95 to-[#a8012b]/95 backdrop-blur-md"
      )}>
        {/* Animated gradient line on top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-400 via-red-300 to-red-400 opacity-60" />
        
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 text-sm font-bold group relative">
              <div className="transition-all duration-500 group-hover:scale-105 relative">
                <Image
                  src="/images/NEW_LOGO_2026/Logo_sito.png"
                  alt="Leonardo School Logo"
                  width={230}
                  height={230}
                  className="object-contain drop-shadow-2xl relative z-10 w-40 h-auto lg:w-48 lg:h-auto"
                />
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:block">
              <ul className="flex items-center gap-2">
                {NAVIGATION.map((item) => (
                  <li
                    key={item.label}
                    className="relative group"
                    onMouseEnter={() => item.submenu && setOpenSubmenu(item.label)}
                    onMouseLeave={() => setOpenSubmenu(null)}
                  >
                    {item.submenu ? (
                      <>
                        <button className="relative px-5 py-3 text-sm uppercase font-bold text-white/90 hover:text-white transition-all duration-300 flex items-center gap-2 rounded-xl hover:bg-white/10 backdrop-blur-sm group/btn overflow-hidden">
                          {/* Shine effect on hover */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
                          <span className="relative z-10">{item.label}</span>
                          <svg
                            className={cn(
                              'w-4 h-4 transition-all duration-300 relative z-10',
                              openSubmenu === item.label && 'rotate-180 text-red-200'
                            )}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2.5}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>
                        {/* Premium Submenu with glassmorphism */}
                        <ul
                          className={cn(
                            'absolute top-full left-0 min-w-[300px] bg-white/95 backdrop-blur-xl shadow-2xl rounded-2xl py-4 mt-3 transition-all duration-500 border border-gray-200/50 overflow-hidden',
                            openSubmenu === item.label
                              ? 'opacity-100 visible translate-y-0'
                              : 'opacity-0 invisible -translate-y-4'
                          )}
                        >
                          {/* Gradient accent on top of submenu */}
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#a8012b] to-red-400" />
                          
                          {item.submenu.map((subitem, index) => (
                            <li key={subitem.label} style={{ animationDelay: `${index * 50}ms` }} className={cn(
                              'animate-fadeIn',
                              openSubmenu === item.label ? 'opacity-100' : 'opacity-0'
                            )}>
                              <Link
                                href={subitem.href}
                                className="group/link block px-6 py-3 text-sm text-gray-700 hover:text-[#a8012b] transition-all duration-300 font-medium relative overflow-hidden"
                              >
                                {/* Hover background effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-red-50 to-red-100 transform scale-x-0 group-hover/link:scale-x-100 transition-transform duration-300 origin-left" />
                                
                                {/* Border indicator */}
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#a8012b] transform scale-y-0 group-hover/link:scale-y-100 transition-transform duration-300" />
                                
                                <span className="relative z-10 flex items-center justify-between">
                                  <span>{subitem.label}</span>
                                  <svg className="w-4 h-4 transform translate-x-0 group-hover/link:translate-x-1 transition-transform opacity-0 group-hover/link:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <Link
                        href={item.href}
                        className="relative px-5 py-3 text-sm uppercase font-bold text-white/90 hover:text-white transition-all duration-300 rounded-xl hover:bg-white/10 backdrop-blur-sm group/btn block overflow-hidden"
                      >
                        {/* Shine effect on hover */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
                        <span className="relative z-10">{item.label}</span>
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>

            {/* Mobile Menu Button - Enhanced */}
            <button
              className="lg:hidden p-3 text-white transition-all duration-300 rounded-xl hover:bg-white/10 backdrop-blur-sm relative group"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {/* Glow effect */}
              <div className="absolute inset-0 bg-white/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <svg
                className="w-7 h-7 relative z-10 transform transition-transform duration-300 group-hover:scale-110"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
              >
                {isMobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu - SUPER SEMPLICE */}
      {isMounted && isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-0 bg-[#a8012b] z-40 overflow-y-auto pt-36">
          <nav className="p-6">
            <ul className="space-y-3">
              {NAVIGATION.map((item) => (
                <li key={item.label}>
                  {item.submenu ? (
                    <div>
                      <button
                        className="w-full text-left px-4 py-3 text-white font-bold bg-white/20 rounded-lg flex items-center justify-between"
                        onClick={() =>
                          setOpenSubmenu(openSubmenu === item.label ? null : item.label)
                        }
                      >
                        {item.label}
                        <svg
                          className={cn(
                            'w-5 h-5 transition-transform',
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
                      {openSubmenu === item.label && (
                        <ul className="mt-2 ml-4 space-y-2">
                          {item.submenu.map((subitem) => (
                            <li key={subitem.label}>
                              <Link
                                href={subitem.href}
                                className="block px-4 py-2 text-white/90 hover:text-white hover:bg-white/10 rounded"
                                onClick={() => {
                                  setIsMobileMenuOpen(false);
                                  setOpenSubmenu(null);
                                }}
                              >
                                {subitem.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <Link
                      href={item.href}
                      className="block px-4 py-3 text-white font-bold bg-white/20 rounded-lg hover:bg-white/30"
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
      )}
    </>
  );
}
