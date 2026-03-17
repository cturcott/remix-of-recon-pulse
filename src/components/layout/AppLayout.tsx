import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Car, Flag, ClipboardCheck, BarChart2, Settings, ChevronDown, LogOut, User, Shield } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useDealership } from '@/contexts/DealershipContext'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { label: 'Overview', href: '/command-center', icon: LayoutDashboard },
  { label: 'Vehicles', href: '/vehicles', icon: Car },
  { label: 'Tasks', href: '/my-tasks', icon: Flag },
  { label: 'Approvals', href: '/approvals', icon: ClipboardCheck },
]
const REPORTS_ITEMS = [
  { label: 'Reports Dashboard', href: '/reports' },
  { label: 'Recon Aging', href: '/reports/aging' },
  { label: 'Stage Bottleneck', href: '/reports/bottleneck' },
  { label: 'WIP Queue', href: '/reports/wip' },
  { label: 'Time to FLR', href: '/reports/flr' },
  { label: 'Exceptions', href: '/reports/exceptions' },
]
const MANAGE_ITEMS = [
  { label: 'CSV Import', href: '/import/settings' },
  { label: 'Import History', href: '/import/history' },
  { label: 'Workflow Stages', href: '/settings/workflow' },
  { label: 'Notifications', href: '/settings/notifications' },
  { label: 'Team', href: '/team' },
  { label: 'Settings', href: '/settings' },
]

function Dropdown({ label, icon: Icon, items, isActive }: { label: string; icon: React.ElementType; items: { label: string; href: string }[]; isActive: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const location = useLocation()
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div ref={ref} className="relative h-14 flex items-center">
      <button onClick={() => setOpen(v => !v)} className={cn('flex items-center gap-1.5 px-3 h-14 text-sm font-medium border-b-2 transition-colors', isActive ? 'text-teal-600 border-teal-500' : 'text-gray-600 border-transparent hover:text-gray-900')}>
        <Icon size={15} />{label}<ChevronDown size={13} className={cn('transition-transform duration-200', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute top-full left-0 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[200px] z-50">
          {items.map(item => (
            <Link key={item.href} to={item.href} onClick={() => setOpen(false)} className={cn('flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors', location.pathname === item.href && 'text-teal-600 font-medium bg-teal-50')}>
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, isPlatformAdmin, signOut } = useAuth()
  const { dealership } = useDealership()
  const location = useLocation()
  const navigate = useNavigate()
  const [userOpen, setUserOpen] = useState(false)
  const userRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!userRef.current?.contains(e.target as Node)) setUserOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const isActive = (href: string) => location.pathname === href || location.pathname.startsWith(href + '/')
  const initials = profile?.avatar_initials || profile?.full_name?.slice(0, 2).toUpperCase() || 'U'
  async function handleSignOut() { await signOut(); navigate('/auth') }
  return (
    <div className="min-h-screen bg-[#f8f7f6] flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center h-14 px-4 gap-2">
          <Link to="/command-center" className="flex items-center gap-2 mr-2 shrink-0">
            <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center shadow-sm"><Car size={16} className="text-white" /></div>
            <span className="font-bold text-gray-900 text-base hidden sm:block"><span className="text-teal-500">Recon</span>Pulse</span>
          </Link>
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-50 mr-3">
            <Car size={13} className="text-gray-400" />
            <span>{dealership?.name || 'ABC Motors'}</span>
            <span className="text-gray-400 text-xs">({dealership?.code || 'ABCM'})</span>
          </div>
          <nav className="flex items-center h-14 gap-0.5">
            {NAV_ITEMS.map(({ label, href, icon: Icon }) => (
              <Link key={href} to={href} className={cn('flex items-center gap-1.5 px-3 h-14 text-sm font-medium border-b-2 transition-colors whitespace-nowrap', isActive(href) ? 'text-teal-600 border-teal-500' : 'text-gray-600 border-transparent hover:text-gray-900')}>
                <Icon size={15} />{label}
              </Link>
            ))}
            <Dropdown label="Reports" icon={BarChart2} items={REPORTS_ITEMS} isActive={isActive('/reports')} />
            <Dropdown label="Manage" icon={Settings} items={MANAGE_ITEMS} isActive={isActive('/settings') || isActive('/import') || isActive('/team')} />
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {isPlatformAdmin && <Link to="/settings" className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"><Shield size={14} className="text-gray-400" />Admin</Link>}
            <div ref={userRef} className="relative">
              <button onClick={() => setUserOpen(v => !v)} className="flex items-center gap-2 hover:bg-gray-50 rounded-lg px-2 py-1.5 transition-colors">
                <div className="w-7 h-7 bg-teal-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">{initials}</div>
                <span className="text-sm font-medium text-gray-700 hidden sm:block">{profile?.full_name?.split(' ')[0] || 'User'}</span>
                <ChevronDown size={13} className="text-gray-400 hidden sm:block" />
              </button>
              {userOpen && (
                <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[180px] z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{profile?.full_name || 'User'}</p>
                    <p className="text-xs text-gray-400">{profile?.email}</p>
                  </div>
                  <Link to="/settings" onClick={() => setUserOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"><User size={14} /> Profile & Settings</Link>
                  <hr className="my-1 border-gray-100" />
                  <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"><LogOut size={14} /> Sign Out</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}