'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  MessageCircle,
  Calendar,
  FolderHeart,
  Settings as SettingsIcon,
} from 'lucide-react'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/chat',      label: 'Chat',      Icon: MessageCircle },
  { href: '/calendar',  label: 'Calendar',  Icon: Calendar },
  { href: '/records',   label: 'Records',   Icon: FolderHeart },
  { href: '/settings',  label: 'Settings',  Icon: SettingsIcon },
]

export default function NavBar() {
  const pathname = usePathname()

  return (
    <>
      {/* Desktop top nav */}
      <nav
        className="hidden md:flex fixed top-0 left-0 right-0 z-50 items-center justify-between px-8 py-3.5"
        style={{
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(14px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <Link href="/dashboard" className="flex items-center gap-2 font-display text-[22px] tracking-tight" style={{ color: 'var(--text)' }}>
          <Image
            src="/logo.png"
            alt=""
            width={36}
            height={36}
            className="w-9 h-9"
            style={{ imageRendering: 'pixelated' }}
            priority
          />
          <span>Medico<span style={{ color: 'var(--teal-500)' }}>Me</span></span>
        </Link>

        <div className="flex items-center gap-1">
          {NAV.map(({ href, label, Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors"
                style={{
                  color: active ? 'var(--teal-600)' : 'var(--text-3)',
                  background: active ? 'var(--teal-50)' : 'transparent',
                }}
              >
                <Icon className="w-4 h-4" strokeWidth={active ? 2.2 : 1.8} />
                {label}
              </Link>
            )
          })}
        </div>

        <span className="text-[11px]" style={{ color: 'var(--text-4)' }}>Prototype · No login</span>
      </nav>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around py-2 z-50"
        style={{
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(14px)',
          borderTop: '1px solid var(--border)',
        }}
      >
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[10px] font-medium"
              style={{ color: active ? 'var(--teal-600)' : 'var(--text-3)' }}
            >
              <Icon className="w-[18px] h-[18px]" strokeWidth={active ? 2.2 : 1.8} />
              {label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
