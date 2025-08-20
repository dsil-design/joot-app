import type { Metadata, Viewport } from "next";
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Toaster } from "@/components/ui/sonner";
import { GlobalActionWrapper } from "@/components/providers/GlobalActionWrapper";
import { AuthProvider } from "@/components/providers/AuthProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Joot - Transaction Tracker",
  description: "USD/THB Currency Conversion and Transaction Tracking",
};

// Viewport configuration with proper Next.js 15+ type
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} font-geist-sans antialiased`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthProvider>
          <GlobalActionWrapper>
            {children}
          </GlobalActionWrapper>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
