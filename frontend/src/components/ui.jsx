import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { X } from 'lucide-react'

export const cx = (...c) => c.filter(Boolean).join(' ')

const BTN_VARIANTS = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm',
  flame: 'bg-flame-500 text-white hover:bg-flame-600 shadow-sm',
  secondary: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
  outline: 'border border-brand-600 text-brand-700 hover:bg-brand-50',
  white: 'bg-white text-brand-800 hover:bg-brand-50 shadow-sm',
  ghost: 'text-gray-700 hover:bg-gray-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  'outline-gray': 'border border-gray-300 text-gray-800 hover:bg-gray-50 bg-white',
}
const BTN_SIZES = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-5 text-[15px] gap-2',
  lg: 'h-13 px-7 text-base gap-2.5',
}

export function Button({ to, href, variant = 'primary', size = 'md', className, children, ...props }) {
  const cls = cx(
    'inline-flex items-center justify-center rounded-lg font-semibold whitespace-nowrap transition active:scale-[.98] disabled:pointer-events-none disabled:opacity-50',
    BTN_VARIANTS[variant],
    BTN_SIZES[size],
    className,
  )
  if (to) return <Link to={to} className={cls} {...props}>{children}</Link>
  if (href) return <a href={href} className={cls} {...props}>{children}</a>
  return <button className={cls} {...props}>{children}</button>
}

const BADGE_TONES = {
  gray: 'bg-gray-100 text-gray-700',
  green: 'bg-brand-50 text-brand-700 ring-1 ring-brand-200',
  flame: 'bg-flame-50 text-flame-700 ring-1 ring-flame-200',
  gold: 'bg-gold-100 text-gold-700',
  blue: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  red: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  amber: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
}

export function Badge({ tone = 'gray', className, children }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', BADGE_TONES[tone], className)}>
      {children}
    </span>
  )
}

export function ProgressBar({ value, className, size = 'md', showLabel = false }) {
  return (
    <div className={cx('flex items-center gap-3', className)}>
      <div
        className={cx('w-full overflow-hidden rounded-full bg-gray-200', size === 'sm' ? 'h-1.5' : 'h-2.5')}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full bg-brand-500 transition-all duration-500" style={{ width: `${value}%` }} />
      </div>
      {showLabel && <span className="w-10 shrink-0 text-right text-sm font-bold text-gray-800">{value}%</span>}
    </div>
  )
}

export function Avatar({ name = '', src, size = 'md', className }) {
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
  const sizes = { sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-14 text-lg', xl: 'size-24 text-3xl' }
  return src ? (
    <img src={src} alt={name} className={cx('shrink-0 rounded-full object-cover', sizes[size], className)} />
  ) : (
    <span className={cx('inline-flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-800', sizes[size], className)}>
      {initials}
    </span>
  )
}

export function Field({ label, hint, error, children, className }) {
  return (
    <label className={cx('block', className)}>
      {label && <span className="label">{label}</span>}
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-medium text-red-600">{error}</span>}
    </label>
  )
}

export function SectionTitle({ eyebrow, title, subtitle, action, center = false }) {
  return (
    <div className={cx('mb-8 flex gap-4', center ? 'flex-col items-center text-center' : 'flex-wrap items-end justify-between')}>
      <div className={cx(center && 'max-w-2xl')}>
        {eyebrow && <p className="mb-2 text-sm font-bold tracking-wide text-flame-600 uppercase">{eyebrow}</p>}
        <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{title}</h2>
        {subtitle && <p className="mt-2 text-base text-gray-600">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function StatCard({ icon: Icon, label, value, hint, tone = 'green' }) {
  const tones = {
    green: 'bg-brand-50 text-brand-700',
    flame: 'bg-flame-50 text-flame-600',
    gold: 'bg-gold-100 text-gold-700',
    blue: 'bg-blue-50 text-blue-700',
  }
  return (
    <div className="card flex items-start gap-4 p-5">
      <span className={cx('flex size-11 shrink-0 items-center justify-center rounded-xl', tones[tone])}>
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-gray-600">{label}</p>
        <p className="mt-0.5 text-2xl font-extrabold text-ink">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
      </div>
    </div>
  )
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <Icon className="size-7" />
      </span>
      <h3 className="text-lg font-bold">{title}</h3>
      {text && <p className="mt-1 max-w-md text-gray-600">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={cx('max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl', size === 'lg' ? 'sm:max-w-3xl' : 'sm:max-w-lg')}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100" aria-label="Fermer">
            <X className="size-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="flex justify-end gap-3 border-t border-gray-100 px-5 py-4">{footer}</div>}
      </div>
    </div>
  )
}

export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div className={cx('no-scrollbar flex gap-1 overflow-x-auto border-b border-gray-200', className)} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cx(
            '-mb-px border-b-2 px-4 py-3 text-sm font-semibold whitespace-nowrap transition',
            value === t.value ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-600 hover:text-ink',
          )}
        >
          {t.label}
          {t.count != null && <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{t.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 text-gray-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-3">
      <span>
        <span className="block text-sm font-semibold text-gray-800">{label}</span>
        {description && <span className="block text-xs text-gray-500">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx('relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition', checked ? 'bg-brand-600' : 'bg-gray-300')}
      >
        <span className={cx('absolute top-0.5 size-5 rounded-full bg-white shadow transition', checked ? 'left-5.5' : 'left-0.5')} />
      </button>
    </label>
  )
}

// Petit message de confirmation temporaire
export function Toast({ message, onDone }) {
  const done = useRef(onDone)
  done.current = onDone
  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => done.current(), 3500)
    return () => clearTimeout(t)
  }, [message])
  if (!message) return null
  return (
    <div className="fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-ink px-5 py-3 text-sm font-medium text-white shadow-lg lg:bottom-8" role="status">
      {message}
    </div>
  )
}

export function Spinner({ className }) {
  return <span className={cx('inline-block size-5 animate-spin rounded-full border-2 border-current border-t-transparent', className)} aria-hidden />
}

export function Loading({ label = 'Chargement…', className }) {
  return (
    <div className={cx('flex min-h-48 flex-col items-center justify-center gap-3 text-gray-500', className)} role="status">
      <span className="size-9 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600" />
      <span className="text-sm">{label}</span>
    </div>
  )
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="card flex flex-col items-center px-6 py-10 text-center" role="alert">
      <p className="text-lg font-bold">Oups, le chargement a échoué</p>
      <p className="mt-1 max-w-md text-gray-600">{error?.message ?? 'Une erreur est survenue.'}</p>
      {onRetry && <Button variant="outline" className="mt-5" onClick={onRetry}>Réessayer</Button>}
    </div>
  )
}

/** Affiche le chargement, l'erreur ou le contenu d'une ressource chargée avec useApi. */
export function Async({ state, children, loading }) {
  if (state.loading && !state.data) return loading ?? <Loading />
  if (state.error) return <ErrorState error={state.error} onRetry={state.reload} />
  if (!state.data) return null
  return children(state.data)
}

export function FormError({ error }) {
  if (!error) return null
  return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">{error.message ?? String(error)}</p>
}
