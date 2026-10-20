import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  ArrowDown, ArrowLeft, ArrowUp, Bold, CheckCircle2, Circle, Eye, FileUp, Heading2, ImagePlus, Italic, Link2, List, Plus, Save, Send, Sparkles, Trash2, Upload,
} from 'lucide-react'
import { CERT_TYPES, LESSON_TYPES, LEVELS, QUESTION_TYPES } from '../../data/constants'
import { api, fileUrl, qs } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useApi } from '../../api/useApi'
import { LESSON_ICONS } from '../public/CourseDetail'
import { CourseCover } from '../../components/CourseCard'
import { RichContent } from '../../components/RichContent'
import { Badge, Button, cx, ErrorState, Field, FormError, Loading, Modal, PageHeader, Tabs, Toast, Toggle } from '../../components/ui'
import { QuestionForm, StatusBadge } from './TrainerPages'
import { ImportCourseModal, ImportQuestionsModal } from './ImportModals'

const BLANK = {
  title: '', short: '', description: '', category: 'bureautique', level: 'Débutant', hours: 10, weeks: 2,
  prerequisites: [''], objectives: [''], skills: [], certTypes: ['competence'], access: 'libre', image: null, modules: [],
}

function FileUpload({ label, accept, onUploaded, children }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const upload = async (file) => {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      onUploaded(await api.upload('/trainer/files', file))
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div>
      <label className={cx('flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 p-5 text-center text-gray-600 hover:border-brand-400', busy && 'pointer-events-none opacity-60')}>
        {children ?? <Upload className="size-7 text-gray-400" />}
        <span className="font-semibold">{busy ? 'Envoi en cours…' : label}</span>
        <input type="file" accept={accept} className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
      </label>
      <div className="mt-2"><FormError error={error} /></div>
    </div>
  )
}

