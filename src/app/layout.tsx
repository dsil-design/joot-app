import type { Metadata } from "next";
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import "./globals.css";

export const metadata: Metadata = {
  title: "Joot - USD/THB Transaction Tracker",
  description: "Track and manage transactions with real-time USD to THB currency conversion. Fast, mobile-first expense tracking with automated exchange rates and comprehensive transaction management.",
  keywords: [
    "transaction tracker",
    "USD THB converter",
    "expense tracker",
    "currency conversion",
    "financial tracking",
    "money management"
  ],
  authors: [{ name: "Joot Team" }],
  creator: "Joot",
  publisher: "Joot",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    title: "Joot - USD/THB Transaction Tracker",
    description: "Track expenses with real-time currency conversion between USD and THB. Mobile-first design for on-the-go financial management.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Joot - USD/THB Transaction Tracker",
    description: "Track expenses with real-time currency conversion between USD and THB.",
  },
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
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Joot",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} font-geist-sans text-sm antialiased`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}