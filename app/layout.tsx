import type { Metadata } from 'next'
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

export const metadata: Metadata = {
  title: 'Medico Me — Medical Assistant',
  description: 'Your personal AI-powered medical records assistant',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  )
}
