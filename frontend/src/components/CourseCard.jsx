import { Link } from 'react-router'
import { Award, Clock, Code, FileText, Network, Palette, Rocket, ShieldCheck, Star, Users } from 'lucide-react'
import { CERT_TYPES } from '../data/constants'
import { fileUrl } from '../api/client'
import logo from '../assets/logo-cdej.jpg'
import { Badge, cx, ProgressBar } from './ui'

export const CATEGORY_ICONS = { FileText, Code, Palette, Network, ShieldCheck, Rocket }
export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS)
export const CATEGORY_COLORS = [
  'from-sky-500 to-blue-700',
  'from-violet-500 to-indigo-700',
  'from-pink-500 to-rose-700',
  'from-teal-500 to-emerald-700',
  'from-amber-500 to-orange-700',
  'from-lime-500 to-green-700',
]

export function CategoryIcon({ icon, className }) {
  const Icon = CATEGORY_ICONS[icon] ?? FileText
  return <Icon className={className} />
}

export function Logo({ compact = false, light = false }) {
  return (
    <span className="flex items-center gap-2.5">
      <img src={logo} alt="Logo CDEJ Lumière de Kpévé" className="size-11 shrink-0 rounded-lg bg-white object-contain p-0.5" />
      <span className="leading-tight">
        <span className={cx('block text-xl font-extrabold tracking-tight', light ? 'text-white' : 'text-brand-700')}>
          ALu<span className="text-flame-500">N</span>I
        </span>
        {!compact && (
          <span className={cx('hidden text-[11px] font-medium sm:block', light ? 'text-brand-100' : 'text-gray-500')}>
            Académie Lumière du Numérique
          </span>
        )}
      </span>
    </span>
  )
}

// Couverture : image de la formation, ou illustration aux couleurs de son domaine
export function CourseCover({ course, className, iconSize = 'size-12' }) {
  const image = fileUrl(course.image)
  return (
    <div className={cx('relative overflow-hidden bg-gradient-to-br', course.categoryColor ?? 'from-brand-500 to-brand-700', className)}>
      {image ? (
        <img src={image} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
      ) : (
        <>
          <div className="absolute -top-8 -right-8 size-32 rounded-full bg-white/10" />
          <div className="absolute -bottom-10 -left-6 size-28 rounded-full bg-black/10" />
          <div className="absolute inset-0 flex items-center justify-center">
            <CategoryIcon icon={course.categoryIcon} className={cx('text-white/90 drop-shadow', iconSize)} />
          </div>
        </>
      )}
    </div>
  )
}

export function CourseCard({ course, progress, to }) {
  return (
    <Link
      to={to ?? `/formations/${course.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:shadow-lg"
    >
      <div className="relative">
        <CourseCover course={course} className="aspect-[16/9]" />
        <div className="absolute top-3 left-3 flex gap-1.5">
          {course.isNew && <Badge tone="flame" className="bg-white">Nouveau</Badge>}
          {course.popular && !course.isNew && <Badge className="bg-white text-ink">Populaire</Badge>}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="flex items-center gap-2 text-xs font-medium text-gray-500">
          <span className="font-semibold text-brand-700">{course.categoryName}</span>
          <span aria-hidden>•</span>
          <span className="truncate">{course.trainer?.name}</span>
        </p>
        <h3 className="mt-1.5 line-clamp-2 text-[17px] leading-snug font-bold text-ink group-hover:text-brand-700">{course.title}</h3>
        {progress == null ? (
          <>
            <p className="mt-1.5 line-clamp-2 text-sm text-gray-600">{course.short}</p>
            <div className="mt-auto pt-4">
              <p className="flex items-center gap-1.5 text-sm text-gray-700">
                {course.rating > 0 && (
                  <>
                    <Star className="size-4 fill-amber-400 text-amber-400" />
                    <span className="font-bold">{course.rating}</span>
                    <span className="text-gray-400">·</span>
                  </>
                )}
                <Users className="size-4 text-gray-400" />
                <span className="text-gray-500">{course.learners} apprenant{course.learners > 1 ? 's' : ''}</span>
              </p>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
                <span>{course.level}</span>
                <span className="flex items-center gap-1"><Clock className="size-3.5" />{course.hours} h</span>
                <span className="flex items-center gap-1"><Award className="size-3.5" />{course.certTypes.map((t) => CERT_TYPES[t]?.short).join(' + ')}</span>
              </p>
            </div>
          </>
        ) : (
          <div className="mt-auto pt-4">
            <ProgressBar value={progress} size="sm" />
            <p className="mt-2 text-sm text-gray-600">
              <span className="font-bold text-ink">{progress}%</span> terminé
            </p>
          </div>
        )}
      </div>
    </Link>
  )
}
