import { Fragment, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { ArrowRight, Clock, History, Search, SlidersHorizontal, TrendingUp, X } from 'lucide-react'
import { useApi } from '../api/useApi'
import { readStore, writeStore } from '../context/storage'
import { CERT_TYPES } from '../data/constants'
import { CategoryIcon, CourseCover } from './CourseCard'
import { cx } from './ui'

// ------------------------------------------------------------------ Mémoire locale (ce navigateur uniquement)

const RECENT_KEY = 'aluni-recherches'
const VIEWED_KEY = 'aluni-formations-vues'

const recentSearches = () => readStore(RECENT_KEY, [])
function rememberSearch(q) {
  const term = q.trim()
  if (!term) return
  writeStore(RECENT_KEY, [term, ...recentSearches().filter((t) => fold(t) !== fold(term))].slice(0, 5))
}

/** À appeler à l'ouverture d'une formation : elle apparaît dans « Récemment consultées ». */
export function rememberCourse(slug) {
  if (!slug) return
  writeStore(VIEWED_KEY, [slug, ...readStore(VIEWED_KEY, []).filter((s) => s !== slug)].slice(0, 6))
}

// ------------------------------------------------------------------ Recherche

const fold = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Score d'une formation pour la saisie : titre d'abord, puis domaine, résumé et compétences. */
function score(course, words) {
  const title = fold(course.title)
  const rest = fold([course.categoryName, course.short, course.level, course.trainer?.name].join(' '))
  let total = 0
  for (const w of words) {
    if (title.split(/[^a-z0-9]+/).some((t) => t.startsWith(w))) total += 3
    else if (title.includes(w)) total += 2
    else if (rest.includes(w)) total += 1
    else return 0
  }
  return total
}

// Mots-clés proposés en « Recherches populaires », gardés seulement s'ils correspondent à une formation publiée
const KEYWORDS = ['Word', 'Excel', 'PowerPoint', 'Python', 'HTML', 'Canva', 'Réseaux sociaux', 'Sécurité', 'Informatique', 'Maintenance', 'Site web', 'Design']

const QUICK_FILTERS = [
  { label: 'Niveau débutant', to: '/formations?niveau=Débutant' },
  { label: 'Niveau intermédiaire', to: '/formations?niveau=Intermédiaire' },
  { label: 'Moins de 15 h', to: '/formations?duree=court' },
  { label: '15 à 25 h', to: '/formations?duree=moyen' },
]

/** Met en gras la partie du titre qui correspond à la saisie. */
function Mark({ text, words }) {
  const plain = fold(text)
  const ranges = []
  for (const w of words) {
    const i = plain.indexOf(w)
    if (i >= 0) ranges.push([i, i + w.length])
  }
  if (!ranges.length) return text
  ranges.sort((a, b) => a[0] - b[0])
  const out = []
  let at = 0
  ranges.forEach(([s, e], k) => {
    if (s < at) return
    out.push(<Fragment key={`t${k}`}>{text.slice(at, s)}</Fragment>, <mark key={`m${k}`} className="rounded-sm bg-flame-100 px-0.5 text-inherit">{text.slice(s, e)}</mark>)
    at = e
  })
  out.push(<Fragment key="end">{text.slice(at)}</Fragment>)
  return out
}

function Chip({ to, onClick, children, icon: Icon }) {
  const cls = 'inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-800 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800'
  return to
    ? <Link to={to} className={cls}>{Icon && <Icon className="size-4 text-brand-600" />}{children}</Link>
    : <button type="button" onClick={onClick} className={cls}>{Icon && <Icon className="size-4 text-brand-600" />}{children}</button>
}

function Section({ title, icon: Icon, action, children }) {
  return (
    <section className="px-5 pt-5 last:pb-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-[15px] font-bold text-ink">{Icon && <Icon className="size-4 text-gray-400" />}{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

/** Carte compacte d'une formation dans le panneau. */
function MiniCard({ course }) {
  return (
    <Link to={`/formations/${course.slug}`} className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md">
      <CourseCover course={course} className="aspect-[16/8]" iconSize="size-8" />
      <div className="flex flex-1 flex-col p-3">
        <p className="text-xs font-semibold text-brand-700">{course.categoryName}</p>
        <p className="mt-0.5 line-clamp-2 text-sm leading-snug font-bold text-ink group-hover:text-brand-700">{course.title}</p>
        <p className="mt-auto pt-2 text-xs text-gray-500">{course.certTypes.map((t) => CERT_TYPES[t]?.short).join(' + ')} · {course.hours} h</p>
      </div>
    </Link>
  )
}

/**
 * Barre de recherche du site avec son panneau, comme les grandes plateformes de cours :
 * au clic, recherches récentes, recherches populaires, domaines, filtres rapides et formations récemment consultées ;
 * pendant la saisie, les formations correspondantes s'affichent aussitôt (navigation au clavier possible).
 * @param {boolean} inline panneau sous le champ, dans le flux (menu mobile), au lieu d'une fenêtre flottante
 */
export default function SearchBar({ className, autoFocus, onSubmitted, inline = false }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { data: courses } = useApi('/courses')
  const { data: categories } = useApi('/categories')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [recent, setRecent] = useState(recentSearches)
  const [viewed, setViewed] = useState(() => readStore(VIEWED_KEY, []))
  const box = useRef(null)
  const input = useRef(null)
  const listId = useId()

  const all = useMemo(() => courses ?? [], [courses])
  const words = useMemo(() => fold(q).split(/\s+/).filter((w) => w.length > 0), [q])
  const results = useMemo(() => {
    if (!words.length) return []
    return all.map((c) => [c, score(c, words)]).filter(([, s]) => s > 0)
      .sort((a, b) => b[1] - a[1] || b[0].learners - a[0].learners).slice(0, 6).map(([c]) => c)
  }, [all, words])
  const matchingDomains = useMemo(
    () => (words.length ? (categories ?? []).filter((c) => c.count > 0 && words.every((w) => fold(c.name).includes(w))) : []),
    [categories, words],
  )
  const popular = useMemo(() => KEYWORDS.filter((k) => all.some((c) => score(c, fold(k).split(' ')) > 0)).slice(0, 8), [all])
  const viewedCourses = useMemo(() => viewed.map((s) => all.find((c) => c.slug === s)).filter(Boolean).slice(0, 3), [viewed, all])
  const featured = useMemo(() => [...all].sort((a, b) => b.popular - a.popular || b.learners - a.learners).slice(0, 3), [all])

  // Fermeture : clic à l'extérieur, changement de page
  useEffect(() => {
    if (!open) return
    const close = (e) => box.current && !box.current.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  useEffect(() => { setOpen(false); setActive(-1) }, [pathname])

  // Largeur du panneau flottant : jusqu'à 760 px, sans jamais dépasser le bord droit de l'écran
  const [width, setWidth] = useState(760)
  const openPanel = () => {
    setRecent(recentSearches())
    setViewed(readStore(VIEWED_KEY, []))
    if (!inline && box.current) setWidth(Math.min(760, window.innerWidth - box.current.getBoundingClientRect().left - 16))
    setOpen(true)
  }
  const finish = () => { setOpen(false); setActive(-1); input.current?.blur(); onSubmitted?.() }
  const searchFor = (term) => {
    const t = term.trim()
    rememberSearch(t)
    setQ(t)
    navigate(`/formations${t ? `?q=${encodeURIComponent(t)}` : ''}`)
    finish()
  }
  const goTo = (course) => { rememberSearch(q); navigate(`/formations/${course.slug}`); finish() }

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); input.current?.blur(); return }
    if (!results.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((i) => (i + 1) % results.length) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => (i <= 0 ? results.length - 1 : i - 1)) }
  }
  const clearRecent = () => { writeStore(RECENT_KEY, []); setRecent([]) }

  const panel = (
    <div
      className={cx(
        'overflow-y-auto overscroll-contain bg-white text-left',
        inline ? 'mt-3 rounded-2xl border border-gray-200' : 'animate-fade-in absolute top-full left-0 z-40 mt-2 max-h-[min(78vh,680px)] rounded-2xl shadow-2xl ring-1 ring-black/5',
      )}
      style={inline ? undefined : { width }}
      // Le champ garde le focus quand on clique dans le panneau ; un lien suivi referme le panneau (et le menu mobile)
      onMouseDown={(e) => e.target.closest('a,button') || e.preventDefault()}
      onClick={(e) => e.target.closest('a') && finish()}
    >
      {words.length > 0 ? (
        <>
          {results.length > 0 ? (
            <Section title="Formations" icon={Search}>
              <ul id={listId} role="listbox" aria-label="Formations correspondantes" className="-mx-2">
                {results.map((c, i) => (
                  <li key={c.slug} role="option" aria-selected={i === active}>
                    <button type="button" onClick={() => goTo(c)} onMouseEnter={() => setActive(i)}
                      className={cx('flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition', i === active ? 'bg-brand-50' : 'hover:bg-gray-50')}>
                      <CourseCover course={c} className="h-11 w-16 shrink-0 rounded-lg" iconSize="size-5" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-ink"><Mark text={c.title} words={words} /></span>
                        <span className="block truncate text-sm text-gray-500">{c.categoryName} · {c.level} · {c.hours} h · {c.certTypes.map((t) => CERT_TYPES[t]?.short).join(' + ')}</span>
                      </span>
                      <ArrowRight className={cx('size-4 shrink-0 transition', i === active ? 'text-brand-600' : 'text-gray-300')} />
                    </button>
                  </li>
                ))}
              </ul>
            </Section>
          ) : (
            <Section title={`Aucune formation ne correspond à « ${q.trim()} »`}>
              <p className="text-sm text-gray-600">Vérifiez l'orthographe ou essayez une recherche populaire :</p>
              <div className="mt-3 flex flex-wrap gap-2">{popular.map((k) => <Chip key={k} onClick={() => searchFor(k)}>{k}</Chip>)}</div>
            </Section>
          )}
          {matchingDomains.length > 0 && (
            <Section title="Domaines">
              <div className="flex flex-wrap gap-2">
                {matchingDomains.map((c) => <Chip key={c.id} to={`/formations?categorie=${c.id}`}><CategoryIcon icon={c.icon} className="size-4 text-brand-600" />{c.name}</Chip>)}
              </div>
            </Section>
          )}
          <div className="p-3">
            <button type="button" onClick={() => searchFor(q)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-50 px-4 py-3 text-sm font-bold text-brand-700 transition hover:bg-brand-50">
              <Search className="size-4" />Voir tous les résultats pour « {q.trim()} »
            </button>
          </div>
        </>
      ) : (
        <>
          {recent.length > 0 && (
            <Section title="Recherches récentes" action={<button type="button" onClick={clearRecent} className="text-sm font-semibold text-gray-600 hover:text-brand-700 hover:underline">Tout effacer</button>}>
              <ul className="-mx-2">
                {recent.map((t) => (
                  <li key={t}>
                    <button type="button" onClick={() => searchFor(t)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-[15px] text-gray-800 hover:bg-gray-50">
                      <History className="size-4.5 text-gray-500" />{t}
                    </button>
                  </li>
                ))}
              </ul>
            </Section>
          )}
          {popular.length > 0 && (
            <Section title="Recherches populaires" icon={TrendingUp}>
              <div className="flex flex-wrap gap-2">{popular.map((k) => <Chip key={k} onClick={() => searchFor(k)}>{k}</Chip>)}</div>
            </Section>
          )}
          {(categories ?? []).some((c) => c.count > 0) && (
            <Section title="Explorer par domaine">
              <div className="flex flex-wrap gap-2">
                {categories.filter((c) => c.count > 0).map((c) => (
                  <Chip key={c.id} to={`/formations?categorie=${c.id}`}>
                    <CategoryIcon icon={c.icon} className="size-4 text-brand-600" />{c.name}<span className="text-xs font-medium text-gray-400">{c.count}</span>
                  </Chip>
                ))}
              </div>
            </Section>
          )}
          <Section title="Filtres rapides" icon={SlidersHorizontal}>
            <div className="flex flex-wrap gap-2">{QUICK_FILTERS.map((f) => <Chip key={f.to} to={f.to}>{f.label}</Chip>)}</div>
          </Section>
          {(viewedCourses.length > 0 || featured.length > 0) && (
            <Section title={viewedCourses.length ? 'Récemment consultées' : 'Formations populaires'} icon={viewedCourses.length ? Clock : TrendingUp}
              action={<Link to="/formations" className="text-sm font-semibold text-brand-700 hover:underline">Tout le catalogue</Link>}>
              <div className={cx('grid gap-3', inline ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-3')}>
                {(viewedCourses.length ? viewedCourses : featured).slice(0, inline ? 2 : 3).map((c) => <MiniCard key={c.slug} course={c} />)}
              </div>
            </Section>
          )}
        </>
      )}
    </div>
  )

  return (
    <div ref={box} className={cx('relative', className)}>
      <form onSubmit={(e) => { e.preventDefault(); if (active >= 0 && results[active]) goTo(results[active]); else searchFor(q) }} role="search">
        <input
          ref={input}
          value={q}
          onChange={(e) => { setQ(e.target.value); setActive(-1); setOpen(true) }}
          onFocus={openPanel}
          onClick={openPanel}
          onKeyDown={onKeyDown}
          autoFocus={autoFocus}
          type="text"
          inputMode="search"
          enterKeyHint="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder="Que voulez-vous apprendre ?"
          aria-label="Rechercher une formation"
          className={cx('h-11 w-full rounded-full border border-gray-300 bg-white pr-20 pl-5 text-[15px] placeholder:text-gray-500 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 focus:outline-none [&::-webkit-search-cancel-button]:hidden',
            open && 'border-brand-500 ring-4 ring-brand-100')}
        />
        {q && (
          <button type="button" onClick={() => { setQ(''); setActive(-1); input.current?.focus() }} aria-label="Effacer la recherche"
            className="absolute top-1/2 right-11 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <X className="size-4" />
          </button>
        )}
        <button type="submit" aria-label="Rechercher" className="absolute top-1 right-1 flex size-9 items-center justify-center rounded-full bg-brand-600 text-white hover:bg-brand-700">
          <Search className="size-4" />
        </button>
      </form>
      {open && panel}
    </div>
  )
}
