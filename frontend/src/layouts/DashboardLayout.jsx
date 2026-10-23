import { useEffect, useRef, useState, Suspense } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import {
  Award, BarChart3, Bell, BookOpen, ClipboardCheck, ClipboardList, Compass, FileCheck, Globe, Home, LayoutDashboard,
  Library, LogOut, Menu, Settings, Tags, User, UserCheck, Users, X,
} from 'lucide-react'
import { PROFILE_LABELS } from '../data/constants'
import { api, fileUrl } from '../api/client'
import { HOME_BY_ROLE, useAuth } from '../context/AuthContext'
import { Logo } from '../components/CourseCard'
import { PageLoader } from '../components/PageLoader'
import { Avatar, cx } from '../components/ui'

const NAVS = {
  apprenant: [
    { to: '/apprenant', label: 'Tableau de bord', icon: LayoutDashboard, end: true, short: 'Accueil', mobile: Home },
    { to: '/apprenant/formations', label: 'Mes formations', icon: BookOpen, short: 'Formations' },
    { to: '/apprenant/examens', label: 'Mes examens', icon: ClipboardCheck, short: 'Examens' },
    { to: '/apprenant/certificats', label: 'Mes certificats', icon: Award, short: 'Certificats' },
    { to: '/apprenant/notifications', label: 'Notifications', icon: Bell, badge: 'unread' },
    { to: '/formations', label: 'Explorer le catalogue', icon: Compass },
    { to: '/apprenant/profil', label: 'Mon profil', icon: User, short: 'Profil' },
  ],
  formateur: [
    { to: '/formateur', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
    { to: '/formateur/formations', label: 'Mes formations', icon: BookOpen },
    { to: '/formateur/questions', label: 'Banque de questions', icon: Library },
    { to: '/formateur/apprenants', label: 'Mes apprenants', icon: Users },
    { to: '/formateur/corrections', label: 'Corrections', icon: FileCheck, badge: 'toGrade' },
    { to: '/formateur/profil', label: 'Mon profil', icon: User },
  ],
  admin: [
    { to: '/admin', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
    { to: '/admin/utilisateurs', label: 'Utilisateurs', icon: Users },
    { to: '/admin/validations', label: 'Validations', icon: UserCheck, badge: 'validations' },
    { to: '/admin/formations', label: 'Formations & catégories', icon: Tags },
    { to: '/admin/certificats', label: 'Certificats', icon: Award },
    { to: '/admin/site', label: 'Site vitrine', icon: Globe },
    { to: '/admin/statistiques', label: 'Statistiques & rapports', icon: BarChart3 },
    { to: '/admin/profil', label: 'Paramètres du compte', icon: Settings },
  ],
}

const SPACE_LABEL = { apprenant: 'Espace apprenant', formateur: 'Espace formateur', admin: 'Administration' }

/** Compteurs affichés dans le menu, actualisés à chaque changement de page. */
function useCounters(role, pathname) {
  const [counters, setCounters] = useState({})
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        if (role === 'apprenant') {
          const { count } = await api.get('/me/notifications/unread-count')
          if (!cancelled) setCounters({ unread: count })
        } else if (role === 'formateur') {
          const subs = await api.get('/trainer/submissions')
          if (!cancelled) setCounters({ toGrade: subs.filter((s) => s.status === 'a-corriger').length })
        } else if (role === 'admin') {
          const v = await api.get('/admin/validations')
          if (!cancelled) setCounters({ validations: v.trainers.length + v.courses.length + v.enrollments.length + v.certificates.length })
        }
      } catch {
        /* compteur indisponible : on n'affiche rien */
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [role, pathname])
  return counters
}

function SideNav({ role, counters, onNavigate }) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Navigation de l'espace">
      {NAVS[role].map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cx('flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold transition', isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-700 hover:bg-gray-100')
          }
        >
          <n.icon className="size-5 shrink-0" />
          <span className="flex-1">{n.label}</span>
          {n.badge && counters[n.badge] > 0 && <span className="rounded-full bg-flame-500 px-2 py-0.5 text-xs font-bold text-white">{counters[n.badge]}</span>}
        </NavLink>
      ))}
    </nav>
  )
}

function UserMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  const name = `${user.firstName} ${user.lastName}`
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2.5 rounded-full p-1 hover:bg-gray-100 sm:pr-3" aria-expanded={open} aria-label="Menu du compte">
        <Avatar name={name} src={fileUrl(user.photo)} size="sm" />
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-sm font-bold">{user.firstName}</span>
          <span className="block text-xs text-gray-500">{PROFILE_LABELS[user.profile] ?? PROFILE_LABELS[user.role]}</span>
        </span>
      </button>
      {open && (
        <div className="absolute top-full right-0 z-40 mt-2 w-60 overflow-hidden rounded-2xl border border-gray-200 bg-white py-2 shadow-xl">
          <div className="border-b border-gray-100 px-4 pb-3">
            <p className="font-bold">{name}</p>
            <p className="truncate text-sm text-gray-500">{user.email || user.phone}</p>
          </div>
          <Link to={`${HOME_BY_ROLE[user.role]}/profil`} onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50"><User className="size-4" />Mon profil</Link>
          <Link to="/" className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50"><Globe className="size-4" />Voir le site</Link>
          <button onClick={() => { logout(); navigate('/') }} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"><LogOut className="size-4" />Se déconnecter</button>
        </div>
      )}
    </div>
  )
}

