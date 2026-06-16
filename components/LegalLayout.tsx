import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'
import SiteFooter from './SiteFooter'

// Branded shell for the static legal pages (privacy / terms / disclaimer).
// Pages pass their prose as children, wrapped in `.legal-prose`.
export default function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string
  updated: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col page-bg">
      {/* Header */}
      <header className="w-full" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-display text-[20px]" style={{ color: 'var(--text)' }}>
            <Image src="/logo.png" alt="" width={32} height={32} className="w-8 h-8" style={{ imageRendering: 'pixelated' }} />
            Medico Me
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs footer-link"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} />
            Back to app
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-5 py-10 md:py-14">
        <h1 className="font-display text-[30px] md:text-[34px] mb-1.5" style={{ color: 'var(--text)' }}>
          {title}
        </h1>
        <p className="text-xs mb-6" style={{ color: 'var(--text-4)' }}>
          Last updated: {updated}
        </p>

        {/* Honest prototype framing — these are templates, not lawyer-reviewed. */}
        <div
          className="rounded-xl px-4 py-3 mb-8 text-xs"
          style={{ background: 'rgba(229, 162, 58, 0.08)', border: '1px solid rgba(229, 162, 58, 0.3)', color: 'var(--text-2)' }}
        >
          <strong style={{ color: 'var(--text)' }}>Prototype notice.</strong> Medico Me is an
          early-stage demo. This document is a good-faith template describing how the prototype
          handles your data; it has not been reviewed by legal counsel and should not be relied on
          as a finished legal agreement.
        </div>

        <div className="legal-prose">{children}</div>
      </main>

      <SiteFooter />
    </div>
  )
}
