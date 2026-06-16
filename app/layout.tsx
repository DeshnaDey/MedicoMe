import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

// Inter stands in for Hadley (which is a paid foundry font). Same geometric,
// minimal feel; ships free from Google Fonts. If you license Hadley, swap the
// --font-sans variable in globals.css and the import here.
const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
})

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://medico-me.vercel.app'
const DESCRIPTION =
  'Medico Me is your personal health companion: keep your medical records in one place, ' +
  'track appointments, and run a quick AI-assisted symptom check. Not a substitute for professional care.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Medico Me — Your personal medical assistant',
    template: '%s · Medico Me',
  },
  description: DESCRIPTION,
  applicationName: 'Medico Me',
  keywords: ['medical records', 'health assistant', 'symptom checker', 'personal health', 'triage'],
  authors: [{ name: 'Medico Me' }],
  openGraph: {
    type: 'website',
    siteName: 'Medico Me',
    title: 'Medico Me — Your personal medical assistant',
    description: DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: 'summary',
    title: 'Medico Me — Your personal medical assistant',
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: '#3FA29C',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  )
}
