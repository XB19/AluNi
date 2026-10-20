import { useEffect, useRef, useState, Suspense } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { BadgeCheck, ChevronDown, LayoutDashboard, Mail, MapPin, Menu, Phone, Search, X } from 'lucide-react'
import { useApi } from '../api/useApi'
import { HOME_BY_ROLE, useAuth } from '../context/AuthContext'
import { useAcademy } from '../context/SettingsContext'
import { CategoryIcon, Logo } from '../components/CourseCard'
import { PageLoader } from '../components/PageLoader'
import { Avatar, Button, cx } from '../components/ui'
import { FacebookIcon, WhatsAppIcon, YoutubeIcon } from '../components/BrandIcons'
import { fileUrl } from '../api/client'

const NAV = [
  { to: '/formations', label: 'Formations' },
  { to: '/a-propos', label: 'À propos' },
  { to: '/actualites', label: 'Actualités' },
  { to: '/verifier', label: 'Vérifier un certificat' },
  { to: '/contact', label: 'Contact' },
]

export function SearchBar({ className, autoFocus, onSubmitted }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const submit = (e) => {
    e.preventDefault()
    navigate(`/formations${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`)
    onSubmitted?.()
  }
  return (
    <form onSubmit={submit} className={cx('relative', className)} role="search">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus={autoFocus}
        type="search"
        placeholder="Que voulez-vous apprendre ?"
        aria-label="Rechercher une formation"
        className="h-11 w-full rounded-full border border-gray-300 bg-white pr-12 pl-5 text-[15px] placeholder:text-gray-500 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 focus:outline-none"
      />
      <button type="submit" aria-label="Rechercher" className="absolute top-1 right-1 flex size-9 items-center justify-center rounded-full bg-brand-600 text-white hover:bg-brand-700">
        <Search className="size-4" />
      </button>
    </form>
  )
}

function ExploreMenu({ categories }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const closeTimer = useRef(null)
  const { pathname } = useLocation()
  const { data: courses } = useApi('/courses')
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      clearTimeout(closeTimer.current)
    }
  }, [])

  // Ouverture au survol de la souris ; petit délai à la fermeture pour laisser le temps d'atteindre le menu
  const show = () => {
    clearTimeout(closeTimer.current)
    setOpen(true)
  }
  const hide = () => {
    clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setOpen(false), 200)
  }

  return (
    <div className="relative" ref={ref} onMouseEnter={show} onMouseLeave={hide}>
      <button
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        aria-expanded={open}
        aria-haspopup="true"
        className={cx('flex h-11 items-center gap-1.5 rounded-lg px-3 text-[15px] font-semibold text-brand-700 hover:bg-brand-50', open && 'bg-brand-50')}
      >
        Explorer <ChevronDown className={cx('size-4 transition', open && 'rotate-180')} />
      </button>
      {open && (
        // Le pt-2 (au lieu d'une marge) évite que le menu se ferme en passant du bouton au menu
        <div className="absolute top-full left-0 z-40 pt-2">
        <div className="grid w-[640px] grid-cols-[1fr_1.1fr] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
          <div className="border-r border-gray-100 p-3">
            <p className="px-3 pt-2 pb-2 text-xs font-bold tracking-wide text-gray-500 uppercase">Domaines</p>
            {categories.map((c) => (
              <Link key={c.id} to={`/formations?categorie=${c.id}`} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-brand-50">
                <span className={cx('flex size-8 items-center justify-center rounded-lg bg-gradient-to-br text-white', c.color)}>
                  <CategoryIcon icon={c.icon} className="size-4" />
                </span>
                <span className="text-sm font-semibold text-gray-800">{c.name}</span>
              </Link>
            ))}
          </div>
          <div className="bg-gray-50 p-3">
            <p className="px-3 pt-2 pb-2 text-xs font-bold tracking-wide text-gray-500 uppercase">Les plus suivies</p>
            {(courses ?? []).slice(0, 4).map((c) => (
              <Link key={c.slug} to={`/formations/${c.slug}`} className="block rounded-lg px-3 py-2.5 hover:bg-white">
                <span className="block text-sm font-semibold text-gray-800">{c.title}</span>
                <span className="text-xs text-gray-500">{c.level} · {c.hours} h</span>
              </Link>
            ))}
            <Link to="/formations" className="mt-1 block px-3 py-2 text-sm font-bold text-brand-700 hover:underline">
              Voir tout le catalogue →
            </Link>
          </div>
        </div>
        </div>
      )}
    </div>
  )
}

