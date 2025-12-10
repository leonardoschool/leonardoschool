import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Preloader from "@/components/ui/Preloader";
import CookieBanner from "@/components/ui/CookieBanner";
import { SITE_NAME, SITE_DESCRIPTION, SITE_KEYWORDS } from "@/lib/constants";
import { Analytics } from '@vercel/analytics/next';
import { TRPCProvider } from "@/lib/trpc/Provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} | Preparazione Ammissione Universitaria`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/images/logo.png' },
      { url: '/images/logo.png', sizes: '16x16', type: 'image/png' },
      { url: '/images/logo.png', sizes: '32x32', type: 'image/png' },
    ],
    shortcut: '/images/logo.png',
    apple: '/images/logo.png',
  },
  openGraph: {
    type: "website",
    locale: "it_IT",
    url: "https://www.leonardoschool.it",
    siteName: SITE_NAME,
    title: `${SITE_NAME} - Preparazione Test Ammissione Universitaria`,
    description: SITE_DESCRIPTION,
    images: [{
      url: 'https://leonardoschool.it/images/logo.png',
      width: 1200,
      height: 630,
      alt: 'Leonardo School Catania Logo',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} - Preparazione Ammissione Universitaria`,
    description: SITE_DESCRIPTION,
    images: ['https://leonardoschool.it/images/logo.png'],
  },
  verification: {
    google: 'aa1074040bc69c9c',
  },
  alternates: {
    canonical: 'https://www.leonardoschool.it',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className="h-full">
      <body className={`${inter.variable} font-sans antialiased h-full transition-colors duration-300`} style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }} suppressHydrationWarning>
        <TRPCProvider>
          <Preloader />
          {children}
          <CookieBanner />
          <Analytics />
        </TRPCProvider>
      </body>
    </html>
  );
}