function ListEditor({ label, values, onChange, placeholder }) {
  return (
    <div>
      <p className="label">{label}</p>
      <div className="space-y-2">
        {values.map((p, i) => (
          <div key={i} className="flex gap-2">
            <input value={p} onChange={(e) => onChange(values.map((x, j) => (j === i ? e.target.value : x)))} className="input" placeholder={placeholder} />
            <button type="button" onClick={() => onChange(values.filter((_, j) => j !== i))} className="rounded-lg px-3 text-gray-500 hover:bg-red-50 hover:text-red-600" aria-label="Retirer"><Trash2 className="size-4" /></button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => onChange([...values, ''])} className="mt-2 text-sm font-semibold text-brand-700 hover:underline">+ Ajouter</button>
    </div>
  )
}

function LessonModal({ lesson, onSave, onClose }) {
  const [l, setL] = useState(lesson)
  const [preview, setPreview] = useState(false)
  const area = useRef(null)
  const wrap = (before, after = before.replace('<', '</')) => {
    const el = area.current
    const { selectionStart: s, selectionEnd: e, value } = el
    const next = value.slice(0, s) + before + value.slice(s, e) + after + value.slice(e)
    setL({ ...l, content: next })
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + before.length, e + before.length) })
  }
  const tools = [
    [Bold, 'Gras', () => wrap('<strong>')],
    [Italic, 'Italique', () => wrap('<em>')],
    [Heading2, 'Titre', () => wrap('<h2>')],
    [List, 'Liste', () => wrap('<ul>\n<li>', '</li>\n</ul>')],
    [Link2, 'Lien', () => wrap('<a href="https://">', '</a>')],
  ]
  return (
    <Modal open onClose={onClose} title={lesson.title ? 'Modifier la leçon' : 'Nouvelle leçon'} size="lg"
      footer={<><Button variant="outline-gray" onClick={onClose}>Annuler</Button><Button disabled={!l.title.trim()} onClick={() => onSave(l)}>Enregistrer la leçon</Button></>}>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_180px_120px]">
          <Field label="Titre de la leçon"><input value={l.title} onChange={(e) => setL({ ...l, title: e.target.value })} className="input" autoFocus /></Field>
          <Field label="Type">
            <select value={l.type} onChange={(e) => setL({ ...l, type: e.target.value })} className="input">
              {Object.entries(LESSON_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="Durée"><input value={l.duration ?? ''} onChange={(e) => setL({ ...l, duration: e.target.value })} className="input" placeholder="10 min" /></Field>
        </div>
        {l.type === 'video' && (
          <Field label="Lien de la vidéo" hint="Lien YouTube, ou vidéo déposée ci-dessous. Privilégiez des vidéos courtes (moins de 15 min).">
            <input value={l.videoUrl ?? ''} onChange={(e) => setL({ ...l, videoUrl: e.target.value })} className="input" placeholder="https://www.youtube.com/watch?v=…" />
          </Field>
        )}
        {l.fileUrl ? (
          <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 text-sm">
            <a href={fileUrl(l.fileUrl)} target="_blank" rel="noreferrer" className="flex-1 truncate font-semibold text-brand-700 hover:underline">Fichier joint : {l.fileUrl.split('/').pop()}</a>
            <button onClick={() => setL({ ...l, fileUrl: null })} className="text-red-600 hover:underline">Retirer</button>
          </div>
        ) : (
          <FileUpload label="Joindre un fichier (PDF, image, vidéo, document…)" accept=".pdf,.jpg,.jpeg,.png,.webp,.mp4,.webm,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
            onUploaded={(f) => setL({ ...l, fileUrl: f.url, videoUrl: l.type === 'video' && !l.videoUrl && /\.(mp4|webm)$/i.test(f.url) ? f.url : l.videoUrl })} />
        )}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="label mb-0">Contenu</span>
            <button type="button" onClick={() => setPreview(!preview)} className="flex items-center gap-1 text-sm font-semibold text-brand-700"><Eye className="size-4" />{preview ? 'Modifier' : 'Aperçu'}</button>
          </div>
          {preview ? (
            <div className="min-h-40 rounded-lg border border-gray-200 p-4"><RichContent html={l.content} /></div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-300 focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-100">
              <div className="flex gap-1 border-b border-gray-200 bg-gray-50 p-1.5">
                {tools.map(([Icon, label, fn]) => (
                  <button key={label} type="button" onClick={fn} title={label} aria-label={label} className="rounded p-1.5 text-gray-600 hover:bg-white"><Icon className="size-4" /></button>
                ))}
              </div>
              <textarea ref={area} rows={10} value={l.content ?? ''} onChange={(e) => setL({ ...l, content: e.target.value })} className="w-full resize-y p-3 text-[15px] focus:outline-none"
                placeholder="Rédigez le contenu de la leçon : explications, étapes, exemples… Laissez une ligne vide entre les paragraphes." />
            </div>
          )}
        </div>
        <Toggle checked={!!l.practical} onChange={(v) => setL({ ...l, practical: v })} label="Exercice pratique à rendre"
          description="L'apprenant dépose un fichier (photo, document…) que vous corrigez et notez sur 20." />
      </div>
    </Modal>
  )
}