function Header({ categories }) {
  const { user } = useAuth()
  const academy = useAcademy()
  const [drawer, setDrawer] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => setDrawer(false), [pathname])

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
      {/* Bandeau supérieur, comme Coursera */}
      <div className="hidden bg-brand-800 text-[13px] text-brand-50 md:block">
        <div className="container-page flex h-9 items-center justify-between">
          <div className="flex items-center gap-5">
            <span className="font-semibold text-white">Pour les apprenants</span>
            <Link to="/inscription?role=formateur" className="hover:text-white">Pour les formateurs</Link>
            <Link to="/a-propos" className="hover:text-white">CDEJ {academy.code}</Link>
          </div>
          <div className="flex items-center gap-5">
            {academy.phone && (
              <a href={`tel:${academy.phone.replace(/\s/g, '')}`} className="flex items-center gap-1.5 hover:text-white"><Phone className="size-3.5" />{academy.phone}</a>
            )}
            <Link to="/faq" className="hover:text-white">Aide / FAQ</Link>
          </div>
        </div>
      </div>

      <div className="container-page flex h-16 items-center gap-3 lg:h-[72px]">
        <Link to="/" aria-label="Accueil ALuNI" className="shrink-0"><Logo /></Link>
        <div className="ml-2 hidden lg:block"><ExploreMenu categories={categories} /></div>
        <SearchBar className="mx-2 hidden max-w-md flex-1 md:block" />
        <nav className="hidden items-center xl:flex" aria-label="Navigation principale">
          {NAV.slice(1, 3).map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => cx('rounded-lg px-3 py-2 text-[15px] font-medium hover:bg-gray-100', isActive ? 'text-brand-700' : 'text-gray-700')}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <Link to={HOME_BY_ROLE[user.role]} className="flex items-center gap-2 rounded-full border border-gray-200 py-1 pr-3 pl-1 hover:bg-gray-50">
              <Avatar name={`${user.firstName} ${user.lastName}`} src={fileUrl(user.photo)} size="sm" />
              <span className="hidden text-sm font-semibold sm:inline">Mon espace</span>
            </Link>
          ) : (
            <>
              <Link to="/connexion" className="hidden rounded-lg px-3 py-2 text-[15px] font-semibold text-brand-700 hover:bg-brand-50 sm:block">Se connecter</Link>
              <Button to="/inscription" size="sm" className="hidden h-10 sm:inline-flex">S'inscrire gratuitement</Button>
            </>
          )}
          <button onClick={() => setDrawer(true)} className="rounded-lg p-2 text-gray-700 hover:bg-gray-100 lg:hidden" aria-label="Ouvrir le menu">
            <Menu className="size-6" />
          </button>
        </div>
      </div>

      {/* Menu mobile */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} />
          <div className="absolute top-0 right-0 flex h-full w-[86%] max-w-sm flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 p-4">
              <Logo compact />
              <button onClick={() => setDrawer(false)} className="rounded-lg p-2 hover:bg-gray-100" aria-label="Fermer le menu"><X className="size-6" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <SearchBar onSubmitted={() => setDrawer(false)} />
              <nav className="mt-4 flex flex-col">
                <NavLink to="/" end className="rounded-lg px-3 py-3 text-base font-semibold hover:bg-gray-50">Accueil</NavLink>
                {NAV.map((n) => (
                  <NavLink key={n.to} to={n.to} className={({ isActive }) => cx('rounded-lg px-3 py-3 text-base font-semibold hover:bg-gray-50', isActive && 'bg-brand-50 text-brand-700')}>
                    {n.label}
                  </NavLink>
                ))}
                <NavLink to="/faq" className="rounded-lg px-3 py-3 text-base font-semibold hover:bg-gray-50">FAQ</NavLink>
              </nav>
              <p className="mt-5 mb-2 px-3 text-xs font-bold tracking-wide text-gray-500 uppercase">Domaines</p>
              {categories.map((c) => (
                <Link key={c.id} to={`/formations?categorie=${c.id}`} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] text-gray-700 hover:bg-gray-50">
                  <CategoryIcon icon={c.icon} className="size-4 text-brand-600" /> {c.name}
                </Link>
              ))}
            </div>
            <div className="grid gap-2 border-t border-gray-100 p-4">
              {user ? (
                <Button to={HOME_BY_ROLE[user.role]}><LayoutDashboard className="size-4" /> Mon espace</Button>
              ) : (
                <>
                  <Button to="/inscription">S'inscrire gratuitement</Button>
                  <Button to="/connexion" variant="outline">Se connecter</Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

function Footer({ categories }) {
  const academy = useAcademy()
  const socials = [
    { Icon: FacebookIcon, label: 'Facebook', href: academy.facebook },
    { Icon: WhatsAppIcon, label: 'WhatsApp', href: academy.whatsapp ? `https://wa.me/${academy.whatsapp}` : '' },
    { Icon: YoutubeIcon, label: 'YouTube', href: academy.youtube },
  ].filter((s) => s.href)
  return (
    <footer className="bg-brand-950 text-brand-100">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <Logo light />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-brand-200">
            {academy.name}. Une initiative du {academy.center} ({academy.code}) pour former les jeunes aux compétences numériques.
          </p>
          <div className="mt-5 flex gap-2">
            {socials.map(({ Icon, label, href }) => (
              <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label} className="flex size-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
                <Icon className="size-4.5" />
              </a>
            ))}
          </div>
        </div>
        <div>
          <h3 className="mb-4 text-sm font-bold text-white">Formations</h3>
          <ul className="space-y-2.5 text-sm">
            {categories.map((c) => (
              <li key={c.id}><Link to={`/formations?categorie=${c.id}`} className="hover:text-white">{c.name}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-4 text-sm font-bold text-white">L'Académie</h3>
          <ul className="space-y-2.5 text-sm">
            <li><Link to="/a-propos" className="hover:text-white">À propos</Link></li>
            <li><Link to="/actualites" className="hover:text-white">Actualités & événements</Link></li>
            <li><Link to="/verifier" className="hover:text-white">Vérifier un certificat</Link></li>
            <li><Link to="/inscription?role=formateur" className="hover:text-white">Devenir formateur</Link></li>
            <li><Link to="/faq" className="hover:text-white">Questions fréquentes</Link></li>
            <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-4 text-sm font-bold text-white">Nous trouver</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-2.5"><MapPin className="mt-0.5 size-4 shrink-0" />{academy.address}</li>
            {academy.phone && <li className="flex gap-2.5"><Phone className="mt-0.5 size-4 shrink-0" />{academy.phone}</li>}
            {academy.email && <li className="flex gap-2.5"><Mail className="mt-0.5 size-4 shrink-0" />{academy.email}</li>}
            {academy.hours && <li className="flex gap-2.5"><BadgeCheck className="mt-0.5 size-4 shrink-0" />{academy.hours}</li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-brand-300 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} ALuNI – CDEJ {academy.code}. Tous droits réservés.</p>
          <p>Formations numériques et certifications vérifiables</p>
        </div>
      </div>
    </footer>
  )
}

export function WhatsAppButton() {
  const academy = useAcademy()
  if (!academy.whatsapp) return null
  return (
    <a
      href={`https://wa.me/${academy.whatsapp}?text=${encodeURIComponent("Bonjour ALuNI, j'ai une question.")}`}
      target="_blank"
      rel="noreferrer"
      aria-label="Nous écrire sur WhatsApp"
      className="fixed right-4 bottom-4 z-30 flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105"
    >
      <WhatsAppIcon className="size-7" />
    </a>
  )
}

export default function PublicLayout() {
  const { data: categories } = useApi('/categories')
  const cats = categories ?? []
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:p-2">Aller au contenu</a>
      <Header categories={cats} />
      <main id="contenu" className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer categories={cats} />
      <WhatsAppButton />
    </div>
  )
}
