import { Link } from 'react-router'
import { CalendarDays, CheckCircle2, ClipboardCheck, Clock, Lock, MonitorSmartphone, RotateCcw, Target, XCircle } from 'lucide-react'
import { formatDate } from '../../data/constants'
import { useApi } from '../../api/useApi'
import { Async, Badge, Button, EmptyState, PageHeader } from '../../components/ui'

function ExamCard({ item }) {
  const { exam, attempts, attemptsLeft, passed, inProgressAttemptId, progress, certificateCode } = item
  const submitted = attempts.filter((a) => a.status === 'soumis')
  const best = submitted.length ? Math.max(...submitted.map((a) => a.score)) : null
  return (
    <div className="space-y-4">
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 p-5 sm:p-6">
          <div>
            <div className="flex flex-wrap gap-2">
              {passed ? <Badge tone="green"><CheckCircle2 className="size-3.5" />Réussi</Badge> : exam.open ? <Badge tone="flame">Ouvert</Badge> : <Badge>Fermé</Badge>}
              <Badge>Examen final</Badge>
              {exam.roomOnly && <Badge tone="blue"><MonitorSmartphone className="size-3.5" />En salle</Badge>}
            </div>
            <h2 className="mt-2 text-xl font-bold">{exam.title}</h2>
            <Link to={`/apprendre/${exam.course.slug}`} className="mt-1 inline-block text-sm text-gray-600 hover:text-brand-700">{exam.course.title}</Link>
          </div>
          {passed ? (
            <Button to={certificateCode ? `/apprenant/certificats/${certificateCode}` : '/apprenant/certificats'} variant="secondary">Voir mon certificat</Button>
          ) : inProgressAttemptId ? (
            <Button to={`/examen/${exam.id}`} variant="flame" size="lg">Reprendre l'examen</Button>
          ) : attemptsLeft > 0 && exam.open ? (
            <Button to={`/examen/${exam.id}`} variant="flame" size="lg">{submitted.length ? 'Nouvelle tentative' : "Commencer l'examen"}</Button>
          ) : (
            <Button disabled variant="outline-gray"><Lock className="size-4" />{attemptsLeft > 0 ? 'Examen fermé' : 'Tentatives épuisées'}</Button>
          )}
        </div>
        <dl className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4 sm:p-6">
          {[
            [Clock, 'Durée', `${exam.durationMin} minutes`],
            [Target, 'Note de réussite', `${exam.passMark} / 100`],
            [RotateCcw, 'Tentatives restantes', `${attemptsLeft} sur ${exam.attemptsAllowed}`],
            [CalendarDays, 'Fermeture', exam.closesAt ? formatDate(exam.closesAt) : 'Aucune'],
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
        {progress < 100 && !passed && (
          <p className="bg-amber-50 px-6 py-3 text-sm text-amber-900">
            Conseil : vous avez terminé {progress}% des leçons. Révisez les modules avant de passer l'examen pour mettre toutes les chances de votre côté.
          </p>
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
