import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ArrowRight, Award, BookOpen, CalendarClock, CheckCircle2, ClipboardCheck, Compass, PartyPopper, PlayCircle, X } from 'lucide-react'
import { formatDate } from '../../data/constants'
import { useApi } from '../../api/useApi'
import { useAuth } from '../../context/AuthContext'
import { CourseCard, CourseCover } from '../../components/CourseCard'
import { Badge, Button, EmptyState, ErrorState, Loading, ProgressBar, StatCard } from '../../components/ui'

export default function LearnerDashboard() {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const [welcome, setWelcome] = useState(params.get('bienvenue') === '1')
  const enrollmentsState = useApi('/me/enrollments')
  const exams = useApi('/me/exams').data ?? []
  const certificates = useApi('/me/certificates').data ?? []
  const catalog = useApi('/courses').data ?? []

  if (enrollmentsState.loading && !enrollmentsState.data) return <Loading />
  if (enrollmentsState.error) return <ErrorState error={enrollmentsState.error} onRetry={enrollmentsState.reload} />
  const enrollments = enrollmentsState.data ?? []
  const active = enrollments.filter((e) => e.status === 'actif')
  const inProgress = active.filter((e) => e.progress < 100).sort((a, b) => b.progress - a.progress)
  const resume = inProgress[0]
  const lessonsDone = enrollments.reduce((n, e) => n + e.completedLessons, 0)
  const examsTaken = exams.reduce((n, e) => n + e.attempts.filter((a) => a.status === 'soumis').length, 0)
  const upcoming = exams.filter((e) => !e.passed && e.attemptsLeft > 0 && e.exam.open)
  const recommended = catalog.filter((c) => !enrollments.some((e) => e.course.slug === c.slug)).slice(0, 3)

  return (
    <div className="space-y-8">
      {welcome && (
        <div className="relative flex items-start gap-4 rounded-2xl bg-flame-50 p-5 ring-1 ring-flame-200">
          <PartyPopper className="size-7 shrink-0 text-flame-500" />
          <div>
            <p className="font-bold">Bienvenue sur ALuNI, {user.firstName} !</p>
            <p className="text-sm text-gray-700">Votre compte est créé. Choisissez une première formation dans le catalogue pour commencer.</p>
            <Button to="/formations" size="sm" variant="flame" className="mt-3">Explorer les formations</Button>
          </div>
          <button onClick={() => setWelcome(false)} className="absolute top-3 right-3 rounded-lg p-1 text-gray-500 hover:bg-white" aria-label="Fermer"><X className="size-4" /></button>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">Mon apprentissage</h1>
        <p className="mt-1 text-gray-600">Continuez à progresser, chaque leçon compte !</p>
      </div>

      {resume ? (
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-gray-200 md:grid md:grid-cols-[280px_1fr]">
          <CourseCover course={resume.course} className="aspect-[16/8] md:aspect-auto md:h-full" iconSize="size-16" />
          <div className="p-6">
            <p className="text-sm font-bold text-flame-600">REPRENDRE LÀ OÙ VOUS VOUS ÊTES ARRÊTÉ</p>
            <h2 className="mt-1 text-xl font-extrabold">{resume.course.title}</h2>
            {resume.nextLesson && (
              <p className="mt-2 flex items-center gap-2 text-gray-700">
                <PlayCircle className="size-4 shrink-0 text-brand-600" /> Prochaine leçon : <strong>{resume.nextLesson.title}</strong>
              </p>
            )}
            <ProgressBar value={resume.progress} className="mt-4 max-w-md" showLabel />
            <Button to={`/apprendre/${resume.course.slug}${resume.nextLesson ? `/${resume.nextLesson.id}` : ''}`} size="lg" className="mt-5 w-full sm:w-auto">
              Continuer <ArrowRight className="size-5" />
            </Button>
          </div>
        </section>
      ) : (
        <EmptyState icon={Compass} title={active.length ? 'Toutes vos formations sont terminées 🎉' : 'Aucune formation en cours'}
          text="Découvrez le catalogue et inscrivez-vous à une nouvelle formation." action={<Button to="/formations">Explorer le catalogue</Button>} />
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={BookOpen} label="Formations en cours" value={inProgress.length} />
        <StatCard icon={CheckCircle2} label="Leçons terminées" value={lessonsDone} tone="blue" />
        <StatCard icon={ClipboardCheck} label="Examens passés" value={examsTaken} tone="flame" />
        <StatCard icon={Award} label="Certificats obtenus" value={certificates.filter((c) => c.status === 'valide').length} tone="gold" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="card min-w-0 p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">Mes formations</h2>
            <Link to="/apprenant/formations" className="text-sm font-bold text-brand-700 hover:underline">Tout voir</Link>
          </div>
          {enrollments.length ? (
            <ul className="divide-y divide-gray-100">
              {enrollments.map((e) => (
                <li key={e.id}>
                  <Link to={e.status === 'actif' ? `/apprendre/${e.course.slug}` : `/formations/${e.course.slug}`} className="flex items-center gap-4 py-4 hover:opacity-90">
                    <CourseCover course={e.course} className="size-14 shrink-0 rounded-xl" iconSize="size-6" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{e.course.title}</p>
                      {e.status === 'en-attente' ? (
                        <Badge tone="amber" className="mt-1">En attente de validation</Badge>
                      ) : (
                        <div className="mt-1.5 flex items-center gap-3">
                          <ProgressBar value={e.progress} size="sm" className="max-w-48 flex-1" />
                          <span className="text-sm font-semibold text-gray-700">{e.progress}%</span>
                        </div>
                      )}
                    </div>
                    {e.progress === 100 && <CheckCircle2 className="size-5 shrink-0 text-brand-600" />}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-600">Vous n'êtes inscrit à aucune formation pour le moment.</p>
          )}
        </section>

        <div className="min-w-0 space-y-6">
          <section className="card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><CalendarClock className="size-5 text-flame-500" />Examens à venir</h2>
            {upcoming.length ? (
              <div className="space-y-3">
                {upcoming.slice(0, 2).map((x) => (
                  <div key={x.exam.id} className="rounded-xl bg-flame-50 p-4">
                    <p className="font-bold">{x.exam.course.title}</p>
                    <p className="mt-1 text-sm text-gray-700">{x.exam.closesAt ? `Ouvert jusqu'au ${formatDate(x.exam.closesAt)} · ` : ''}{x.exam.durationMin} min</p>
                    <p className="mt-1 text-sm text-gray-700">Tentatives restantes : {x.attemptsLeft} / {x.exam.attemptsAllowed}</p>
                    <Button to="/apprenant/examens" size="sm" variant="flame" className="mt-3">Voir l'examen</Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600">Aucun examen prévu pour le moment.</p>
            )}
          </section>
          <section className="card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><Award className="size-5 text-gold-500" />Mes certificats</h2>
            {certificates.length ? (
              <ul className="space-y-3">
                {certificates.slice(0, 3).map((c) => (
                  <li key={c.code}>
                    <Link to={`/apprenant/certificats/${c.code}`} className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 hover:bg-gray-50">
                      <Award className="size-8 shrink-0 text-gold-500" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold">{c.course.title}</span>
                        <span className="text-xs text-gray-500">{formatDate(c.date)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-600">Terminez une formation pour obtenir votre premier certificat.</p>
            )}
          </section>
        </div>
      </div>

      {recommended.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-bold">Recommandé pour vous</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recommended.map((c) => <CourseCard key={c.slug} course={c} />)}
          </div>
        </section>
      )}
    </div>
  )
}
