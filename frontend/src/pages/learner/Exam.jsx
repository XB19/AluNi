import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router'
import {
  AlertTriangle, ArrowLeft, ArrowRight, Award, CheckCircle2, ChevronLeft, Clock, CloudCheck, CloudUpload, Eye, Flag, Lock,
  MonitorSmartphone, RotateCcw, ShieldAlert, Wifi, WifiOff, XCircle,
} from 'lucide-react'
import { api } from '../../api/client'
import { useApi } from '../../api/useApi'
import { readStore, writeStore } from '../../context/storage'
import { Button, cx, ErrorState, FormError, Loading, Modal } from '../../components/ui'

const TYPE_HINT = { unique: 'Une seule réponse', multiple: 'Plusieurs réponses possibles', vraifaux: 'Vrai ou faux', courte: 'Réponse courte' }
const backupKey = (attemptId) => `aluni-exam-backup-${attemptId}`

const fmt = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
const answered = (a) => a != null && (typeof a === 'string' ? a.trim() !== '' : a.length > 0)

function Shell({ children }) {
  return <div className="min-h-screen bg-white">{children}</div>
}

// ---------------------------------------------------------------- Résultat et correction
function Result({ result }) {
  return (
    <Shell>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Link to="/apprenant/examens" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"><ArrowLeft className="size-4" />Mes examens</Link>
        <div className={cx('mt-4 rounded-3xl p-8 text-center', result.passed ? 'bg-brand-50' : 'bg-amber-50')}>
          {result.passed ? <Award className="mx-auto size-16 text-brand-600" /> : <RotateCcw className="mx-auto size-14 text-amber-600" />}
          <h1 className="mt-4 text-3xl font-extrabold">{result.passed ? 'Félicitations, vous êtes admis(e) !' : 'Pas encore… ne lâchez rien !'}</h1>
          <p className="mt-1 text-gray-600">{result.examTitle}</p>
          <p className="mt-3 text-5xl font-black text-ink">{result.score}<span className="text-2xl text-gray-500">/100</span></p>
          <p className="mt-2 text-gray-700">Note minimale de réussite : {result.passMark}/100</p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            {result.passed && result.certificate && (
              result.certificate.status === 'en-attente' ? (
                <p className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-amber-800">Votre certificat sera disponible après validation par l'Académie.</p>
              ) : (
                <Button size="lg" to={`/apprenant/certificats/${result.certificate.code}`}><Award className="size-5" />Voir mon certificat</Button>
              )
            )}
            {!result.passed && result.attemptsLeft > 0 && (
              <Button size="lg" variant="flame" onClick={() => window.location.assign(window.location.pathname)}>
                Réessayer ({result.attemptsLeft} tentative{result.attemptsLeft > 1 ? 's' : ''} restante{result.attemptsLeft > 1 ? 's' : ''})
              </Button>
            )}
            <Button size="lg" variant="outline-gray" to={`/apprendre/${result.courseSlug}`}>Revoir le cours</Button>
          </div>
        </div>

        {result.corrections && (
          <>
            <h2 className="mt-10 mb-4 text-xl font-bold">Correction</h2>
            <ol className="space-y-3">
              {result.corrections.map((c, i) => (
                <li key={c.id} className="card p-5">
                  <div className="flex gap-3">
                    {c.correct ? <CheckCircle2 className="size-5 shrink-0 text-brand-600" /> : <XCircle className="size-5 shrink-0 text-red-500" />}
                    <div className="flex-1">
                      <p className="font-semibold">{i + 1}. {c.text}</p>
                      <p className="mt-1.5 text-sm text-gray-600">Votre réponse : <strong>{c.given ?? '—'}</strong></p>
                      {!c.correct && <p className="text-sm text-brand-800">Bonne réponse : <strong>{c.expected}</strong></p>}
                    </div>
                    <span className="text-sm font-semibold whitespace-nowrap text-gray-500">{c.earned}/{c.points} pt</span>
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </Shell>
  )
}

function ResultLoader({ attemptId }) {
  const state = useApi(`/exam-attempts/${attemptId}/result`)
  if (state.loading) return <Loading className="min-h-screen" />
  if (state.error) return <Shell><div className="mx-auto max-w-2xl p-6"><ErrorState error={state.error} onRetry={state.reload} /></div></Shell>
  return <Result result={state.data} />
}

// ---------------------------------------------------------------- Consignes
function Intro({ item, onStart, starting, error }) {
  const [accepted, setAccepted] = useState(false)
  const { exam, attemptsLeft, inProgressAttemptId, passed } = item
  const canStart = !passed && (inProgressAttemptId || (attemptsLeft > 0 && exam.open))
  return (
    <Shell>
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Link to="/apprenant/examens" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"><ArrowLeft className="size-4" />Mes examens</Link>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">{exam.title}</h1>
        <p className="mt-1 text-gray-600">{exam.course.title}</p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Questions', exam.questionCount],
            ['Durée', `${exam.durationMin} min`],
            ['Réussite', `${exam.passMark}/100`],
            ['Tentatives', `${attemptsLeft} restante${attemptsLeft > 1 ? 's' : ''}`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-gray-50 p-4 text-center">
              <p className="text-xl font-extrabold">{v}</p>
              <p className="text-sm text-gray-500">{k}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-gray-200 p-5">
          <h2 className="font-bold">Avant de commencer</h2>
          <ul className="mt-3 space-y-3 text-[15px] text-gray-700">
            <li className="flex gap-3"><Clock className="mt-0.5 size-5 shrink-0 text-brand-600" />Le chronomètre démarre dès que vous cliquez sur « Commencer ». À la fin du temps, vos réponses sont envoyées automatiquement.</li>
            <li className="flex gap-3"><CloudCheck className="mt-0.5 size-5 shrink-0 text-brand-600" />Vos réponses sont enregistrées à chaque clic. En cas de coupure d'internet ou de courant, revenez sur cette page pour reprendre là où vous étiez.</li>
            <li className="flex gap-3"><Eye className="mt-0.5 size-5 shrink-0 text-flame-500" />Restez sur cette page : chaque changement d'onglet ou d'application est détecté et signalé au formateur.</li>
            <li className="flex gap-3"><MonitorSmartphone className="mt-0.5 size-5 shrink-0 text-flame-500" />Une seule session est autorisée : si vous ouvrez l'examen ailleurs, cette fenêtre sera bloquée.</li>
          </ul>
          {exam.roomOnly && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Mode « examen en salle » : cet examen ne peut être passé que sur les postes de la salle de l'Académie.</p>}
        </div>

        {inProgressAttemptId ? (
          <p className="mt-6 rounded-xl bg-blue-50 p-4 text-sm font-medium text-blue-900">Vous avez un examen en cours : vos réponses ont été conservées. Le temps continue de s'écouler.</p>
        ) : (
          <label className="mt-6 flex items-start gap-3 text-[15px]">
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1 size-4.5 accent-brand-600" />
            J'ai lu les consignes et je m'engage à passer cet examen seul(e), sans aide extérieure.
          </label>
        )}
        <div className="mt-4"><FormError error={error} /></div>
        <Button size="lg" variant="flame" className="mt-4 w-full sm:w-auto" disabled={!canStart || starting || (!inProgressAttemptId && !accepted)} onClick={onStart}>
          {starting ? 'Préparation…' : inProgressAttemptId ? "Reprendre l'examen" : "Commencer l'examen"}
        </Button>
        {!canStart && <p className="mt-3 text-sm font-medium text-red-600">{passed ? 'Vous avez déjà réussi cet examen.' : attemptsLeft <= 0 ? 'Vous avez utilisé toutes vos tentatives.' : "Cet examen n'est pas ouvert actuellement."}</p>}
      </div>
    </Shell>
  )
}

// ---------------------------------------------------------------- Examen en cours
function Running({ initial, onFinished, onBlocked }) {
  const attemptId = initial.attemptId
  const offset = useRef(initial.serverNow - Date.now())
  const token = useRef(initial.sessionToken)
  const questions = initial.questions

  // Les réponses gardées sur l'appareil (coupure) priment si elles n'ont pas pu être envoyées
  const backup = readStore(backupKey(attemptId), null)
  const start = backup?.pending ? backup : { answers: initial.answers ?? {}, current: initial.currentIndex ?? 0, flagged: initial.flagged ?? [] }
  const [answers, setAnswers] = useState(start.answers)
  const [current, setCurrent] = useState(Math.min(start.current, questions.length - 1))
  const [flagged, setFlagged] = useState(start.flagged)
  const [tabSwitches, setTabSwitches] = useState(initial.tabSwitches)
  const [now, setNow] = useState(Date.now() + offset.current)
  const [online, setOnline] = useState(navigator.onLine)
  const [sync, setSync] = useState({ state: backup?.pending ? 'pending' : 'saved', at: null })
  const [tabWarning, setTabWarning] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const latest = useRef({ answers, current, flagged })
  latest.current = { answers, current, flagged }
  const finished = useRef(false)

  const handleFatal = useCallback((e) => {
    if (e.status === 409) {
      finished.current = true
      onBlocked()
      return true
    }
    if (e.status === 410) {
      finished.current = true
      writeStore(backupKey(attemptId), null)
      onFinished(null)
      return true
    }
    return false
  }, [attemptId, onBlocked, onFinished])

  const push = useCallback(async () => {
    if (finished.current) return
    const { answers: a, current: c, flagged: f } = latest.current
    setSync((s) => ({ ...s, state: 'saving' }))
    try {
      const res = await api.put(`/exam-attempts/${attemptId}`, { answers: a, currentIndex: c, flagged: f }, { headers: { 'X-Exam-Session': token.current } })
      writeStore(backupKey(attemptId), { answers: a, current: c, flagged: f, pending: false })
      setSync({ state: 'saved', at: new Date(res.savedAt) })
    } catch (e) {
      if (!handleFatal(e)) setSync((s) => ({ ...s, state: 'pending' }))
    }
  }, [attemptId, handleFatal])

  // Enregistrement local immédiat + envoi au serveur après une courte pause
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      if (backup?.pending) push()
      return
    }
    writeStore(backupKey(attemptId), { answers, current, flagged, pending: true })
    setSync((s) => ({ ...s, state: 'pending' }))
    const t = setTimeout(push, 700)
    return () => clearTimeout(t)
  }, [answers, current, flagged])

  // Nouvel essai régulier tant que des réponses n'ont pas été envoyées
  useEffect(() => {
    if (sync.state !== 'pending') return
    const t = setInterval(() => navigator.onLine && push(), 10000)
    return () => clearInterval(t)
  }, [sync.state, push])

  const submit = useCallback(async () => {
    if (finished.current) return
    setSubmitting(true)
    setError(null)
    try {
      await push()
      const result = await api.post(`/exam-attempts/${attemptId}/submit`, null, { headers: { 'X-Exam-Session': token.current } })
      finished.current = true
      writeStore(backupKey(attemptId), null)
      onFinished(result)
    } catch (e) {
      if (!handleFatal(e)) setError(e)
    } finally {
      setSubmitting(false)
      setConfirm(false)
    }
  }, [attemptId, push, handleFatal, onFinished])

  // Chronomètre (heure du serveur)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() + offset.current), 1000)
    return () => clearInterval(t)
  }, [])
  const remaining = initial.endsAt - now
  useEffect(() => {
    if (remaining <= 0 && !finished.current && !submitting) submit()
  }, [remaining <= 0])

  // Connexion internet
  useEffect(() => {
    const on = () => { setOnline(true); push() }
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [push])

  // Changement d'onglet : signalé au formateur
  useEffect(() => {
    const onVis = async () => {
      if (document.visibilityState !== 'hidden' || finished.current) return
      setTabWarning(true)
      setTabSwitches((n) => n + 1)
      try {
        const r = await api.post(`/exam-attempts/${attemptId}/events`, { type: 'tab-switch' }, { headers: { 'X-Exam-Session': token.current } })
        setTabSwitches(r.tabSwitches)
      } catch (e) {
        handleFatal(e)
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [attemptId, handleFatal])

  const q = questions[current]
  const answer = answers[q.id]
  const answeredCount = questions.filter((x) => answered(answers[x.id])).length
  const setAnswer = (value) => setAnswers((a) => ({ ...a, [q.id]: value }))
  const choose = (index) => {
    if (q.type === 'multiple') {
      const cur = answer ?? []
      setAnswer(cur.includes(index) ? cur.filter((x) => x !== index) : [...cur, index])
    } else setAnswer([index])
  }
  const toggleFlag = () => setFlagged((f) => (f.includes(q.id) ? f.filter((x) => x !== q.id) : [...f, q.id]))

  const syncLabel = {
    saving: 'Enregistrement…',
    pending: online ? 'En attente d’envoi…' : 'Gardé sur cet appareil',
    saved: sync.at ? `Enregistré à ${sync.at.toLocaleTimeString('fr-FR')}` : initial.resumed ? 'Session reprise' : 'Enregistrement automatique activé',
  }[sync.state]

  return (
    <div className="min-h-screen bg-gray-50 select-none">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold sm:text-base">{initial.exam.title}</p>
            <p className="flex items-center gap-1.5 text-xs text-gray-500">
              {!online ? <WifiOff className="size-3.5 text-red-500" /> : sync.state === 'saved' ? <Wifi className="size-3.5 text-brand-600" /> : <CloudUpload className="size-3.5 text-amber-500" />}
              {syncLabel}
            </p>
          </div>
          <div className={cx('flex items-center gap-2 rounded-xl px-3.5 py-2 font-mono text-lg font-bold tabular-nums', remaining < 120000 ? 'animate-pulse bg-red-50 text-red-600' : 'bg-gray-100 text-ink')} role="timer" aria-label="Temps restant">
            <Clock className="size-5" />{fmt(remaining)}
          </div>
          <Button variant="primary" size="sm" className="hidden sm:inline-flex" onClick={() => setConfirm(true)}>Terminer</Button>
        </div>
        <div className="h-1 bg-gray-100"><div className="h-full bg-brand-500 transition-all" style={{ width: `${(answeredCount / questions.length) * 100}%` }} /></div>
      </header>

      {!online && (
        <div className="bg-amber-100 px-4 py-2.5 text-center text-sm font-medium text-amber-900">
          <WifiOff className="mr-1.5 inline size-4" />Connexion perdue : continuez, vos réponses sont gardées sur cet appareil et seront envoyées au retour de la connexion.
        </div>
      )}
      {initial.resumed && sync.at == null && (
        <div className="bg-blue-50 px-4 py-2.5 text-center text-sm font-medium text-blue-900">Session reprise : vos réponses précédentes ont été restaurées.</div>
      )}

      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-6 lg:grid-cols-[1fr_260px]">
        <section className="card p-5 sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-gray-500">Question {current + 1} sur {questions.length}</p>
            <button onClick={toggleFlag} className={cx('flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold', flagged.includes(q.id) ? 'bg-amber-100 text-amber-800' : 'text-gray-500 hover:bg-gray-100')}>
              <Flag className="size-4" />{flagged.includes(q.id) ? 'Marquée' : 'À revoir'}
            </button>
          </div>
          <h1 className="mt-3 text-xl leading-snug font-bold whitespace-pre-line sm:text-2xl">{q.text}</h1>
          <p className="mt-1.5 text-sm text-gray-500">{TYPE_HINT[q.type]} · {q.points} point{q.points > 1 ? 's' : ''}</p>

          <div className="mt-6 grid gap-3">
            {q.type === 'courte' ? (
              <input value={answer ?? ''} onChange={(e) => setAnswer(e.target.value)} maxLength={500} className="input h-12 text-base" placeholder="Votre réponse" aria-label="Votre réponse" />
            ) : (
              q.options.map((o) => {
                const chosen = (answer ?? []).includes(o.index)
                return (
                  <button key={o.index} onClick={() => choose(o.index)} aria-pressed={chosen}
                    className={cx('flex min-h-14 items-center gap-4 rounded-xl border-2 px-4 py-3 text-left text-[15px] transition', chosen ? 'border-brand-600 bg-brand-50 font-semibold' : 'border-gray-200 bg-white hover:border-gray-300')}>
                    <span className={cx('flex size-6 shrink-0 items-center justify-center border-2', q.type === 'multiple' ? 'rounded-md' : 'rounded-full', chosen ? 'border-brand-600 bg-brand-600 text-white' : 'border-gray-300')}>
                      {chosen && (q.type === 'multiple' ? <CheckCircle2 className="size-4" /> : <span className="size-2.5 rounded-full bg-white" />)}
                    </span>
                    {o.text}
                  </button>
                )
              })
            )}
          </div>

          <div className="mt-8 flex gap-3">
            <Button variant="outline-gray" disabled={current === 0} onClick={() => setCurrent(current - 1)}><ChevronLeft className="size-4" />Précédente</Button>
            {current < questions.length - 1 ? (
              <Button className="ml-auto" onClick={() => setCurrent(current + 1)}>Suivante <ArrowRight className="size-4" /></Button>
            ) : (
              <Button className="ml-auto" variant="flame" onClick={() => setConfirm(true)}>Terminer l'examen</Button>
            )}
          </div>
        </section>

        <aside className="card self-start p-5">
          <p className="font-bold">Navigation</p>
          <p className="text-sm text-gray-500">{answeredCount} / {questions.length} répondues</p>
          <div className="mt-4 grid grid-cols-5 gap-2">
            {questions.map((x, i) => (
              <button key={x.id} onClick={() => setCurrent(i)} aria-label={`Question ${i + 1}`}
                className={cx('relative flex aspect-square items-center justify-center rounded-lg text-sm font-bold',
                  i === current ? 'ring-2 ring-brand-600 ring-offset-1' : '',
                  answered(answers[x.id]) ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')}>
                {i + 1}
                {flagged.includes(x.id) && <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-amber-500 ring-2 ring-white" />}
              </button>
            ))}
          </div>
          <div className="mt-4 space-y-1.5 text-xs text-gray-600">
            <p className="flex items-center gap-2"><span className="size-3 rounded bg-brand-600" />Répondue</p>
            <p className="flex items-center gap-2"><span className="size-3 rounded bg-gray-200" />Sans réponse</p>
            <p className="flex items-center gap-2"><span className="size-3 rounded-full bg-amber-500" />À revoir</p>
          </div>
          {tabSwitches > 0 && (
            <p className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-2.5 text-xs font-semibold text-red-700"><ShieldAlert className="size-4 shrink-0" />{tabSwitches} changement(s) d'onglet signalé(s)</p>
          )}
          <Button variant="primary" className="mt-5 w-full sm:hidden" onClick={() => setConfirm(true)}>Terminer l'examen</Button>
        </aside>
      </div>

      <Modal open={tabWarning} onClose={() => setTabWarning(false)} title="Changement d'onglet détecté"
        footer={<Button onClick={() => setTabWarning(false)}>J'ai compris, je continue</Button>}>
        <div className="flex gap-4">
          <AlertTriangle className="size-8 shrink-0 text-amber-500" />
          <p className="text-gray-700">Vous avez quitté la page de l'examen. Cet incident a été enregistré et sera signalé au formateur. Merci de rester sur cette page jusqu'à la fin.</p>
        </div>
      </Modal>

      <Modal open={confirm || !!error} onClose={() => { setConfirm(false); setError(null) }} title="Terminer l'examen ?"
        footer={<><Button variant="outline-gray" onClick={() => { setConfirm(false); setError(null) }}>Continuer l'examen</Button><Button onClick={submit} disabled={submitting}>{submitting ? 'Envoi…' : 'Envoyer mes réponses'}</Button></>}>
        <p className="text-gray-700">Vous avez répondu à <strong>{answeredCount} question{answeredCount > 1 ? 's' : ''} sur {questions.length}</strong>.</p>
        {answeredCount < questions.length && <p className="mt-2 font-medium text-amber-700">Attention : {questions.length - answeredCount} question(s) sans réponse.</p>}
        <p className="mt-2 text-sm text-gray-500">Une fois envoyées, vos réponses ne pourront plus être modifiées.</p>
        <div className="mt-3"><FormError error={error} /></div>
      </Modal>
    </div>
  )
}

export default function Exam() {
  const { examId } = useParams()
  const [params] = useSearchParams()
  const resultId = params.get('resultat')
  const exams = useApi(resultId ? null : '/me/exams')
  const [phase, setPhase] = useState('intro')
  const [attempt, setAttempt] = useState(null)
  const [result, setResult] = useState(null)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState(null)

  if (resultId) return <ResultLoader attemptId={resultId} />
  if (phase === 'result') return result ? <Result result={result} /> : <ResultLoader attemptId={attempt.attemptId} />
  if (phase === 'blocked') {
    return (
      <Shell>
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <Lock className="mx-auto size-14 text-red-500" />
          <h1 className="mt-5 text-2xl font-extrabold">Session ouverte ailleurs</h1>
          <p className="mt-2 text-gray-600">Cet examen a été ouvert dans une autre fenêtre ou sur un autre appareil. Une seule session active est autorisée par compte.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button onClick={() => window.location.reload()}>Reprendre ici</Button>
            <Button variant="outline-gray" to="/apprenant/examens">Mes examens</Button>
          </div>
        </div>
      </Shell>
    )
  }
  if (phase === 'running' && attempt) {
    return <Running initial={attempt} onBlocked={() => setPhase('blocked')} onFinished={(r) => { setResult(r); setPhase('result') }} />
  }

  if (exams.loading) return <Loading className="min-h-screen" />
  if (exams.error) return <Shell><div className="mx-auto max-w-2xl p-6"><ErrorState error={exams.error} onRetry={exams.reload} /></div></Shell>
  const item = (exams.data ?? []).find((x) => String(x.exam.id) === examId)
  if (!item) return <Navigate to="/apprenant/examens" replace />

  const start = async () => {
    setStarting(true)
    setError(null)
    try {
      setAttempt(await api.post(`/exams/${examId}/attempts`))
      setPhase('running')
    } catch (e) {
      setError(e)
    } finally {
      setStarting(false)
    }
  }

  return <Intro item={item} onStart={start} starting={starting} error={error} />
}
