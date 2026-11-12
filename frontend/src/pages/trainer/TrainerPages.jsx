import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  AlertTriangle, BookOpen, Check, ChevronLeft, ChevronRight, Download, Eye, FileCheck, FileUp, Library, Pencil, Plus, Search, ShieldAlert,
  ShieldCheck, Trash2, TrendingUp, Users,
} from 'lucide-react'
import { COURSE_STATUS, LEARNING_MODES, PROFILE_LABELS, QUESTION_TYPES, formatDate } from '../../data/constants'
import { api, qs } from '../../api/client'
import { useApi } from '../../api/useApi'
import { CourseCover } from '../../components/CourseCard'
import { Async, Badge, Button, cx, EmptyState, Field, FormError, Modal, PageHeader, Paginated, ProgressBar, StatCard, Toast } from '../../components/ui'
import { ImportQuestionsModal } from './ImportModals'

export function StatusBadge({ status }) {
  const s = COURSE_STATUS[status] ?? { label: status, tone: 'gray' }
  return <Badge tone={s.tone}>{s.label}</Badge>
}

// ---------------------------------------------------------------- Tableau de bord
export function TrainerDashboard() {
  const state = useApi('/trainer/dashboard')
  return (
    <>
      <PageHeader title="Tableau de bord formateur" subtitle="Suivez vos formations et vos apprenants." actions={<Button to="/formateur/formations/nouvelle"><Plus className="size-4" />Nouvelle formation</Button>} />
      <Async state={state}>
        {({ stats, courses, alerts, results }) => (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard icon={Users} label="Apprenants inscrits" value={stats.learners} hint={`+${stats.newThisMonth} ces 30 derniers jours`} />
              <StatCard icon={BookOpen} label="Formations publiées" value={stats.published} hint={stats.drafts ? `${stats.drafts} en brouillon` : null} tone="blue" />
              <StatCard icon={TrendingUp} label="Taux de réussite" value={stats.successRate != null ? `${stats.successRate} %` : '—'} hint="Examens finaux" tone="gold" />
              <StatCard icon={FileCheck} label="Examens corrigés" value={stats.graded} hint="Automatiquement, par la plateforme" tone="flame" />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
              <section className="card p-5 sm:p-6">
                <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">Mes formations</h2><Link to="/formateur/formations" className="text-sm font-bold text-brand-700 hover:underline">Gérer</Link></div>
                {courses.length ? (
                  <ul className="divide-y divide-gray-100">
                    {courses.map((c) => (
                      <li key={c.id}>
                        <Link to={`/formateur/formations/${c.id}`} className="flex items-center gap-4 py-3.5 hover:opacity-90">
                          <CourseCover course={c} className="size-12 shrink-0 rounded-xl" iconSize="size-5" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-bold">{c.title}</p>
                            <p className="text-sm text-gray-500">{c.enrolled} apprenant{c.enrolled > 1 ? 's' : ''} actif{c.enrolled > 1 ? 's' : ''}</p>
                          </div>
                          <StatusBadge status={c.status} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-600">Vous n'avez pas encore créé de formation.</p>
                )}
              </section>
              <div className="space-y-6">
                <section className="card p-5">
                  <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><ShieldAlert className="size-5 text-red-500" />Alertes anti-fraude</h2>
                  {alerts.length ? (
                    <ul className="space-y-2">
                      {alerts.map((a) => (
                        <li key={a.learnerId + a.course} className="flex items-center justify-between gap-3 rounded-xl bg-red-50 px-3 py-2.5 text-sm">
                          <span className="min-w-0"><strong>{a.name}</strong><br /><span className="text-gray-600">{a.course}</span></span>
                          <Badge tone="red" className="shrink-0 whitespace-nowrap">{a.tabSwitches} onglet(s)</Badge>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-600">Aucun comportement suspect signalé.</p>
                  )}
                </section>
                <section className="card p-5">
                  <h2 className="text-lg font-bold">Derniers résultats d'examen</h2>
                  <p className="mt-0.5 mb-3 text-xs text-gray-500">Corrigés automatiquement : vous n'avez rien à corriger.</p>
                  {results.length ? (
                    <ul>
                      {results.map((r, i) => (
                        <li key={r.learnerId + '-' + i} className="flex items-center justify-between gap-3 border-b border-gray-100 py-2.5 text-sm last:border-0">
                          <span className="min-w-0"><strong>{r.name}</strong><br /><span className="text-gray-600">{r.course} · {formatDate(r.date)}</span></span>
                          <Badge tone={r.passed ? 'green' : 'red'}>{r.score}/100</Badge>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-600">Aucun examen passé pour l'instant.</p>
                  )}
                </section>
              </div>
            </div>
          </>
        )}
      </Async>
    </>
  )
}

// ---------------------------------------------------------------- Mes formations
export function TrainerCourses() {
  const state = useApi('/trainer/courses')
  return (
    <>
      <PageHeader title="Mes formations" subtitle="Créez, modifiez et publiez vos formations : elles sont visibles dès leur publication." actions={<Button to="/formateur/formations/nouvelle"><Plus className="size-4" />Nouvelle formation</Button>} />
      <Async state={state}>
        {(courses) => (
          <Paginated items={courses} pageSize={8}>{(page) => (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {page.map((c) => (
              <div key={c.id} className="card overflow-hidden">
                <CourseCover course={c} className="aspect-[16/8]" />
                <div className="p-5">
                  <StatusBadge status={c.status} />
                  <h3 className="mt-2 font-bold">{c.title}</h3>
                  <p className="mt-1 text-sm text-gray-500">{c.modules} modules · {c.lessons} leçons · {c.enrolled} apprenant{c.enrolled > 1 ? 's' : ''}</p>
                  <div className="mt-4 flex gap-2">
                    <Button to={`/formateur/formations/${c.id}`} size="sm"><Pencil className="size-4" />Modifier</Button>
                    {c.status === 'publiee' && <Button to={`/formations/${c.slug}`} size="sm" variant="ghost"><Eye className="size-4" />Aperçu</Button>}
                  </div>
                </div>
              </div>
            ))}
            <Link to="/formateur/formations/nouvelle" className="flex min-h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-brand-400 hover:text-brand-700">
              <Plus className="size-8" />
              <span className="mt-2 font-semibold">Créer une formation</span>
            </Link>
          </div>
          )}</Paginated>
        )}
      </Async>
    </>
  )
}

// ---------------------------------------------------------------- Banque de questions
const blankQuestion = (courseId) => ({ courseId, moduleId: '', type: 'unique', text: '', options: ['', '', '', ''], correct: [0], accepted: [''], points: 1 })

export function QuestionForm({ initial, courses, onSaved, formId = 'question-form' }) {
  const [q, setQ] = useState(initial)
  const [error, setError] = useState(null)
  const course = useApi(q.courseId ? `/trainer/courses/${q.courseId}` : null)
  const modules = course.data?.modules ?? []
  const set = (patch) => setQ({ ...q, ...patch })
  const toggleCorrect = (i) => set({ correct: q.type === 'multiple' ? (q.correct.includes(i) ? q.correct.filter((x) => x !== i) : [...q.correct, i]) : [i] })

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    // Les index des bonnes réponses sont recalculés après suppression des réponses vides
    const kept = q.options.map((o, i) => [o.trim(), i]).filter(([o]) => o)
    const body = {
      courseId: Number(q.courseId),
      moduleId: q.moduleId ? Number(q.moduleId) : null,
      type: q.type,
      text: q.text,
      options: kept.map(([o]) => o),
      correct: q.type === 'vraifaux' ? q.correct : kept.map(([, i], k) => (q.correct.includes(i) ? k : -1)).filter((k) => k >= 0),
      accepted: q.accepted.filter((a) => a.trim()),
      points: Number(q.points),
    }
    try {
      onSaved(q.id ? await api.put(`/trainer/questions/${q.id}`, body) : await api.post('/trainer/questions', body))
    } catch (err) {
      setError(err)
    }
  }

  return (
    <form id={formId} className="space-y-4" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Formation">
          <select required value={q.courseId} onChange={(e) => set({ courseId: e.target.value, moduleId: '' })} className="input">
            <option value="">Choisir…</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </Field>
        <Field label="Utilisation" hint="Les quiz de module ne sont pas certifiants.">
          <select value={q.moduleId} onChange={(e) => set({ moduleId: e.target.value, type: e.target.value && !['unique', 'vraifaux'].includes(q.type) ? 'unique' : q.type })} className="input">
            <option value="">Examen final</option>
            {modules.map((m, i) => <option key={m.id} value={m.id}>Quiz – module {i + 1} : {m.title}</option>)}
          </select>
        </Field>
        <Field label="Type de question">
          <select value={q.type} onChange={(e) => set({ type: e.target.value, correct: [0] })} className="input">
            {Object.entries(QUESTION_TYPES).filter(([k]) => !q.moduleId || ['unique', 'vraifaux'].includes(k)).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Points"><input type="number" min={1} max={20} value={q.points} onChange={(e) => set({ points: e.target.value })} className="input" /></Field>
      </div>
      <Field label="Énoncé" error={error?.fields?.text}><textarea required value={q.text} onChange={(e) => set({ text: e.target.value })} rows={3} className="input" placeholder="Saisissez la question…" /></Field>
      {(q.type === 'unique' || q.type === 'multiple') && (
        <div>
          <p className="label">Réponses proposées <span className="font-normal text-gray-500">(cochez la ou les bonnes réponses)</span></p>
          <div className="space-y-2">
            {q.options.map((o, i) => (
              <div key={i} className="flex items-center gap-3">
                <input type={q.type === 'multiple' ? 'checkbox' : 'radio'} name="correct" checked={q.correct.includes(i)} onChange={() => toggleCorrect(i)} className="size-4.5 accent-brand-600" aria-label={`Réponse ${i + 1} correcte`} />
                <input value={o} onChange={(e) => set({ options: q.options.map((x, j) => (j === i ? e.target.value : x)) })} className="input" placeholder={`Réponse ${i + 1}`} />
              </div>
            ))}
          </div>
          <button type="button" onClick={() => set({ options: [...q.options, ''] })} className="mt-2 text-sm font-semibold text-brand-700 hover:underline">+ Ajouter une réponse</button>
        </div>
      )}
      {q.type === 'vraifaux' && (
        <div className="grid grid-cols-2 gap-3">
          {['Vrai', 'Faux'].map((v, i) => (
            <button type="button" key={v} onClick={() => set({ correct: [i] })} className={cx('h-11 rounded-lg border-2 font-semibold', q.correct[0] === i ? 'border-brand-600 bg-brand-50' : 'border-gray-200')}>{v}</button>
          ))}
        </div>
      )}
      {q.type === 'courte' && (
        <Field label="Réponses acceptées" hint="Séparez les variantes par une virgule (la casse et les accents sont ignorés).">
          <input value={q.accepted.join(', ')} onChange={(e) => set({ accepted: e.target.value.split(',').map((s) => s.trimStart()) })} className="input" placeholder="navigateur, navigateur web" />
        </Field>
      )}
      <FormError error={error} />
    </form>
  )
}

/** Bonne réponse d'une question, en clair, pour la relire d'un coup d'œil. */
function answerOf(x) {
  if (x.type === 'courte') return x.accepted.join(' / ')
  if (x.type === 'vraifaux') return ['Vrai', 'Faux'][x.correct[0]] ?? ''
  return x.correct.map((i) => x.options[i]).filter(Boolean).join(' · ')
}

const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`

/**
 * Banque de questions, en deux temps pour s'y retrouver :
 * 1. le formateur choisit une formation ;
 * 2. il voit ses questions rangées par usage : l'examen final, puis le quiz de chaque module.
 */
export function QuestionBank() {
  const [params, setParams] = useSearchParams()
  const coursesState = useApi('/trainer/courses')
  const courses = coursesState.data ?? []
  const all = useApi('/trainer/questions')
  const current = courses.find((c) => String(c.id) === params.get('formation'))
  const open = (c) => setParams(c ? { formation: c.id } : {})

  if (current) return <CourseQuestions course={current} courses={courses} onBack={() => open(null)} onChanged={all.reload} />

  const counts = {}
  for (const x of all.data ?? []) {
    const k = counts[x.course.id] ??= { exam: 0, quiz: 0 }
    if (x.module) k.quiz++
    else k.exam++
  }
  return (
    <>
      <PageHeader title="Banque de questions" subtitle="Choisissez une formation pour voir et gérer ses questions : l'examen final et les quiz de chaque module." />
      <Async state={coursesState}>
        {(list) =>
          list.length ? (
            <Paginated items={list} pageSize={9}>{(page) => (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {page.map((c) => {
                  const n = counts[c.id] ?? { exam: 0, quiz: 0 }
                  return (
                    <button key={c.id} type="button" onClick={() => open(c)}
                      className="card group flex flex-col overflow-hidden text-left transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-brand-600">
                      <CourseCover course={c} className="aspect-[16/7]" />
                      <div className="flex flex-1 flex-col p-5">
                        <span className="self-start"><StatusBadge status={c.status} /></span>
                        <h3 className="mt-2 font-bold group-hover:text-brand-700">{c.title}</h3>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                          <div className="rounded-xl bg-brand-50 px-3 py-2">
                            <p className="text-lg font-extrabold text-brand-800">{all.data ? n.exam : '…'}</p>
                            <p className="text-gray-600">Examen final</p>
                          </div>
                          <div className="rounded-xl bg-gold-100 px-3 py-2">
                            <p className="text-lg font-extrabold text-gold-700">{all.data ? n.quiz : '…'}</p>
                            <p className="text-gray-600">Quiz des modules</p>
                          </div>
                        </div>
                        <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-brand-700">
                          Voir les questions <ChevronRight className="size-4 transition group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}</Paginated>
          ) : (
            <EmptyState icon={Library} title="Aucune formation" text="Créez d'abord une formation : vous pourrez ensuite lui ajouter des questions."
              action={<Button to="/formateur/formations/nouvelle"><Plus className="size-4" />Nouvelle formation</Button>} />
          )
        }
      </Async>
    </>
  )
}

/** Les questions d'une formation, par onglet : examen final, puis quiz module par module. */
function CourseQuestions({ course, courses, onBack, onChanged }) {
  const detail = useApi(`/trainer/courses/${course.id}`)
  const modules = detail.data?.modules ?? []
  const state = useApi('/trainer/questions' + qs({ course: course.slug }))
  const [tab, setTab] = useState('exam')
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState(null)
  const [importing, setImporting] = useState(false)
  const [toast, setToast] = useState('')
  const reload = () => { state.reload(); onChanged() }

  const list = state.data ?? []
  const inTab = (x) => (tab === 'exam' ? !x.module : String(x.module?.id) === tab)
  const countFor = (key) => list.filter((x) => (key === 'exam' ? !x.module : String(x.module?.id) === key)).length
  const tabs = [
    { key: 'exam', label: 'Examen final', count: countFor('exam') },
    ...modules.map((m, i) => ({ key: String(m.id), label: `Module ${i + 1}`, title: m.title, count: countFor(String(m.id)) })),
  ]
  const active = tabs.find((t) => t.key === tab) ?? tabs[0]
  const term = q.trim().toLowerCase()
  const shown = list.filter(inTab).filter((x) => !term || x.text.toLowerCase().includes(term))
  const points = list.filter(inTab).reduce((s, x) => s + x.points, 0)

  const remove = async (question) => {
    if (!confirm('Supprimer cette question ? Elle sera retirée des examens qui l’utilisent.')) return
    await api.del(`/trainer/questions/${question.id}`)
    reload()
    setToast('Question supprimée')
  }
  const edit = (x) => setEditing({
    id: x.id, courseId: x.course.id, moduleId: x.module?.id ?? '', type: x.type, text: x.text,
    options: x.options.length ? x.options : ['', '', '', ''], correct: x.correct.length ? x.correct : [0],
    accepted: x.accepted.length ? x.accepted : [''], points: x.points,
  })
  // Nouvelle question : directement dans la formation et l'onglet ouverts
  const create = () => setEditing({ ...blankQuestion(course.id), moduleId: tab === 'exam' ? '' : Number(tab) })

  return (
    <>
      <button type="button" onClick={onBack} className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
        <ChevronLeft className="size-4" />Toutes les formations
      </button>
      <PageHeader title={course.title} subtitle="Indiquez la bonne réponse de chaque question : les quiz et l'examen final sont corrigés automatiquement."
        actions={<>
          <Button variant="outline-gray" onClick={() => setImporting(true)}><FileUp className="size-4" />Importer un document</Button>
          <Button onClick={create}><Plus className="size-4" />Nouvelle question</Button>
        </>} />

      <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="tablist" aria-label="Utilisation des questions">
        {tabs.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={active.key === t.key} onClick={() => { setTab(t.key); setQ('') }} title={t.title}
            className={cx('flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition',
              active.key === t.key ? 'border-brand-600 bg-brand-600 text-white shadow-sm' : 'border-gray-300 bg-white text-gray-700 hover:border-brand-300 hover:text-brand-700')}>
            {t.key === 'exam' ? <ShieldCheck className="size-4" /> : <BookOpen className="size-4" />}
            {t.label}
            <span className={cx('rounded-full px-2 text-xs', active.key === t.key ? 'bg-white/20' : 'bg-gray-100 text-gray-600')}>{t.count}</span>
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h2 className="text-lg font-bold">{active.key === 'exam' ? 'Examen final' : `Quiz – ${active.label} : ${active.title}`}</h2>
            <p className="text-sm text-gray-500">
              {plural(active.count, 'question')} · {plural(points, 'point')}
              {active.key === 'exam' ? ' · donne droit au certificat' : ' · entraînement, non certifiant'}
            </p>
          </div>
          {active.count > 5 && (
            <label className="relative sm:w-72">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} className="input pl-9" placeholder="Rechercher dans cette liste" />
            </label>
          )}
        </div>
        <Async state={state}>
          {() =>
            shown.length ? (
              <Paginated items={shown} resetKey={`${active.key}|${q}`}>{(page) => (
                <ol className="divide-y divide-gray-100">
                  {page.map((x) => (
                    <li key={x.id} className="flex items-start gap-3 p-4 sm:gap-4 sm:px-5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-sm font-bold text-gray-600">{list.filter(inTab).indexOf(x) + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{x.text}</p>
                        <p className="mt-1 flex items-start gap-1.5 text-sm text-brand-800">
                          <Check className="mt-0.5 size-4 shrink-0" /><span><span className="text-gray-500">Bonne réponse :</span> {answerOf(x) || '—'}</span>
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge tone="blue">{QUESTION_TYPES[x.type]}</Badge>
                          <Badge>{plural(x.points, 'pt')}</Badge>
                        </div>
                      </div>
                      <button onClick={() => edit(x)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="Modifier"><Pencil className="size-4" /></button>
                      <button onClick={() => remove(x)} className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600" aria-label="Supprimer"><Trash2 className="size-4" /></button>
                    </li>
                  ))}
                </ol>
              )}</Paginated>
            ) : term ? (
              <p className="p-8 text-center text-gray-600">Aucune question ne contient « {q.trim()} ».</p>
            ) : (
              <EmptyState icon={Library} title={active.key === 'exam' ? "Pas encore de question d'examen" : 'Pas encore de question pour ce quiz'}
                text="Ajoutez-les une par une ou importez un document Word / PDF."
                action={<Button onClick={create}><Plus className="size-4" />Ajouter une question</Button>} />
            )
          }
        </Async>
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Modifier la question' : 'Nouvelle question'} size="lg"
        footer={<><Button variant="outline-gray" onClick={() => setEditing(null)}>Annuler</Button><Button type="submit" form="question-form">Enregistrer</Button></>}>
        {editing && (
          <QuestionForm key={editing.id ?? 'new'} initial={editing} courses={courses}
            onSaved={() => { setEditing(null); reload(); setToast('Question enregistrée') }} />
        )}
      </Modal>
      <ImportQuestionsModal key={course.id} open={importing} onClose={() => setImporting(false)} courses={courses} fixedCourse={course}
        onImported={(r) => { reload(); setToast(`${r.created} question(s) importée(s)${r.addedToExam ? ' et ajoutée(s) à l’examen' : ''}`) }} />
      <Toast message={toast} onDone={() => setToast('')} />
    </>
  )
}

// ---------------------------------------------------------------- Apprenants
function exportCsv(rows) {
  const header = ['Nom', 'Profil', 'Centre', 'Téléphone', 'Formation', 'Modalité', 'Progression (%)', 'Meilleure note', 'Tentatives', "Changements d'onglet"]
  const lines = rows.map((l) => [l.name, PROFILE_LABELS[l.profile] ?? '', l.center ?? '', l.phone ?? '', l.course.title, LEARNING_MODES[l.mode]?.label ?? '', l.progress, l.score ?? '', l.attempts, l.tabSwitches])
  const csv = [header, ...lines].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n')
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `apprenants-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function TrainerLearners() {
  const courses = useApi('/trainer/courses').data ?? []
  const [course, setCourse] = useState('')
  const state = useApi('/trainer/learners' + qs({ course }))
  const [toast, setToast] = useState('')
  // En salle ou en ligne : change la façon de passer l'examen final pour cet apprenant
  const changeMode = async (l, mode) => {
    try {
      await api.patch(`/trainer/enrollments/${l.enrollmentId}/mode`, { mode })
      state.setData((list) => list.map((x) => (x.enrollmentId === l.enrollmentId ? { ...x, mode } : x)))
      setToast(`${l.name} suit désormais « ${l.course.title} » ${mode === 'salle' ? 'en salle' : 'en ligne'}.`)
    } catch (e) {
      setToast(e.message)
    }
  }
  return (
    <>
      <PageHeader title="Mes apprenants" subtitle="Progression, notes et modalité de vos apprenants : en salle (examen sur session, une tentative) ou en ligne (tentatives illimitées)."
        actions={<Button variant="outline-gray" disabled={!state.data?.length} onClick={() => exportCsv(state.data)}><Download className="size-4" />Exporter (Excel / CSV)</Button>} />
      <select value={course} onChange={(e) => setCourse(e.target.value)} className="input mb-4 sm:w-80"><option value="">Toutes mes formations</option>{courses.map((c) => <option key={c.id} value={c.slug}>{c.title}</option>)}</select>
      <Async state={state}>
        {(list) =>
          list.length ? (
            <Paginated items={list} resetKey={course}>{(page) => (
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
                  <tr><th className="px-4 py-3 font-semibold">Apprenant</th><th className="font-semibold">Formation</th><th className="font-semibold">Modalité</th><th className="w-44 font-semibold">Progression</th><th className="font-semibold">Note</th><th className="font-semibold">Tentatives</th><th className="pr-4 font-semibold">Alertes</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {page.map((l) => (
                    <tr key={`${l.id}-${l.course.id}`}>
                      <td className="px-4 py-3"><p className="font-semibold">{l.name}</p><p className="text-xs text-gray-500">{PROFILE_LABELS[l.profile]}{l.status === 'en-attente' ? ' · inscription en attente' : l.status === 'suspendu' ? ' · compte suspendu' : ''}</p></td>
                      <td className="text-gray-700">{l.course.title}</td>
                      <td>
                        <select value={l.mode} onChange={(e) => changeMode(l, e.target.value)} aria-label={`Modalité de ${l.name}`}
                          className={cx('h-9 rounded-lg border px-2 text-sm font-semibold', l.mode === 'salle' ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-brand-200 bg-brand-50 text-brand-800')}>
                          {Object.entries(LEARNING_MODES).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
                        </select>
                      </td>
                      <td><div className="flex items-center gap-2"><ProgressBar value={l.progress} size="sm" className="w-24" /><span className="font-semibold">{l.progress}%</span></div></td>
                      <td>{l.score != null ? <span className="font-bold">{l.score}/100</span> : '—'}</td>
                      <td>{l.attempts}</td>
                      <td className="pr-4">{l.tabSwitches > 0 ? <Badge tone="red"><AlertTriangle className="size-3" />{l.tabSwitches} onglet(s)</Badge> : <span className="text-gray-400">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}</Paginated>
          ) : (
            <EmptyState icon={Users} title="Aucun apprenant pour le moment" />
          )
        }
      </Async>
      <Toast message={toast} onDone={() => setToast('')} />
    </>
  )
}
