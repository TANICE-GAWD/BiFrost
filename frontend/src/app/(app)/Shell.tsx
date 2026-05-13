'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { HugeiconsIcon } from '@hugeicons/react'
import { BridgeIcon, DashboardSquare01Icon, Edit01Icon, PieChart01Icon, Logout01Icon, Menu01Icon, Cancel01Icon } from '@hugeicons/core-free-icons'

interface User { name: string; email: string; initials: string }

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: DashboardSquare01Icon },
  { href: '/log',       label: 'Log Hours',  icon: Edit01Icon },
  { href: '/report',    label: 'Report',     icon: PieChart01Icon },
]

export function Shell({ children, user }: { children: React.ReactNode; user: User }) {
  const pathname = usePathname()
  const router   = useRouter()
  const [open, setOpen] = useState(false)

  const signOut = async () => {
    await createClient().auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const close = () => setOpen(false)

  return (
    <div className="shell-wrap">
      {/* Mobile top bar */}
      <header className="shell-topbar">
        <button onClick={() => setOpen(true)} style={{ display: 'flex', background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
          <HugeiconsIcon icon={Menu01Icon} size={22} color="#94a3b8" strokeWidth={1.5} />
        </button>
        <HugeiconsIcon icon={BridgeIcon} size={20} color="#0c8599" strokeWidth={1.5} />
        <span style={{ fontWeight: 800, color: '#fff', fontSize: 15 }}>BiFrost</span>
      </header>

      {/* Backdrop */}
      <div className={`shell-backdrop${open ? ' open' : ''}`} onClick={close} />

      {/* Sidebar */}
      <aside className={`shell-sidebar${open ? ' open' : ''}`}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
          <HugeiconsIcon icon={BridgeIcon} size={24} color="#0c8599" strokeWidth={1.5} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, color: '#fff', fontSize: 15 }}>BiFrost</div>
            <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>CE Hours Tracker</div>
          </div>
          <button onClick={close} className="shell-close-btn" style={{ display: 'flex', background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#94a3b8', flexShrink: 0 }}>
            <HugeiconsIcon icon={Cancel01Icon} size={18} color="#94a3b8" strokeWidth={1.5} />
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(({ href, label, icon }) => {
            const active = pathname === href
            return (
              <Link key={href} href={href} onClick={close} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 8, textDecoration: 'none',
                color: active ? '#fff' : '#94a3b8',
                background: active ? 'rgba(255,255,255,.12)' : 'transparent',
                fontWeight: 500, fontSize: 14, transition: 'background .12s, color .12s',
              }}>
                <HugeiconsIcon icon={icon} size={18} color={active ? '#fff' : '#94a3b8'} strokeWidth={1.5} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', background: '#0c8599',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, flexShrink: 0,
          }}>{user.initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
          </div>
          <button onClick={signOut} title="Sign out" style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 4 }}>
            <HugeiconsIcon icon={Logout01Icon} size={16} color="#94a3b8" strokeWidth={1.5} />
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="shell-main">
        <div style={{ maxWidth: 900 }}>{children}</div>
      </main>
    </div>
  )
}
