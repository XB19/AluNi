import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  Award, BookOpen, Check, ChevronDown, ChevronRight, Clock, FileText, Hourglass, Image, Layers, ListChecks,
  PlayCircle, ShieldCheck, Signal, Star, Users,
} from 'lucide-react'
import { CERT_TYPES, LESSON_TYPES } from '../../data/constants'
import { api, fileUrl } from '../../api/client'
import { useApi } from '../../api/useApi'
import { useAuth } from '../../context/AuthContext'
import { CourseCard, CourseCover } from '../../components/CourseCard'
import { Avatar, Badge, Button, cx, ErrorState, Loading, Toast } from '../../components/ui'
import NotFound from './NotFound'

export const LESSON_ICONS = { video: PlayCircle, texte: FileText, pdf: BookOpen, image: Image }
export const LESSON_LABELS = LESSON_TYPES

function EnrollButton({ course, enrollment, onEnrolled, size = 'lg', className }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  if (user && user.role !== 'apprenant') {
    return <Button size={size} variant="outline-gray" className={className} disabled>Réservé aux apprenants</Button>
  }
  if (enrollment?.status === 'en-attente') {
    return <Button size={size} variant="secondary" className={className} disabled><Hourglass className="size-5" /> Inscription en attente de validation</Button>
  }
  if (enrollment?.status === 'actif') {
    return <Button size={size} className={className} to={`/apprendre/${course.slug}`}>Continuer la formation</Button>
  }
  const onClick = async () => {
    if (!user) return navigate(`/connexion?redirect=/formations/${course.slug}`)
    setBusy(true)
    setError(null)
    try {
      onEnrolled(await api.post(`/courses/${course.slug}/enroll`))
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <span className={cx('inline-flex flex-col', className)}>
      <Button size={size} className="w-full" onClick={onClick} disabled={busy}>
        {busy ? 'Inscription…' : course.access === 'validation' ? "Demander l'inscription" : "S'inscrire gratuitement"}
      </Button>
      {error && <span className="mt-1 text-sm font-medium text-red-600">{error}</span>}
    </span>
  )
}

function Module({ module, index, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-gray-200 last:border-0">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-gray-50">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-sm font-bold text-brand-700">{index + 1}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold">{module.title}</span>
          <span className="text-sm text-gray-500">{module.lessons.length} leçon{module.lessons.length > 1 ? 's' : ''}</span>
        </span>
        <ChevronDown className={cx('size-5 shrink-0 text-gray-500 transition', open && 'rotate-180')} />
      </button>
      {open && (
        <ul className="px-5 pb-4 sm:pl-[72px]">
          {module.lessons.map((l) => {
            const Icon = LESSON_ICONS[l.type] ?? FileText
            return (
              <li key={l.id} className="flex items-center gap-3 py-2 text-[15px] text-gray-700">
                <Icon className="size-4 shrink-0 text-gray-400" />
                <span className="flex-1">{l.title}</span>
                <span className="text-sm text-gray-400">{LESSON_LABELS[l.type]}{l.duration ? ` · ${l.duration}` : ''}</span>
              </li>
            )
          })}
          <li className="flex items-center gap-3 py-2 text-[15px] text-gray-700">
            <ListChecks className="size-4 shrink-0 text-flame-500" />
            <span className="flex-1">Quiz de fin de module</span>
            <span className="text-sm text-gray-400">Non certifiant</span>
          </li>
        </ul>
      )}
    </div>
  )
}

export default function CourseDetail() {
  const { slug } = useParams()
  const { user } = useAuth()
  const state = useApi(`/courses/${slug}`)
  const enrollments = useApi(user?.role === 'apprenant' ? '/me/enrollments' : null)
  const related = useApi('/courses').data ?? []
  const [toast, setToast] = useState('')

  if (state.loading && !state.data) return <Loading className="min-h-[60vh]" />
  if (state.error?.status === 404) return <NotFound />
  if (state.error) return <div className="container-page py-10"><ErrorState error={state.error} onRetry={state.reload} /></div>
  const course = state.data
  if (!course) return null
  const trainer = course.trainerProfile
  const enrollment = (enrollments.data ?? []).find((e) => e.course.slug === slug)
  const onEnrolled = (e) => {
    enrollments.setData((list) => [...(list ?? []).filter((x) => x.course.slug !== slug), e])
    setToast(e.status === 'actif' ? 'Inscription confirmée, bonne formation !' : "Demande envoyée : l'Académie va valider votre inscription.")
  }
  const others = related.filter((c) => c.slug !== slug)
  const suggestions = [...others.filter((c) => c.category === course.category), ...others.filter((c) => c.category !== course.category)].slice(0, 3)

  const sections = [
    { id: 'apropos', label: 'À propos' },
    { id: 'programme', label: 'Programme' },
    { id: 'formateur', label: 'Formateur' },
    { id: 'certification', label: 'Certification' },
  ]

  return (
    <div className="pb-24 lg:pb-0">
      {/* En-tête */}
      <section className="bg-gradient-to-b from-brand-50 to-white">
        <div className="container-page grid gap-8 pt-6 pb-10 lg:grid-cols-[1fr_380px] lg:pt-8">
          <div>
            <nav className="flex flex-wrap items-center gap-1 text-sm text-gray-600" aria-label="Fil d'Ariane">
              <Link to="/" className="hover:underline">Accueil</Link><ChevronRight className="size-3.5" />
              <Link to="/formations" className="hover:underline">Formations</Link><ChevronRight className="size-3.5" />
              <Link to={`/formations?categorie=${course.category}`} className="hover:underline">{course.categoryName}</Link>
            </nav>
            <div className="mt-5 flex flex-wrap gap-2">
              {course.isNew && <Badge tone="flame">Nouveau</Badge>}
              <Badge tone={course.access === 'libre' ? 'green' : 'amber'}>
                {course.access === 'libre' ? 'Inscription libre' : 'Inscription soumise à validation'}
              </Badge>
            </div>
            <h1 className="mt-3 text-3xl leading-tight font-extrabold tracking-tight sm:text-[40px]">{course.title}</h1>
            <p className="mt-3 max-w-2xl text-lg text-gray-700">{course.short}</p>
            <p className="mt-4 flex items-center gap-2 text-[15px]">
              <Avatar name={trainer.name} src={fileUrl(trainer.photo)} size="sm" />
              Formateur : <a href="#formateur" className="font-semibold text-brand-700 underline-offset-2 hover:underline">{trainer.name}</a>
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <EnrollButton course={course} enrollment={enrollment} onEnrolled={onEnrolled} className="hidden sm:inline-flex" />
              <p className="text-sm text-gray-600"><strong className="text-ink">{course.learners}</strong> apprenant{course.learners > 1 ? 's' : ''} inscrit{course.learners > 1 ? 's' : ''}</p>
            </div>
          </div>
          <CourseCover course={course} className="hidden aspect-[4/3] rounded-3xl shadow-lg lg:block" iconSize="size-20" />
        </div>
      </section>

      {/* Bloc d'informations clés */}
      <div className="container-page -mt-4">
        <div className="grid grid-cols-2 divide-gray-200 rounded-2xl border border-gray-200 bg-white shadow-sm sm:grid-cols-3 lg:grid-cols-5 lg:divide-x">
          {[
            { icon: Layers, value: `${course.modules.length} modules`, label: `${course.lessonCount} leçons` },
            { icon: Star, value: course.rating > 0 ? `${course.rating} / 5` : 'Nouveau', label: 'Avis des apprenants' },
            { icon: Signal, value: course.level, label: course.level === 'Débutant' ? 'Aucune expérience requise' : 'Bases conseillées' },
            { icon: Clock, value: `${course.hours} heures`, label: `Environ ${course.weeks} semaine${course.weeks > 1 ? 's' : ''}` },
            { icon: Award, value: course.certTypes.map((t) => CERT_TYPES[t]?.short).join(' + '), label: 'Délivré par ALuNI' },
          ].map((it) => (
            <div key={it.label} className="flex gap-3 p-4 sm:p-5">
              <it.icon className="mt-0.5 size-5 shrink-0 text-brand-600" />
              <div>
                <p className="font-bold">{it.value}</p>
                <p className="text-sm text-gray-500">{it.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation interne */}
      <div className="sticky top-16 z-20 mt-8 border-b border-gray-200 bg-white lg:top-[108px]">
        <div className="container-page no-scrollbar flex gap-6 overflow-x-auto">
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="border-b-2 border-transparent py-3.5 text-[15px] font-semibold whitespace-nowrap text-gray-600 hover:border-brand-600 hover:text-ink">{s.label}</a>
          ))}
        </div>
      </div>

      <div className="container-page grid gap-10 py-10 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-12">
          <section id="apropos" className="scroll-mt-40">
            <h2 className="text-2xl font-extrabold">Ce que vous allez apprendre</h2>
            <ul className="mt-5 grid gap-3 rounded-2xl border border-gray-200 p-5 sm:grid-cols-2">
              {course.objectives.map((o) => (
                <li key={o} className="flex gap-3 text-[15px] text-gray-700"><Check className="mt-0.5 size-5 shrink-0 text-brand-600" />{o}</li>
              ))}
            </ul>
            {course.skills.length > 0 && (
              <>
                <h3 className="mt-8 text-lg font-bold">Compétences acquises</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {course.skills.map((s) => <span key={s} className="rounded-full bg-gray-100 px-3.5 py-1.5 text-sm font-medium text-gray-800">{s}</span>)}
                </div>
              </>
            )}
            <h3 className="mt-8 text-lg font-bold">Description</h3>
            <p className="mt-2 leading-relaxed whitespace-pre-line text-gray-700">{course.description}</p>
            {course.prerequisites.length > 0 && (
              <>
                <h3 className="mt-8 text-lg font-bold">Prérequis</h3>
                <ul className="mt-2 space-y-1.5">
                  {course.prerequisites.map((p) => <li key={p} className="flex gap-2 text-gray-700"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-gray-400" />{p}</li>)}
                </ul>
              </>
            )}
          </section>

          <section id="programme" className="scroll-mt-40">
            <h2 className="text-2xl font-extrabold">Programme de la formation</h2>
            <p className="mt-1 text-gray-600">Les modules se débloquent au fur et à mesure de votre progression.</p>
            <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200">
              {course.modules.map((m, i) => <Module key={m.id} module={m} index={i} defaultOpen={i === 0} />)}
              {course.exam && (
                <div className="flex items-center gap-4 bg-flame-50 px-5 py-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-flame-500 text-white"><ShieldCheck className="size-5" /></span>
                  <div>
                    <p className="font-bold">Examen final</p>
                    <p className="text-sm text-gray-600">{course.exam.questionCount} questions · {course.exam.durationMin} min · réussite à {course.exam.passMark}/100 – ouvre droit au certificat</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section id="formateur" className="scroll-mt-40">
            <h2 className="text-2xl font-extrabold">Votre formateur</h2>
            <div className="mt-5 flex flex-col gap-5 rounded-2xl border border-gray-200 p-6 sm:flex-row">
              <Avatar name={trainer.name} src={fileUrl(trainer.photo)} size="xl" />
              <div>
                <p className="text-lg font-bold">{trainer.name}</p>
                {trainer.title && <p className="text-brand-700">{trainer.title}</p>}
                <p className="mt-2 flex gap-5 text-sm text-gray-600">
                  <span className="flex items-center gap-1.5"><Users className="size-4" />{trainer.learners} apprenants</span>
                  <span className="flex items-center gap-1.5"><BookOpen className="size-4" />{trainer.courses} formation{trainer.courses > 1 ? 's' : ''}</span>
                </p>
                {trainer.bio && <p className="mt-3 leading-relaxed text-gray-700">{trainer.bio}</p>}
              </div>
            </div>
          </section>

          <section id="certification" className="scroll-mt-40">
            <h2 className="text-2xl font-extrabold">Certification</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {course.certTypes.map((t) => (
                <div key={t} className={cx('rounded-2xl p-5', t === 'competence' ? 'bg-brand-50' : 'bg-gold-100')}>
                  <Award className={cx('size-7', t === 'competence' ? 'text-brand-700' : 'text-gold-700')} />
                  <p className="mt-3 font-bold">{CERT_TYPES[t]?.label}</p>
                  <p className="mt-1 text-sm text-gray-700">
                    {t === 'competence' ? `Délivré après réussite de l'examen final${course.exam ? ` (note minimale ${course.exam.passMark}/100)` : ''}.` : 'Délivrée automatiquement quand toutes les leçons sont terminées.'}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-gray-600">Chaque certificat comporte un numéro unique, une signature numérique et un QR code permettant de vérifier son authenticité en ligne.</p>
          </section>
        </div>

        {/* Colonne latérale */}
        <aside className="hidden lg:block">
          <div className="sticky top-44 space-y-4">
            <div className="rounded-2xl border border-gray-200 p-5 shadow-sm">
              <p className="text-sm font-semibold text-gray-500">Prêt à commencer ?</p>
              <p className="mt-1 text-lg font-bold">{course.title}</p>
              <EnrollButton course={course} enrollment={enrollment} onEnrolled={onEnrolled} size="md" className="mt-4 w-full" />
              <ul className="mt-5 space-y-2.5 text-sm text-gray-700">
                <li className="flex gap-2"><Check className="size-4 text-brand-600" />Accès sur ordinateur et téléphone</li>
                <li className="flex gap-2"><Check className="size-4 text-brand-600" />Progression enregistrée automatiquement</li>
                <li className="flex gap-2"><Check className="size-4 text-brand-600" />Quiz d'entraînement à chaque module</li>
                <li className="flex gap-2"><Check className="size-4 text-brand-600" />Certificat vérifiable en ligne</li>
              </ul>
            </div>
          </div>
        </aside>
      </div>

      {suggestions.length > 0 && (
        <section className="bg-gray-50 py-12">
          <div className="container-page">
            <h2 className="mb-6 text-2xl font-extrabold">Vous aimerez aussi</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {suggestions.map((c) => <CourseCard key={c.slug} course={c} />)}
            </div>
          </div>
        </section>
      )}

      {/* Barre d'inscription mobile */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white p-3 pr-20 sm:hidden">
        <EnrollButton course={course} enrollment={enrollment} onEnrolled={onEnrolled} size="md" className="w-full" />
      </div>
      <Toast message={toast} onDone={() => setToast('')} />
    </div>
  )
}
