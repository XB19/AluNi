import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import {
  ArrowLeft, ArrowRight, Award, BookOpen, Check, CheckCircle2, ChevronDown, Circle, Download, FileText, ListChecks,
  Lock, Menu, RotateCcw, ShieldCheck, Upload, X, XCircle,
} from 'lucide-react'
import { LESSON_TYPES, formatDate } from '../../data/constants'
import { api, fileUrl } from '../../api/client'
import { useApi } from '../../api/useApi'
import { LESSON_ICONS } from '../public/CourseDetail'
import { RichContent, VideoPlayer } from '../../components/RichContent'
import { Badge, Button, cx, ErrorState, FormError, Loading, ProgressBar, Toast } from '../../components/ui'

function flatItems(view) {
  const items = []
  view.modules.forEach((m, mi) => {
    m.lessons.forEach((l) => items.push({ kind: 'lesson', id: String(l.id), lesson: l, module: m, mi }))
    if (m.hasQuiz) items.push({ kind: 'quiz', id: `quiz-${m.id}`, module: m, mi })
  })
  return items
}

function Outline({ view, currentId, onSelect }) {
  const [open, setOpen] = useState(() => view.modules.map(() => true))
  return (
    <nav aria-label="Sommaire de la formation">
      {view.modules.map((m, mi) => {
        const done = m.lessons.filter((l) => l.completed).length
        return (
          <div key={m.id} className="border-b border-gray-100">
            <button onClick={() => setOpen(open.map((o, i) => (i === mi ? !o : o)))} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50">
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold text-gray-500 uppercase">Module {mi + 1}</span>
                <span className="block font-bold">{m.title}</span>
                <span className="text-xs text-gray-500">{done}/{m.lessons.length} leçons terminées</span>
              </span>
              {!m.unlocked && <Lock className="size-4 text-gray-400" aria-label="Module verrouillé" />}
              <ChevronDown className={cx('size-4 text-gray-500 transition', open[mi] && 'rotate-180')} />
            </button>
            {open[mi] && (
              <ul className="pb-2">
                {m.lessons.map((l) => {
                  const Icon = LESSON_ICONS[l.type] ?? FileText
                  return (
                    <li key={l.id}>
                      <button
                        disabled={!m.unlocked}
                        onClick={() => onSelect(String(l.id))}
                        className={cx(
                          'flex w-full items-start gap-3 px-4 py-2.5 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-50',
                          currentId === String(l.id) ? 'bg-brand-50 font-semibold text-brand-800' : 'hover:bg-gray-50',
                        )}
                      >
                        {l.completed ? <CheckCircle2 className="mt-0.5 size-4.5 shrink-0 text-brand-600" /> : <Circle className="mt-0.5 size-4.5 shrink-0 text-gray-300" />}
                        <span className="flex-1">
                          {l.title}
                          <span className="mt-0.5 flex items-center gap-1 text-xs font-normal text-gray-500"><Icon className="size-3.5" />{LESSON_TYPES[l.type]}{l.duration ? ` · ${l.duration}` : ''}</span>
                        </span>
                      </button>
                    </li>
                  )
                })}
                {m.hasQuiz && (
                  <li>
                    <button
                      disabled={!m.unlocked}
                      onClick={() => onSelect(`quiz-${m.id}`)}
                      className={cx('flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm disabled:opacity-50', currentId === `quiz-${m.id}` ? 'bg-brand-50 font-semibold text-brand-800' : 'hover:bg-gray-50')}
                    >
                      <ListChecks className="size-4.5 shrink-0 text-flame-500" />
                      <span className="flex-1">Quiz d'entraînement</span>
                      {m.quizScore != null && <span className="text-xs font-bold text-gray-600">{m.quizScore}%</span>}
                    </button>
                  </li>
                )}
              </ul>
            )}
          </div>
        )
      })}
      {view.examId && (
        <Link to="/apprenant/examens" className="flex items-center gap-3 bg-flame-50 px-4 py-4 text-sm font-bold text-flame-700 hover:bg-flame-100">
          <ShieldCheck className="size-5" />Examen final
        </Link>
      )}
    </nav>
  )
}

