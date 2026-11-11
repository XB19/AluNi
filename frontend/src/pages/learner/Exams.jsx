import { Link } from 'react-router'
import { CalendarDays, CheckCircle2, ClipboardCheck, Clock, Globe, Lock, MonitorSmartphone, RotateCcw, Target, XCircle } from 'lucide-react'
import { LEARNING_MODES, formatDate, formatSession } from '../../data/constants'
import { useApi } from '../../api/useApi'
import { Async, Badge, Button, cx, EmptyState, PageHeader, ProgressBar } from '../../components/ui'

/** Badge de modalité : en salle (session programmée, une tentative) ou en ligne (tentatives illimitées). */
export function ModeBadge({ mode }) {
  const m = LEARNING_MODES[mode]
  if (!m) return null
  const Icon = mode === 'salle' ? MonitorSmartphone : Globe
  return <Badge tone={m.tone}><Icon className="size-3.5" />{m.label}</Badge>
}

function ExamCard({ item }) {
  const { exam, mode, attempts, attemptsLeft, passed, inProgressAttemptId, progress, certificateCode, currentSession, nextSession, canStart, blockedReason } = item
  const room = mode === 'salle'
  const submitted = attempts.filter((a) => a.status === 'soumis')
  const best = submitted.length ? Math.max(...submitted.map((a) => a.score)) : null
  const usedUp = room && attemptsLeft === 0 && !passed && !inProgressAttemptId
  const waitingLessons = !room && !passed && !inProgressAttemptId && progress < 100
  return (
    <div className="space-y-4">
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 p-5 sm:p-6">
          <div>
            <div className="flex flex-wrap gap-2">
              {passed ? <Badge tone="green"><CheckCircle2 className="size-3.5" />Réussi</Badge>
                : usedUp ? <Badge tone="flame"><XCircle className="size-3.5" />Non validé</Badge>
                : canStart ? <Badge tone="flame">Ouvert</Badge>
                : <Badge><Lock className="size-3.5" />Pas encore ouvert</Badge>}
              <Badge>Examen final</Badge>
              <ModeBadge mode={mode} />
            </div>
            <h2 className="mt-2 text-xl font-bold">{exam.title}</h2>
            <Link to={`/apprendre/${exam.course.slug}`} className="mt-1 inline-block text-sm text-gray-600 hover:text-brand-700">{exam.course.title}</Link>
          </div>
          {passed ? (
            <Button to={certificateCode ? `/apprenant/certificats/${certificateCode}` : '/apprenant/certificats'} variant="secondary">Voir mon certificat</Button>
          ) : inProgressAttemptId ? (
            <Button to={`/examen/${exam.id}`} variant="flame" size="lg">Reprendre l'examen</Button>
          ) : canStart ? (
            <Button to={`/examen/${exam.id}`} variant="flame" size="lg">{submitted.length ? "Repasser l'examen" : "Commencer l'examen"}</Button>
          ) : waitingLessons ? (
            <Button to={`/apprendre/${exam.course.slug}`} variant="secondary">Terminer la formation ({progress} %)</Button>
          ) : (
            <Button disabled variant="outline-gray"><Lock className="size-4" />{usedUp ? 'Tentative utilisée' : 'Pas encore ouvert'}</Button>
          )}
        </div>
        <dl className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4 sm:p-6">
          {[
            [Clock, 'Durée', `${exam.durationMin} minutes`],
            [Target, 'Note de réussite', `${exam.passMark} / 100`],
            [RotateCcw, 'Tentatives', room ? (attemptsLeft > 0 ? 'Une seule' : 'Utilisée') : 'Illimitées'],
            room
              ? [CalendarDays, 'Session', currentSession ? 'En cours' : nextSession ? formatDate(nextSession.startsAt) : 'À programmer']
              : [CalendarDays, 'Disponibilité', 'À tout moment'],
          ].map(([Icon, k, v]) => (
            <div key={k} className="flex gap-3">
              <Icon className="mt-0.5 size-5 shrink-0 text-gray-400" />
              <div>
                <dt className="text-sm text-gray-500">{k}</dt>
                <dd className="font-bold">{v}</dd>
              </div>
            </div>
          ))}
        </dl>
        {!passed && !inProgressAttemptId && (
          <div className={cx('border-t px-5 py-4 sm:px-6', canStart ? 'border-gray-100 bg-white' : usedUp ? 'border-red-100 bg-red-50' : 'border-amber-100 bg-amber-50')}>
            {room && currentSession && canStart && (
              <p className="text-sm font-semibold text-brand-800">Session en cours : {formatSession(currentSession)}. Vous pouvez composer maintenant.</p>
            )}
            {!canStart && blockedReason && (
              <p className={cx('flex items-start gap-2 text-sm font-semibold', usedUp ? 'text-red-800' : 'text-amber-900')}><Lock className="mt-0.5 size-4 shrink-0" />{blockedReason}</p>
            )}
            {waitingLessons && (
              <>
                <ProgressBar value={progress} size="sm" className="mt-3 max-w-md" />
                <p className="mt-1.5 text-xs text-amber-900/80">{progress} % de la formation terminé</p>
              </>
            )}
            <p className="mt-2 text-xs text-gray-600">{LEARNING_MODES[mode]?.text}</p>
          </div>
        )}
      </div>

      {submitted.length > 0 && (
        <section className="card p-5 sm:p-6">
          <h3 className="mb-4 font-bold">Historique des tentatives</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-gray-500">
                <tr className="border-b border-gray-100"><th className="py-2 font-semibold">Tentative</th><th className="font-semibold">Date</th><th className="font-semibold">Note</th><th className="font-semibold">Résultat</th><th /></tr>
              </thead>
              <tbody>
                {submitted.map((a) => (
                  <tr key={a.id} className="border-b border-gray-50">
                    <td className="py-3 font-semibold">n° {a.number}</td>
                    <td>{formatDate(a.submittedAt)}</td>
                    <td className="font-bold">{a.score} / 100</td>
                    <td>{a.passed ? <span className="flex items-center gap-1 font-semibold text-brand-700"><CheckCircle2 className="size-4" />Admis</span> : <span className="flex items-center gap-1 font-semibold text-red-600"><XCircle className="size-4" />Non admis</span>}</td>
                    <td className="text-right">{exam.showCorrection && <Link to={`/examen/${exam.id}?resultat=${a.id}`} className="text-sm font-semibold text-brand-700 hover:underline">Correction</Link>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {best != null && <p className="mt-3 text-sm text-gray-600">Meilleure note : <strong>{best} / 100</strong></p>}
          </div>
        </section>
      )}
    </div>
  )
}

export default function Exams() {
  const state = useApi('/me/exams')
  return (
    <>
      <PageHeader title="Mes examens" subtitle="Passez vos examens finaux pour obtenir vos certificats de compétence." />
      <Async state={state}>
        {(items) =>
          items.length ? (
            <div className="space-y-10">{items.map((item) => <ExamCard key={item.exam.id} item={item} />)}</div>
          ) : (
            <EmptyState icon={ClipboardCheck} title="Aucun examen disponible" text="Les examens apparaissent ici lorsque vous êtes inscrit à une formation qui délivre un certificat de compétence." action={<Button to="/formations">Explorer le catalogue</Button>} />
          )
        }
      </Async>
    </>
  )
}
