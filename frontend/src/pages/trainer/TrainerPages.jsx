import { useState } from 'react'
import { Link } from 'react-router'
import {
  AlertTriangle, BookOpen, CheckCircle2, Download, Eye, FileCheck, FileUp, Library, Pencil, Plus, Search, ShieldAlert, Trash2, TrendingUp, Users,
} from 'lucide-react'
import { COURSE_STATUS, PROFILE_LABELS, QUESTION_TYPES, formatDate } from '../../data/constants'
import { api, qs } from '../../api/client'
import { useApi } from '../../api/useApi'
import { CourseCover } from '../../components/CourseCard'
import { Async, Badge, Button, cx, EmptyState, Field, FormError, Modal, PageHeader, ProgressBar, StatCard, Toast } from '../../components/ui'
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
        {({ stats, courses, alerts, toGrade }) => (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard icon={Users} label="Apprenants inscrits" value={stats.learners} hint={`+${stats.newThisMonth} ces 30 derniers jours`} />
              <StatCard icon={BookOpen} label="Formations publiées" value={stats.published} hint={stats.inValidation ? `${stats.inValidation} en validation` : null} tone="blue" />
              <StatCard icon={TrendingUp} label="Taux de réussite" value={stats.successRate != null ? `${stats.successRate} %` : '—'} hint="Examens finaux" tone="gold" />
              <StatCard icon={FileCheck} label="Épreuves à corriger" value={stats.toGrade} tone="flame" />
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
                          <Badge tone="red">{a.tabSwitches} onglet(s)</Badge>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-600">Aucun comportement suspect signalé.</p>
                  )}
                </section>
                <section className="card p-5">
                  <h2 className="mb-3 text-lg font-bold">À corriger</h2>
                  {toGrade.length ? (
                    <>
                      {toGrade.map((s) => (
                        <div key={s.id} className="border-b border-gray-100 py-2.5 text-sm last:border-0">
                          <p className="font-semibold">{s.learner}</p>
                          <p className="text-gray-600">{s.task}</p>
                        </div>
                      ))}
                      <Button to="/formateur/corrections" size="sm" variant="secondary" className="mt-3">Corriger maintenant</Button>
                    </>
                  ) : (
                    <p className="text-sm text-gray-600">Aucune épreuve en attente. 👍</p>
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
      <PageHeader title="Mes formations" subtitle="Créez, modifiez et soumettez vos formations pour publication." actions={<Button to="/formateur/formations/nouvelle"><Plus className="size-4" />Nouvelle formation</Button>} />
      <Async state={state}>
        {(courses) => (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {courses.map((c) => (
              <div key={c.id} className="card overflow-hidden">
                <CourseCover course={c} className="aspect-[16/8]" />
                <div className="p-5">
                  <StatusBadge status={c.status} />
                  <h3 className="mt-2 font-bold">{c.title}</h3>
                  <p className="mt-1 text-sm text-gray-500">{c.modules} modules · {c.lessons} leçons · {c.enrolled} apprenant{c.enrolled > 1 ? 's' : ''}</p>
                  {c.status === 'refusee' && c.reviewComment && <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-800">Motif : {c.reviewComment}</p>}
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
      {q.type === 'pratique' && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Exercice corrigé manuellement : marquez une leçon comme « exercice pratique » dans l'éditeur de formation pour que les apprenants déposent leur fichier.</p>}
      <FormError error={error} />
    </form>
  )
}

export function QuestionBank() {
  const courses = useApi('/trainer/courses').data ?? []
  const [course, setCourse] = useState('')
  const [type, setType] = useState('')
  const [q, setQ] = useState('')
  const state = useApi('/trainer/questions' + qs({ course, type, q }))
  const [editing, setEditing] = useState(null)
  const [importing, setImporting] = useState(false)
  const [toast, setToast] = useState('')

  const remove = async (question) => {
    if (!confirm('Supprimer cette question ? Elle sera retirée des examens qui l’utilisent.')) return
    await api.del(`/trainer/questions/${question.id}`)
    state.reload()
    setToast('Question supprimée')
  }

  return (
    <>
      <PageHeader title="Banque de questions" subtitle="Les questions servent à composer vos examens et quiz d'entraînement."
        actions={<>
          <Button variant="outline-gray" onClick={() => setImporting(true)} disabled={!courses.length}><FileUp className="size-4" />Importer un document</Button>
          <Button onClick={() => setEditing(blankQuestion(courses[0]?.id ?? ''))} disabled={!courses.length}><Plus className="size-4" />Nouvelle question</Button>
        </>} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} className="input pl-9" placeholder="Rechercher une question" />
        </label>
        <select value={course} onChange={(e) => setCourse(e.target.value)} className="input sm:w-64"><option value="">Toutes les formations</option>{courses.map((c) => <option key={c.id} value={c.slug}>{c.title}</option>)}</select>
        <select value={type} onChange={(e) => setType(e.target.value)} className="input sm:w-56"><option value="">Tous les types</option>{Object.entries(QUESTION_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      </div>
      <Async state={state}>
        {(list) =>
          list.length ? (
            <div className="card divide-y divide-gray-100">
              {list.map((x) => (
                <div key={x.id} className="flex items-start gap-4 p-4">
                  <Library className="mt-0.5 size-5 shrink-0 text-gray-400" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{x.text}</p>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      <Badge tone={x.type === 'pratique' ? 'flame' : 'blue'}>{QUESTION_TYPES[x.type]}</Badge>
                      <Badge>{x.course.title}</Badge>
                      <Badge tone={x.module ? 'gold' : 'green'}>{x.module ? `Quiz : ${x.module.title}` : 'Examen final'}</Badge>
                      <Badge>{x.points} pt</Badge>
                    </div>
                  </div>
                  <button onClick={() => setEditing({
                    id: x.id, courseId: x.course.id, moduleId: x.module?.id ?? '', type: x.type, text: x.text,
                    options: x.options.length ? x.options : ['', '', '', ''], correct: x.correct.length ? x.correct : [0],
                    accepted: x.accepted.length ? x.accepted : [''], points: x.points,
                  })} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="Modifier"><Pencil className="size-4" /></button>
                  <button onClick={() => remove(x)} className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600" aria-label="Supprimer"><Trash2 className="size-4" /></button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Library} title="Aucune question" text="Ajoutez des questions pour composer vos examens." />
          )
        }
      </Async>
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Modifier la question' : 'Nouvelle question'} size="lg"
        footer={<><Button variant="outline-gray" onClick={() => setEditing(null)}>Annuler</Button><Button type="submit" form="question-form">Enregistrer</Button></>}>
        {editing && (
          <QuestionForm key={editing.id ?? 'new'} initial={editing} courses={courses}
            onSaved={() => { setEditing(null); state.reload(); setToast('Question enregistrée') }} />
        )}
      </Modal>
      <ImportQuestionsModal open={importing} onClose={() => setImporting(false)} courses={courses}
        onImported={(r) => { state.reload(); setToast(`${r.created} question(s) importée(s)${r.addedToExam ? ' et ajoutée(s) à l’examen' : ''}`) }} />
      <Toast message={toast} onDone={() => setToast('')} />
    </>
  )
}

// ---------------------------------------------------------------- Apprenants
function exportCsv(rows) {
  const header = ['Nom', 'Profil', 'Centre', 'Téléphone', 'Formation', 'Progression (%)', 'Meilleure note', 'Tentatives', "Changements d'onglet"]
  const lines = rows.map((l) => [l.name, PROFILE_LABELS[l.profile] ?? '', l.center ?? '', l.phone ?? '', l.course.title, l.progress, l.score ?? '', l.attempts, l.tabSwitches])
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
  return (
    <>
      <PageHeader title="Mes apprenants" subtitle="Progression, notes et tentatives de vos apprenants."
        actions={<Button variant="outline-gray" disabled={!state.data?.length} onClick={() => exportCsv(state.data)}><Download className="size-4" />Exporter (Excel / CSV)</Button>} />
      <select value={course} onChange={(e) => setCourse(e.target.value)} className="input mb-4 sm:w-80"><option value="">Toutes mes formations</option>{courses.map((c) => <option key={c.id} value={c.slug}>{c.title}</option>)}</select>
      <Async state={state}>
        {(list) =>
          list.length ? (
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
                  <tr><th className="px-4 py-3 font-semibold">Apprenant</th><th className="font-semibold">Formation</th><th className="w-44 font-semibold">Progression</th><th className="font-semibold">Note</th><th className="font-semibold">Tentatives</th><th className="pr-4 font-semibold">Alertes</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {list.map((l) => (
                    <tr key={`${l.id}-${l.course.id}`}>
                      <td className="px-4 py-3"><p className="font-semibold">{l.name}</p><p className="text-xs text-gray-500">{PROFILE_LABELS[l.profile]}{l.status === 'en-attente' ? ' · inscription en attente' : l.status === 'suspendu' ? ' · compte suspendu' : ''}</p></td>
                      <td className="text-gray-700">{l.course.title}</td>
                      <td><div className="flex items-center gap-2"><ProgressBar value={l.progress} size="sm" className="w-24" /><span className="font-semibold">{l.progress}%</span></div></td>
                      <td>{l.score != null ? <span className="font-bold">{l.score}/100</span> : '—'}</td>
                      <td>{l.attempts}</td>
                      <td className="pr-4">{l.tabSwitches > 0 ? <Badge tone="red"><AlertTriangle className="size-3" />{l.tabSwitches} onglet(s)</Badge> : <span className="text-gray-400">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={Users} title="Aucun apprenant pour le moment" />
          )
        }
      </Async>
    </>
  )
}

// ---------------------------------------------------------------- Corrections
export function Grading() {
  const state = useApi('/trainer/submissions')
  const [current, setCurrent] = useState(null)
  const [grade, setGrade] = useState('')
  const [comment, setComment] = useState('')
  const [error, setError] = useState(null)
  const [toast, setToast] = useState('')
  const [tab, setTab] = useState('a-corriger')

  const open = (s) => {
    setCurrent(s)
    setGrade(s.grade ?? '')
    setComment(s.comment ?? '')
    setError(null)
  }
  const save = async (e) => {
    e.preventDefault()
    try {
      await api.post(`/trainer/submissions/${current.id}/grade`, { grade: Number(grade), comment })
      setCurrent(null)
      state.reload()
      setToast("Note enregistrée, l'apprenant a été notifié")
    } catch (err) {
      setError(err)
    }
  }
  const download = (s) => api.download(`/submissions/${s.id}/file`, s.fileName).catch((e) => setToast(e.message))

  return (
    <>
      <PageHeader title="Corrections" subtitle="Corrigez les exercices pratiques déposés par vos apprenants." />
      <div className="mb-4 flex gap-2">
        {[['a-corriger', 'À corriger'], ['corrige', 'Corrigés']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={cx('rounded-full border px-4 py-2 text-sm font-semibold', tab === k ? 'border-brand-600 bg-brand-600 text-white' : 'border-gray-300 text-gray-700')}>{l}</button>
        ))}
      </div>
      <Async state={state}>
        {(items) => {
          const list = items.filter((s) => s.status === tab)
          return list.length ? (
            <div className="card divide-y divide-gray-100">
              {list.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center gap-4 p-4">
                  <FileCheck className="size-8 shrink-0 text-gray-400" />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{s.task}</p>
                    <p className="text-sm text-gray-600">{s.learner} · {s.course.title} · déposé le {formatDate(s.date)}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => download(s)}><Download className="size-4" />{s.fileName}</Button>
                  {s.status === 'corrige' ? (
                    <button onClick={() => open(s)}><Badge tone="green"><CheckCircle2 className="size-3.5" />{s.grade}/20</Badge></button>
                  ) : (
                    <Button size="sm" onClick={() => open(s)}>Corriger</Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={FileCheck} title={tab === 'a-corriger' ? 'Aucun travail à corriger' : 'Aucun travail corrigé'} />
          )
        }}
      </Async>
      <Modal open={!!current} onClose={() => setCurrent(null)} title="Corriger l'exercice"
        footer={<><Button variant="outline-gray" onClick={() => setCurrent(null)}>Annuler</Button><Button type="submit" form="grade-form">Valider la note</Button></>}>
        {current && (
          <form id="grade-form" className="space-y-4" onSubmit={save}>
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="font-semibold">{current.learner}</p>
              <p className="text-sm text-gray-600">{current.task}</p>
              <button type="button" onClick={() => download(current)} className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"><Download className="size-4" />{current.fileName}</button>
            </div>
            <Field label="Note sur 20"><input type="number" min={0} max={20} required value={grade} onChange={(e) => setGrade(e.target.value)} className="input w-32" /></Field>
            <Field label="Commentaire pour l'apprenant"><textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} className="input" placeholder="Points forts, points à améliorer…" /></Field>
            <FormError error={error} />
          </form>
        )}
      </Modal>
      <Toast message={toast} onDone={() => setToast('')} />
    </>
  )
}