function PracticalUpload({ lesson, onUploaded }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const s = lesson.submission
  const upload = async (file) => {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      await api.upload(`/me/lessons/${lesson.id}/submission`, file)
      onUploaded()
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="mt-8 rounded-2xl border-2 border-dashed border-flame-200 bg-flame-50/50 p-5">
      <p className="flex items-center gap-2 font-bold"><Upload className="size-5 text-flame-500" />Exercice pratique à rendre</p>
      {s && (
        <div className="mt-3 rounded-xl bg-white p-4 text-sm">
          <p>Dernier dépôt : <strong>{s.fileName}</strong> le {formatDate(s.date)}</p>
          {s.status === 'corrige' ? (
            <p className="mt-1 text-brand-800">Note : <strong>{s.grade}/20</strong>{s.comment ? ` — « ${s.comment} »` : ''}</p>
          ) : (
            <Badge tone="amber" className="mt-2">En attente de correction</Badge>
          )}
        </div>
      )}
      <label className={cx('mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-flame-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-flame-600', busy && 'pointer-events-none opacity-60')}>
        <Upload className="size-4" />{busy ? 'Envoi en cours…' : s ? 'Déposer une nouvelle version' : 'Déposer mon travail'}
        <input type="file" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.html,.css,.js,.py,.txt" />
      </label>
      <p className="mt-2 text-xs text-gray-500">Photo, capture d'écran ou document (50 Mo maximum).</p>
      <div className="mt-2"><FormError error={error} /></div>
    </div>
  )
}

function LessonBody({ lesson, onUploaded }) {
  const file = fileUrl(lesson.fileUrl)
  return (
    <>
      {lesson.type === 'video' && <div className="mb-8"><VideoPlayer url={lesson.videoUrl} title={lesson.title} duration={lesson.duration} /></div>}
      {lesson.type === 'image' && file && <img src={file} alt={lesson.title} className="mb-8 w-full rounded-2xl" />}
      {file && lesson.type !== 'image' && (
        <div className="mb-8 flex items-center gap-4 rounded-2xl border border-gray-200 p-5">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600"><FileText className="size-7" /></span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{lesson.title}</p>
            <p className="text-sm text-gray-500">Document à consulter ou à télécharger</p>
          </div>
          <Button href={file} target="_blank" rel="noreferrer" variant="outline-gray" size="sm"><Download className="size-4" />Ouvrir</Button>
        </div>
      )}
      {lesson.content ? <RichContent html={lesson.content} /> : <p className="text-gray-500">Le contenu de cette leçon sera bientôt disponible.</p>}
      {lesson.practical && <PracticalUpload lesson={lesson} onUploaded={onUploaded} />}
    </>
  )
}