export function RequireRole({ role, children }) {
  const { user } = useAuth()
  const { pathname } = useLocation()
  if (!user) return <Navigate to={`/connexion?redirect=${encodeURIComponent(pathname)}`} replace />
  if (role && user.role !== role) return <Navigate to={HOME_BY_ROLE[user.role]} replace />
  return children
}

export default function DashboardLayout({ role }) {
  const { user } = useAuth()
  const [drawer, setDrawer] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => setDrawer(false), [pathname])
  const counters = useCounters(user?.role === role ? role : null, pathname)
  const mobileTabs = NAVS.apprenant.filter((n) => n.short)

  return (
    <RequireRole role={role}>
      <div className="min-h-screen bg-gray-50">
        {/* Barre latérale (ordinateur) */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-68 flex-col border-r border-gray-200 bg-white lg:flex">
          <Link to="/" className="flex h-[72px] items-center border-b border-gray-100 px-5"><Logo /></Link>
          <div className="flex-1 overflow-y-auto p-4">
            <p className="mb-3 px-3 text-xs font-bold tracking-wide text-gray-400 uppercase">{SPACE_LABEL[role]}</p>
            <SideNav role={role} counters={counters} />
          </div>
          {role === 'apprenant' && (
            <div className="m-4 rounded-2xl bg-brand-50 p-4">
              <p className="text-sm font-bold text-brand-800">Besoin d'aide ?</p>
              <p className="mt-1 text-xs text-brand-900/70">Posez vos questions à l'équipe de l'Académie.</p>
              <Link to="/contact" className="mt-2 inline-block text-sm font-bold text-brand-700 hover:underline">Nous contacter →</Link>
            </div>
          )}
        </aside>

        {/* Tiroir (mobile) */}
        {drawer && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} />
            <div className="absolute inset-y-0 left-0 flex w-[82%] max-w-xs flex-col bg-white">
              <div className="flex h-16 items-center justify-between border-b border-gray-100 px-4">
                <Logo compact />
                <button onClick={() => setDrawer(false)} className="rounded-lg p-2 hover:bg-gray-100" aria-label="Fermer le menu"><X className="size-5" /></button>
              </div>
              <div className="overflow-y-auto p-4"><SideNav role={role} counters={counters} /></div>
            </div>
          </div>
        )}

        <div className="lg:pl-68">
          <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-gray-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:h-[72px]">
            <button onClick={() => setDrawer(true)} className="rounded-lg p-2 hover:bg-gray-100 lg:hidden" aria-label="Ouvrir le menu"><Menu className="size-6" /></button>
            <p className="font-bold text-gray-800 lg:hidden">{SPACE_LABEL[role]}</p>
            <p className="hidden text-gray-600 lg:block">
              Bonjour <span className="font-bold text-ink">{user?.firstName}</span> 👋
            </p>
            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              {role === 'apprenant' && (
                <Link to="/apprenant/notifications" className="relative rounded-full p-2.5 text-gray-700 hover:bg-gray-100" aria-label={`Notifications (${counters.unread ?? 0} non lues)`}>
                  <Bell className="size-5" />
                  {counters.unread > 0 && <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-flame-500 text-[10px] font-bold text-white">{counters.unread}</span>}
                </Link>
              )}
              {role === 'formateur' && (
                <Link to="/formateur/corrections" className="relative rounded-full p-2.5 text-gray-700 hover:bg-gray-100" aria-label="Corrections en attente">
                  <ClipboardList className="size-5" />
                  {counters.toGrade > 0 && <span className="absolute top-1.5 right-1.5 size-2.5 rounded-full bg-flame-500" />}
                </Link>
              )}
              {user && <UserMenu />}
            </div>
          </header>

          <main className={cx('mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8', role === 'apprenant' && 'pb-28 lg:pb-8')}>
            <Suspense fallback={<PageLoader />}>
              <div key={pathname} className="animate-fade-in">
                <Outlet />
              </div>
            </Suspense>
          </main>
        </div>

        {/* Navigation basse (mobile, apprenant) : accès en un geste aux sections clés */}
        {role === 'apprenant' && (
          <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Navigation rapide">
            {mobileTabs.map((n) => {
              const Icon = n.mobile ?? n.icon
              return (
                <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cx('flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold', isActive ? 'text-brand-700' : 'text-gray-500')}>
                  <Icon className="size-5" />
                  {n.short}
                </NavLink>
              )
            })}
          </nav>
        )}
      </div>
    </RequireRole>
  )
}