function ExamTab({ course }) {
  const settings = useApi(`/trainer/courses/${course.id}/exam`)
  const bank = useApi('/trainer/questions' + qs({ course: course.slug }))
  const [s, setS] = useState(null)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)
  const [adding, setAdding] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState('')
  useEffect(() => { if (settings.data) setS(settings.data) }, [settings.data])

  if (!course.certTypes.includes('competence')) {
    return <p className="card p-6 text-gray-600">Cette formation ne délivre qu'une attestation de suivi : aucun examen final n'est nécessaire.</p>
  }
  if (!s || bank.loading) return <Loading />
  const pool = (bank.data ?? []).filter((q) => !q.module && q.type !== 'pratique')
  const set = (patch) => { setS({ ...s, ...patch }); setSaved(false) }

  const save = async () => {
    setError(null)
    try {
      setS(await api.put(`/trainer/courses/${course.id}/exam`, { ...s, opensAt: s.opensAt || null, closesAt: s.closesAt || null }))
      setSaved(true)
    } catch (e) {
      setError(e)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="card p-6">
        <h2 className="mb-4 text-lg font-bold">Paramètres de l'examen final</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Intitulé" className="sm:col-span-2"><input value={s.title} onChange={(e) => set({ title: e.target.value })} className="input" /></Field>
          <Field label="Durée (minutes)"><input type="number" min={5} value={s.durationMin} onChange={(e) => set({ durationMin: +e.target.value })} className="input" /></Field>
          <Field label="Questions par candidat"><input type="number" min={1} value={s.questionCount} onChange={(e) => set({ questionCount: +e.target.value })} className="input" /></Field>
          <Field label="Note minimale (/100)"><input type="number" min={0} max={100} value={s.passMark} onChange={(e) => set({ passMark: +e.target.value })} className="input" /></Field>
          <Field label="Tentatives autorisées"><input type="number" min={1} max={10} value={s.attemptsAllowed} onChange={(e) => set({ attemptsAllowed: +e.target.value })} className="input" /></Field>
          <Field label="Ouverture"><input type="date" value={s.opensAt ?? ''} onChange={(e) => set({ opensAt: e.target.value })} className="input" /></Field>
          <Field label="Fermeture"><input type="date" value={s.closesAt ?? ''} onChange={(e) => set({ closesAt: e.target.value })} className="input" /></Field>
        </div>
        <div className="mt-4 divide-y divide-gray-100">
          <Toggle checked={s.randomize} onChange={(v) => set({ randomize: v })} label="Tirage aléatoire des questions" description="Chaque candidat reçoit des questions et des réponses dans un ordre différent." />
          <Toggle checked={s.showCorrection} onChange={(v) => set({ showCorrection: v })} label="Afficher la correction après l'examen" />
          <Toggle checked={s.roomOnly} onChange={(v) => set({ roomOnly: v })} label="Mode « examen en salle »" description="Examen accessible uniquement depuis les postes de la salle de l'Académie (certification supervisée)." />
          <Toggle checked={s.requiresAdminValidation} onChange={(v) => set({ requiresAdminValidation: v })} label="Certificat soumis à validation de l'administrateur" />
        </div>
        <div className="mt-4"><FormError error={error} /></div>
        <Button className="mt-4" onClick={save}><Save className="size-4" />Enregistrer l'examen</Button>
        {saved && <span className="ml-3 text-sm font-semibold text-brand-700">Enregistré ✓</span>}
      </div>
      <div className="card p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Questions de l'examen</h2>
            <p className="mb-4 text-sm text-gray-600">{s.questionIds.length} question(s) sélectionnée(s) · {Math.min(s.questionCount, s.questionIds.length)} tirée(s) par candidat</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button size="sm" variant="outline-gray" onClick={() => setImporting(true)}><FileUp className="size-4" />Importer (Word, PDF)</Button>
            <Button size="sm" variant="secondary" onClick={() => setAdding(true)}><Plus className="size-4" />Créer</Button>
          </div>
        </div>
        {importMsg && <p className="mb-3 rounded-lg bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-800">{importMsg}</p>}
        {pool.length ? (
          <ul className="space-y-2">
            {pool.map((q) => (
              <li key={q.id}>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-3 hover:bg-gray-50">
                  <input type="checkbox" checked={s.questionIds.includes(q.id)} onChange={() => set({ questionIds: s.questionIds.includes(q.id) ? s.questionIds.filter((x) => x !== q.id) : [...s.questionIds, q.id] })} className="mt-0.5 size-4.5 accent-brand-600" />
                  <span className="flex-1 text-sm">{q.text}<span className="mt-1 block text-xs text-gray-500">{QUESTION_TYPES[q.type]} · {q.points} pt</span></span>
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">Aucune question pour l'examen. Créez-en avec le bouton ci-dessus.</p>
        )}
      </div>
      <Modal open={adding} onClose={() => setAdding(false)} title="Nouvelle question d'examen" size="lg"
        footer={<><Button variant="outline-gray" onClick={() => setAdding(false)}>Annuler</Button><Button type="submit" form="exam-question-form">Enregistrer</Button></>}>
        {adding && (
          <QuestionForm formId="exam-question-form" courses={[course]}
            initial={{ courseId: course.id, moduleId: '', type: 'unique', text: '', options: ['', '', '', ''], correct: [0], accepted: [''], points: 1 }}
            onSaved={(q) => { setAdding(false); bank.reload(); set({ questionIds: [...s.questionIds, q.id] }) }} />
        )}
      </Modal>
      <ImportQuestionsModal open={importing} onClose={() => setImporting(false)} fixedCourse={course}
        onImported={(r) => {
          bank.reload()
          settings.reload()
          setImportMsg(`${r.created} question(s) importée(s)${r.addedToExam ? ' et ajoutée(s) à l’examen' : ''}.`)
        }} />
    </div>
  )
}

export default function CourseEditor() {
  const { id } = useParams()
  const isNew = id === 'nouvelle'
  const navigate = useNavigate()
  const { user } = useAuth()
  const base = user?.role === 'admin' ? '/admin/formations' : '/formateur/formations'
  const loaded = useApi(isNew ? null : `/trainer/courses/${id}`)
  const categories = useApi('/categories').data ?? []
  const [c, setC] = useState(isNew ? BLANK : null)
  const [dirty, setDirty] = useState(false)
  const [tab, setTab] = useState('infos')
  const [editing, setEditing] = useState(null) // { mi, li }
  const [toast, setToast] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  useEffect(() => {
    if (loaded.data) {
      setC({ ...loaded.data, prerequisites: loaded.data.prerequisites.length ? loaded.data.prerequisites : [''], objectives: loaded.data.objectives.length ? loaded.data.objectives : [''] })
      setDirty(false)
    }
  }, [loaded.data])

  if (!isNew && loaded.loading && !c) return <Loading />
  if (loaded.error) return <ErrorState error={loaded.error} onRetry={loaded.reload} />
  if (!c) return null

  const update = (patch) => { setC({ ...c, ...patch }); setDirty(true) }
  const set = (k) => (e) => update({ [k]: e.target.value })
  const setModules = (modules) => update({ modules })
  const moveModule = (i, d) => {
    const m = [...c.modules]
    ;[m[i], m[i + d]] = [m[i + d], m[i]]
    setModules(m)
  }
  const saveLesson = (lesson) => {
    const { mi, li } = editing
    setModules(c.modules.map((m, i) => (i !== mi ? m : { ...m, lessons: li == null ? [...m.lessons, lesson] : m.lessons.map((x, j) => (j === li ? lesson : x)) })))
    setEditing(null)
  }

  const save = async () => {
    setBusy(true)
    setError(null)
    try {
      const body = { ...c, hours: Number(c.hours), weeks: Number(c.weeks) }
      const res = isNew ? await api.post('/trainer/courses', body) : await api.put(`/trainer/courses/${c.id}`, body)
      setDirty(false)
      setToast('Formation enregistrée')
      if (isNew) navigate(`${base}/${res.id}`, { replace: true })
      else setC({ ...res, prerequisites: res.prerequisites.length ? res.prerequisites : [''], objectives: res.objectives.length ? res.objectives : [''] })
      return res
    } catch (e) {
      setError(e)
      return null
    } finally {
      setBusy(false)
    }
  }

  const submit = async () => {
    if (dirty && !(await save())) return
    setError(null)
    try {
      const res = await api.post(`/trainer/courses/${c.id}/submit`)
      setC({ ...c, status: res.status, reviewComment: null })
      setToast("Formation soumise à l'administration")
    } catch (e) {
      setError(e)
    }
  }

  const lessonsTotal = c.modules.reduce((n, m) => n + m.lessons.length, 0)
  const checks = [
    { ok: c.title.trim().length > 5 && (c.short ?? '').trim().length > 0, label: 'Titre et résumé renseignés' },
    { ok: c.modules.length > 0, label: 'Au moins un module' },
    { ok: lessonsTotal > 0, label: 'Au moins une leçon' },
    { ok: !dirty, label: 'Modifications enregistrées' },
  ]
  const category = categories.find((x) => x.id === c.category)

  return (
    <>
      <Link to={base} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"><ArrowLeft className="size-4" />{user?.role === 'admin' ? 'Formations' : 'Mes formations'}</Link>
      <PageHeader
        title={isNew ? 'Nouvelle formation' : c.title || 'Formation sans titre'}
        subtitle={isNew ? 'Renseignez les informations puis ajoutez vos modules et leçons.' : <span className="flex items-center gap-2">Statut : <StatusBadge status={c.status} />{dirty && <Badge tone="amber">Modifications non enregistrées</Badge>}</span>}
        actions={<>
          <Button variant="outline-gray" onClick={() => setImportOpen(true)}><FileUp className="size-4" />Importer un document</Button>
          <Button onClick={save} disabled={busy || (!dirty && !isNew)}><Save className="size-4" />{busy ? 'Enregistrement…' : 'Enregistrer'}</Button>
        </>}
      />
      {c.status === 'refusee' && c.reviewComment && <p className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-800"><strong>À revoir :</strong> {c.reviewComment}</p>}
      <FormError error={error} />
      <Tabs className="mt-2 mb-6" value={tab} onChange={setTab} tabs={[
        { value: 'infos', label: '1. Informations' },
        { value: 'contenu', label: '2. Contenu', count: c.modules.length },
        { value: 'examen', label: '3. Examen' },
        { value: 'publication', label: '4. Publication' },
      ]} />

      {c.modules.length === 0 && (
        <button onClick={() => setImportOpen(true)} className="mb-6 flex w-full items-center gap-4 rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/50 p-5 text-left hover:border-brand-500">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white"><Sparkles className="size-6" /></span>
          <span className="flex-1">
            <span className="block font-bold">Vous avez déjà votre cours en Word, PowerPoint ou PDF ?</span>
            <span className="text-sm text-gray-600">Importez-le : la plateforme crée automatiquement les modules et les leçons. Vous n'aurez plus qu'à vérifier.</span>
          </span>
          <span className="hidden font-semibold text-brand-700 sm:block">Importer →</span>
        </button>
      )}

      {tab === 'infos' && (
        <div className="card grid gap-5 p-6 lg:grid-cols-2">
          <Field label="Titre de la formation" className="lg:col-span-2" error={error?.fields?.title}><input value={c.title} onChange={set('title')} className="input" placeholder="Ex. : Excel pour la gestion" /></Field>
          <Field label="Résumé (une phrase)" className="lg:col-span-2"><input value={c.short ?? ''} onChange={set('short')} maxLength={500} className="input" /></Field>
          <Field label="Description détaillée" className="lg:col-span-2"><textarea value={c.description ?? ''} onChange={set('description')} rows={5} className="input" /></Field>
          <Field label="Domaine"><select value={c.category} onChange={set('category')} className="input">{categories.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
          <Field label="Niveau"><select value={c.level} onChange={set('level')} className="input">{LEVELS.map((l) => <option key={l}>{l}</option>)}</select></Field>
          <Field label="Durée totale (heures)"><input type="number" min={1} value={c.hours} onChange={set('hours')} className="input" /></Field>
          <Field label="Durée conseillée (semaines)"><input type="number" min={1} value={c.weeks} onChange={set('weeks')} className="input" /></Field>
          <div className="lg:col-span-2"><ListEditor label="Ce que l'apprenant va apprendre" values={c.objectives} onChange={(v) => update({ objectives: v })} placeholder="Ex. : Créer un tableau" /></div>
          <ListEditor label="Prérequis" values={c.prerequisites} onChange={(v) => update({ prerequisites: v })} placeholder="Ex. : Savoir utiliser un ordinateur" />
          <Field label="Compétences (séparées par une virgule)">
            <input value={c.skills.join(', ')} onChange={(e) => update({ skills: e.target.value.split(',').map((s) => s.trimStart()) })} className="input" placeholder="Excel, Formules, Graphiques" />
          </Field>
          <fieldset>
            <legend className="label">Certification délivrée</legend>
            {Object.entries(CERT_TYPES).map(([k, v]) => (
              <label key={k} className="flex items-center gap-3 py-1.5 text-[15px]">
                <input type="checkbox" checked={c.certTypes.includes(k)} onChange={() => update({ certTypes: c.certTypes.includes(k) ? c.certTypes.filter((x) => x !== k) : [...c.certTypes, k] })} className="size-4.5 accent-brand-600" />{v.label}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend className="label">Mode d'inscription</legend>
            {[['libre', 'Libre (accès immédiat)'], ['validation', "Soumise à validation de l'Académie"]].map(([k, v]) => (
              <label key={k} className="flex items-center gap-3 py-1.5 text-[15px]">
                <input type="radio" name="access" checked={c.access === k} onChange={() => update({ access: k })} className="size-4.5 accent-brand-600" />{v}
              </label>
            ))}
          </fieldset>
          <div className="lg:col-span-2">
            <p className="label">Image de couverture</p>
            <div className="grid gap-4 sm:grid-cols-[240px_1fr]">
              <CourseCover course={{ ...c, categoryColor: category?.color, categoryIcon: category?.icon }} className="aspect-[16/9] rounded-xl" />
              <div>
                <FileUpload label="Choisir une image (format paysage conseillé)" accept="image/*" onUploaded={(f) => update({ image: f.url })}><ImagePlus className="size-7 text-gray-400" /></FileUpload>
                {c.image && <button onClick={() => update({ image: null })} className="mt-1 text-sm text-red-600 hover:underline">Retirer l'image</button>}
              </div>
            </div>
          </div>
          <div className="flex gap-3 lg:col-span-2">
            <Button onClick={() => setTab('contenu')} variant="outline-gray">Continuer vers le contenu</Button>
          </div>
        </div>
      )}

      {tab === 'contenu' && (
        <div className="space-y-4">
          {c.modules.map((m, mi) => (
            <div key={m.id ?? `new-${mi}`} className="card overflow-hidden">
              <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50 px-4 py-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">{mi + 1}</span>
                <input value={m.title} onChange={(e) => setModules(c.modules.map((x, i) => (i === mi ? { ...x, title: e.target.value } : x)))} className="min-w-0 flex-1 rounded-md bg-transparent px-2 py-1 font-bold focus:bg-white focus:ring-2 focus:ring-brand-200 focus:outline-none" aria-label="Titre du module" />
                <button disabled={mi === 0} onClick={() => moveModule(mi, -1)} className="rounded p-1.5 text-gray-500 hover:bg-white disabled:opacity-30" aria-label="Monter"><ArrowUp className="size-4" /></button>
                <button disabled={mi === c.modules.length - 1} onClick={() => moveModule(mi, 1)} className="rounded p-1.5 text-gray-500 hover:bg-white disabled:opacity-30" aria-label="Descendre"><ArrowDown className="size-4" /></button>
                <button onClick={() => confirm('Supprimer ce module et ses leçons ?') && setModules(c.modules.filter((_, i) => i !== mi))} className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600" aria-label="Supprimer le module"><Trash2 className="size-4" /></button>
              </div>
              <ul className="divide-y divide-gray-100">
                {m.lessons.map((l, li) => {
                  const Icon = LESSON_ICONS[l.type]
                  return (
                    <li key={l.id ?? `new-${li}`} className="flex items-center gap-3 px-4 py-3">
                      <Icon className="size-4.5 shrink-0 text-gray-400" />
                      <button onClick={() => setEditing({ mi, li })} className="min-w-0 flex-1 truncate text-left text-[15px] hover:text-brand-700">{l.title}</button>
                      {l.practical && <Badge tone="flame">À rendre</Badge>}
                      <span className="hidden text-sm text-gray-500 sm:inline">{LESSON_TYPES[l.type]}{l.duration ? ` · ${l.duration}` : ''}</span>
                      <button disabled={li === 0} onClick={() => setModules(c.modules.map((x, i) => { if (i !== mi) return x; const ls = [...x.lessons]; [ls[li - 1], ls[li]] = [ls[li], ls[li - 1]]; return { ...x, lessons: ls } }))} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30" aria-label="Monter la leçon"><ArrowUp className="size-4" /></button>
                      <button onClick={() => setModules(c.modules.map((x, i) => (i === mi ? { ...x, lessons: x.lessons.filter((_, j) => j !== li) } : x)))} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" aria-label="Supprimer la leçon"><Trash2 className="size-4" /></button>
                    </li>
                  )
                })}
              </ul>
              <div className="flex flex-wrap gap-2 px-4 py-3">
                <Button size="sm" variant="secondary" onClick={() => setEditing({ mi, li: null })}><Plus className="size-4" />Ajouter une leçon</Button>
                {m.id && <Button size="sm" variant="ghost" to="/formateur/questions">Quiz du module</Button>}
              </div>
            </div>
          ))}
          <button onClick={() => setModules([...c.modules, { title: `Module ${c.modules.length + 1}`, lessons: [] }])} className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 py-5 font-semibold text-gray-600 hover:border-brand-400 hover:text-brand-700">
            <Plus className="size-5" />Ajouter un module
          </button>
          {dirty && <Button onClick={save} disabled={busy}><Save className="size-4" />Enregistrer le contenu</Button>}
        </div>
      )}

      {tab === 'examen' && (isNew ? <p className="card p-6 text-gray-600">Enregistrez d'abord la formation pour configurer son examen final.</p> : <ExamTab course={c} />)}

      {tab === 'publication' && (
        <div className="card max-w-2xl p-6">
          {c.status === 'en-validation' ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="mx-auto size-14 text-brand-600" />
              <h2 className="mt-4 text-xl font-bold">Formation en cours de validation</h2>
              <p className="mt-2 text-gray-600">L'administrateur va vérifier votre formation avant sa publication dans le catalogue. Vous serez notifié de sa décision.</p>
            </div>
          ) : c.status === 'publiee' ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="mx-auto size-14 text-brand-600" />
              <h2 className="mt-4 text-xl font-bold">Formation publiée</h2>
              <p className="mt-2 text-gray-600">Elle est visible dans le catalogue. Vos modifications sont appliquées dès leur enregistrement, et les apprenants sont prévenus des nouvelles leçons.</p>
              <Button to={`/formations/${c.slug}`} variant="outline" className="mt-5"><Eye className="size-4" />Voir dans le catalogue</Button>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-bold">Prête pour la publication ?</h2>
              <p className="mt-1 text-gray-600">Vérifiez les points suivants avant de soumettre la formation à l'administration de l'Académie.</p>
              <ul className="mt-5 space-y-3">
                {checks.map((ch) => (
                  <li key={ch.label} className={cx('flex items-center gap-3', ch.ok ? 'text-ink' : 'text-gray-500')}>
                    {ch.ok ? <CheckCircle2 className="size-5 text-brand-600" /> : <Circle className="size-5 text-gray-300" />}{ch.label}
                  </li>
                ))}
                {c.certTypes.includes('competence') && (
                  <li className="flex items-center gap-3 text-gray-500"><Circle className="size-5 text-gray-300" />Examen final configuré avec ses questions (onglet 3)</li>
                )}
              </ul>
              <Button className="mt-6" disabled={isNew || !checks.slice(0, 3).every((ch) => ch.ok)} onClick={submit}><Send className="size-4" />Soumettre pour publication</Button>
            </>
          )}
        </div>
      )}

      <ImportCourseModal open={importOpen} onClose={() => setImportOpen(false)} course={c}
        onApply={(patch, lessons) => {
          update(patch)
          setTab('contenu')
          setToast(`${lessons} leçon(s) importée(s) : vérifiez le contenu puis enregistrez.`)
        }} />

      {editing && (
        <LessonModal
          lesson={editing.li == null ? { title: '', type: 'texte', duration: '10 min', content: '', practical: false } : c.modules[editing.mi].lessons[editing.li]}
          onSave={saveLesson}
          onClose={() => setEditing(null)}
        />
      )}
      <Toast message={toast} onDone={() => setToast('')} />
    </>
  )
}