function ModuleQuiz({ module, onFinish, onScored }) {
  const state = useApi(`/me/modules/${module.id}/quiz`)
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  if (state.loading) return <Loading />
  if (state.error) return <ErrorState error={state.error} onRetry={state.reload} />
  const questions = state.data
  const byId = Object.fromEntries((result?.results ?? []).map((r) => [r.id, r]))

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      const r = await api.post(`/me/modules/${module.id}/quiz`, { answers })
      setResult(r)
      onScored()
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <p className="mb-6 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-900">Ce quiz sert à vous entraîner : il ne compte pas pour le certificat. Vous pouvez le refaire autant de fois que vous le souhaitez.</p>
      <ol className="space-y-6">
        {questions.map((q, qi) => {
          const r = byId[q.id]
          return (
            <li key={q.id} className="card p-5">
              <p className="font-bold"><span className="text-gray-400">{qi + 1}.</span> {q.text}</p>
              <div className="mt-4 grid gap-2">
                {q.options.map((o, oi) => {
                  const chosen = answers[q.id] === oi
                  const correct = r && oi === r.answer
                  const wrong = r && chosen && oi !== r.answer
                  return (
                    <button key={oi} disabled={!!result} onClick={() => setAnswers({ ...answers, [q.id]: oi })}
                      className={cx('flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition',
                        correct ? 'border-brand-500 bg-brand-50' : wrong ? 'border-red-400 bg-red-50' : chosen ? 'border-brand-600 bg-brand-50' : 'border-gray-200 hover:border-gray-300')}>
                      <span className={cx('flex size-5 shrink-0 items-center justify-center rounded-full border-2', chosen ? 'border-brand-600 bg-brand-600' : 'border-gray-300')}>
                        {chosen && <span className="size-2 rounded-full bg-white" />}
                      </span>
                      <span className="flex-1">{o}</span>
                      {correct && <CheckCircle2 className="size-5 text-brand-600" />}
                      {wrong && <XCircle className="size-5 text-red-500" />}
                    </button>
                  )
                })}
              </div>
            </li>
          )
        })}
      </ol>
      <div className="mt-4"><FormError error={error} /></div>
      {result ? (
        <div className={cx('mt-6 flex flex-wrap items-center gap-4 rounded-2xl p-5', result.score >= 60 ? 'bg-brand-50' : 'bg-amber-50')}>
          <p className="flex-1 text-lg font-bold">{result.score >= 60 ? '🎉 Bravo !' : 'Continuez vos efforts !'} Votre score : {result.score}%</p>
          <Button variant="outline-gray" onClick={() => { setAnswers({}); setResult(null) }}><RotateCcw className="size-4" />Recommencer</Button>
          <Button onClick={onFinish}>Continuer <ArrowRight className="size-4" /></Button>
        </div>
      ) : (
        <Button className="mt-6" size="lg" disabled={busy || Object.keys(answers).length < questions.length} onClick={submit}>
          {busy ? 'Correction…' : 'Valider mes réponses'}
        </Button>
      )}
    </div>
  )
}

