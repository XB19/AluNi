import { useEffect, useRef, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { cx } from './ui'

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Vrai dès que l'élément entre dans l'écran (une seule fois). */
export function useInView(options = { rootMargin: '0px 0px -10% 0px', threshold: 0.12 }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || visible) return
    if (!('IntersectionObserver' in window) || reduceMotion()) {
      setVisible(true)
      return
    }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true)
        io.disconnect()
      }
    }, options)
    io.observe(el)
    return () => io.disconnect()
  }, [visible])
  return [ref, visible]
}

/** Fait apparaître son contenu en douceur quand il arrive à l'écran. delay en millisecondes. */
export function Reveal({ as: Tag = 'div', delay = 0, className, children, ...props }) {
  const [ref, visible] = useInView()
  return (
    <Tag ref={ref} data-visible={visible} className={cx('reveal', className)} style={{ '--delay': `${delay}ms` }} {...props}>
      {children}
    </Tag>
  )
}

/**
 * Compteur animé : « 1 200+ » défile de 0 à 1 200 quand il devient visible.
 * Le texte autour du nombre (espaces, « + », « % ») est conservé.
 */
export function CountUp({ value, duration = 1600 }) {
  const [ref, visible] = useInView()
  const text = String(value ?? '')
  const match = text.match(/\d[\d\s .,]*/)
  const target = match ? Number(match[0].replace(/[\s .,]/g, '')) : null
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (!visible || target == null) return
    if (reduceMotion()) return setCurrent(target)
    let frame
    const start = performance.now()
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration)
      setCurrent(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [visible, target, duration])

  if (target == null) return <span ref={ref}>{text}</span>
  const formatted = current.toLocaleString('fr-FR')
  return (
    <span ref={ref} aria-label={text}>
      {text.slice(0, match.index)}
      {formatted}
      {text.slice(match.index + match[0].trimEnd().length)}
    </span>
  )
}

/** Vrai quand la page a défilé au-delà de `offset` pixels. */
export function useScrolled(offset = 8) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > offset)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [offset])
  return scrolled
}

/** Bouton « retour en haut », visible après un long défilement. */
export function BackToTop() {
  const visible = useScrolled(900)
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' })}
      aria-label="Revenir en haut de la page"
      className={cx(
        'fixed right-5 bottom-22 z-30 flex size-11 items-center justify-center rounded-full bg-white text-brand-700 shadow-lg ring-1 ring-gray-200 transition duration-300 hover:-translate-y-0.5 hover:bg-brand-50',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0',
      )}
    >
      <ArrowUp className="size-5" />
    </button>
  )
}

/** Silhouette d'une carte de formation pendant le chargement. */
export function CourseCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white" aria-hidden>
      <div className="skeleton aspect-[16/9]" />
      <div className="space-y-3 p-4">
        <div className="skeleton h-3 w-1/2 rounded" />
        <div className="skeleton h-4 w-5/6 rounded" />
        <div className="skeleton h-3 w-full rounded" />
        <div className="skeleton h-3 w-2/3 rounded" />
      </div>
    </div>
  )
}

export function CourseGridSkeleton({ count = 6, className = 'grid gap-5 sm:grid-cols-2 xl:grid-cols-3' }) {
  return (
    <div className={className} role="status" aria-label="Chargement des formations">
      {Array.from({ length: count }, (_, i) => <CourseCardSkeleton key={i} />)}
    </div>
  )
}
