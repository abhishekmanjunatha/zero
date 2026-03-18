import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

const geist = Geist({
  variable: '--font-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    template: '%s | Zero',
    default: 'Zero — Dietitian Practice Management',
  },
  description: 'Your complete dietitian practice, simplified.',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.variable} font-sans antialiased bg-background text-foreground`}>
        <TooltipProvider>
          {children}
        </TooltipProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