export default function CoursePlayer() {
  const { slug, lessonId } = useParams()
  const navigate = useNavigate()
  const state = useApi(`/me/courses/${slug}/learn`)
  const [outline, setOutline] = useState(false)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => { window.scrollTo(0, 0); setOutline(false); setError(null) }, [lessonId])

  if (state.loading && !state.data) return <Loading className="min-h-screen" />
  if (state.error?.status === 403 || state.error?.status === 404) return <Navigate to={`/formations/${slug}`} replace />
  if (state.error) return <div className="p-6"><ErrorState error={state.error} onRetry={state.reload} /></div>
  const view = state.data
  const items = flatItems(view)
  if (!items.length) return <div className="p-6"><ErrorState error={new Error("Cette formation n'a pas encore de leçon.")} /></div>

  const firstOpen = items.find((it) => it.kind === 'lesson' && !it.lesson.completed && it.module.unlocked) ?? items[0]
  const index = Math.max(0, items.findIndex((it) => it.id === (lessonId ?? firstOpen.id)))
  const current = items[index]
  if (!current.module.unlocked) return <Navigate to={`/apprendre/${slug}/${firstOpen.id}`} replace />

  const prev = items[index - 1]
  const next = items[index + 1]
  const go = (id) => navigate(`/apprendre/${slug}/${id}`)
  const done = current.kind === 'lesson' && current.lesson.completed
  const moduleDoneAfter = current.kind === 'lesson' && current.module.lessons.every((l) => l.completed || String(l.id) === current.id)
  const nextLocked = next && next.mi !== current.mi && !next.module.unlocked && !(done || moduleDoneAfter)

  const complete = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await api.post(`/me/lessons/${current.lesson.id}/complete`, { completed: true })
      state.reload()
      if (res.courseCompleted) setToast('🎉 Formation terminée ! Bravo !')
      if (next) go(next.id)
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }

  const getAttestation = async () => {
    try {
      const { code } = await api.post(`/me/courses/${slug}/attestation`)
      navigate(`/apprenant/certificats/${code}`)
    } catch (e) {
      setError(e)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-gray-200 bg-white px-3 sm:px-5">
        <Link to="/apprenant" className="rounded-lg p-2 hover:bg-gray-100" aria-label="Retour au tableau de bord"><ArrowLeft className="size-5" /></Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{view.course.title}</p>
          <div className="flex items-center gap-3">
            <ProgressBar value={view.progress} size="sm" className="max-w-40 flex-1" />
            <span className="text-xs font-semibold text-gray-600">{view.progress}%</span>
          </div>
        </div>
        <button onClick={() => setOutline(true)} className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold lg:hidden">
          <Menu className="size-4" />Sommaire
        </button>
        {view.attestation.code ? (
          <Button size="sm" variant="secondary" className="hidden sm:inline-flex" to={`/apprenant/certificats/${view.attestation.code}`}><Award className="size-4" />Mon attestation</Button>
        ) : view.attestation.available && view.attestation.eligible ? (
          <Button size="sm" variant="secondary" className="hidden sm:inline-flex" onClick={getAttestation}><Award className="size-4" />Obtenir mon attestation</Button>
        ) : null}
      </header>

      <div className="lg:grid lg:grid-cols-[340px_1fr]">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] overflow-y-auto border-r border-gray-200 lg:block">
          <Outline view={view} currentId={current.id} onSelect={go} />
        </aside>

        {outline && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setOutline(false)} />
            <div className="absolute inset-y-0 right-0 flex w-[90%] max-w-sm flex-col bg-white">
              <div className="flex h-16 items-center justify-between border-b border-gray-100 px-4">
                <p className="font-bold">Sommaire</p>
                <button onClick={() => setOutline(false)} className="rounded-lg p-2 hover:bg-gray-100" aria-label="Fermer"><X className="size-5" /></button>
              </div>
              <div className="overflow-y-auto"><Outline view={view} currentId={current.id} onSelect={go} /></div>
            </div>
          </div>
        )}

        <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-8 lg:py-10">
          <p className="text-sm font-semibold text-brand-700">Module {current.mi + 1} · {current.module.title}</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
            {current.kind === 'quiz' ? "Quiz d'entraînement" : current.lesson.title}
          </h1>
          {current.kind === 'lesson' && (
            <p className="mt-2 flex items-center gap-2 text-sm text-gray-500">
              <BookOpen className="size-4" />{LESSON_TYPES[current.lesson.type]}{current.lesson.duration ? ` · ${current.lesson.duration}` : ''}
            </p>
          )}
          <div className="mt-8">
            {current.kind === 'quiz' ? (
              <ModuleQuiz key={current.id} module={current.module} onScored={state.reload} onFinish={() => (next ? go(next.id) : navigate('/apprenant'))} />
            ) : (
              <LessonBody lesson={current.lesson} onUploaded={() => { state.reload(); setToast('Travail déposé : votre formateur va le corriger.') }} />
            )}
          </div>

          {current.kind === 'lesson' && (
            <div className="mt-10 flex flex-col gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:items-center">
              {done ? (
                <p className="flex items-center gap-2 font-semibold text-brand-700"><CheckCircle2 className="size-5" />Leçon terminée</p>
              ) : (
                <Button size="lg" onClick={complete} disabled={busy}><Check className="size-5" />{busy ? 'Enregistrement…' : 'Marquer comme terminée'}</Button>
              )}
              <div className="flex gap-2 sm:ml-auto">
                {prev && <Button variant="outline-gray" onClick={() => go(prev.id)}><ArrowLeft className="size-4" />Précédent</Button>}
                {next && (
                  <Button variant={done ? 'primary' : 'outline-gray'} disabled={nextLocked} onClick={() => go(next.id)}>
                    Suivant <ArrowRight className="size-4" />
                  </Button>
                )}
              </div>
            </div>
          )}
          <div className="mt-3"><FormError error={error} /></div>
          {nextLocked && current.kind === 'lesson' && (
            <p className="mt-3 flex items-center gap-2 text-sm text-gray-500"><Lock className="size-4" />Terminez toutes les leçons de ce module pour débloquer le suivant.</p>
          )}
          {!next && view.examId && view.progress === 100 && (
            <div className="mt-8 rounded-2xl bg-flame-50 p-5">
              <p className="font-bold">Vous avez terminé toutes les leçons 🎉</p>
              <p className="mt-1 text-sm text-gray-700">L'examen final vous attend pour obtenir votre certificat de compétence.</p>
              <Button to="/apprenant/examens" variant="flame" className="mt-3"><ShieldCheck className="size-4" />Passer l'examen</Button>
            </div>
          )}
        </main>
      </div>
      <Toast message={toast} onDone={() => setToast('')} />
    </div>
  )
}
