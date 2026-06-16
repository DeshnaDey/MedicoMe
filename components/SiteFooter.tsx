import Link from 'next/link'

// Shared footer for public/marketing surfaces (login + legal pages). Kept as a
// server component — no hooks, no client state — so it can be dropped anywhere.
export default function SiteFooter() {
  const year = new Date().getFullYear()
  return (
    <footer className="w-full" style={{ borderTop: '1px solid var(--border)' }}>
      <div className="max-w-3xl mx-auto px-5 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-center sm:text-left" style={{ color: 'var(--text-4)' }}>
          © {year} Medico Me · Prototype — not a medical device
        </p>
        <nav className="flex items-center gap-4 text-xs">
          <Link href="/privacy" className="footer-link">Privacy</Link>
          <Link href="/terms" className="footer-link">Terms</Link>
          <Link href="/disclaimer" className="footer-link">Medical Disclaimer</Link>
        </nav>
      </div>
    </footer>
  )
}
