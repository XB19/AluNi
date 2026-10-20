import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronDown, Download, FileText, FileUp, ListChecks, XCircle } from 'lucide-react'
import { QUESTION_TYPES } from '../../data/constants'
import { api } from '../../api/client'
import { useApi } from '../../api/useApi'
import { RichContent } from '../../components/RichContent'
import { Badge, Button, cx, Field, FormError, Modal } from '../../components/ui'

const COURSE_FORMATS = '.docx,.doc,.pptx,.ppt,.pdf,.txt'
const QUESTION_FORMATS = '.docx,.pdf,.txt'

function DropZone({ accept, busy, label, hint, onFile }) {
  return (
    <label className={cx('flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/40 p-8 text-center hover:border-brand-500', busy && 'pointer-events-none opacity-60')}>
      <FileUp className="size-9 text-brand-600" />
      <span className="text-base font-bold">{busy ? 'Analyse du document en cours…' : label}</span>
      <span className="text-sm text-gray-600">{hint}</span>
      <input type="file" accept={accept} className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onFile(f) }} />
    </label>
  )
}

function Warnings({ items }) {
  if (!items?.length) return null
  return (
    <ul className="space-y-1.5 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
      {items.map((w) => <li key={w} className="flex gap-2"><AlertTriangle className="mt-0.5 size-4 shrink-0" />{w}</li>)}
    </ul>
  )
}

// ---------------------------------------------------------------- Import d'un cours

/**
 * Transforme un document Word / PowerPoint / PDF en modules et leçons.
 * onApply(patch) reçoit les modifications à appliquer à la formation en cours d'édition.
 */
export function ImportCourseModal({ open, onClose, course, onApply }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [preview, setPreview] = useState(null)
  const [mode, setMode] = useState('replace')
  const [useTitle, setUseTitle] = useState(true)
  const [attach, setAttach] = useState(true)
  const [openLesson, setOpenLesson] = useState(null)
  const hasContent = course.modules.length > 0

  const reset = () => { setPreview(null); setError(null); setOpenLesson(null) }
  const close = () => { reset(); onClose() }

  const analyse = async (file) => {
    setBusy(true)
    reset()
    try {
      const p = await api.upload('/trainer/import/course', file)
      setPreview(p)
      setUseTitle(!course.title?.trim())
      setMode(hasContent ? 'append' : 'replace')
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }

  const apply = () => {
    let modules = preview.modules.map((m) => ({ ...m, lessons: m.lessons.map((l) => ({ ...l })) }))
    if (attach && preview.sourceUrl && modules.length) {
      const isPdf = preview.format === 'pdf'
      modules[0].lessons.unshift({
        title: `Support de cours : ${preview.sourceName}`,
        type: isPdf ? 'pdf' : 'texte',
        duration: '5 min',
        fileUrl: preview.sourceUrl,
        content: '<p>Le document original de la formation est disponible ci-dessus : vous pouvez le consulter ou le télécharger pour le lire hors connexion.</p>',
        practical: false,
      })
    }
    const patch = { modules: mode === 'append' ? [...course.modules, ...modules] : modules }
    if (useTitle) {
      patch.title = preview.title
      if (preview.short) patch.short = preview.short
    }
    onApply(patch, preview.lessonCount)
    close()
  }

  return (
    <Modal open={open} onClose={close} title="Importer un cours depuis un document" size="lg"
      footer={preview ? (
        <><Button variant="outline-gray" onClick={reset}>Choisir un autre fichier</Button><Button onClick={apply}><CheckCircle2 className="size-4" />Utiliser ce contenu</Button></>
      ) : <Button variant="outline-gray" onClick={close}>Fermer</Button>}>
      {!preview ? (
        <div className="space-y-4">
          <p className="text-gray-700">Déposez votre cours au format <strong>Word</strong>, <strong>PowerPoint</strong>, <strong>PDF</strong> ou texte : la plateforme le découpe automatiquement en modules et en leçons, avec le texte, les listes, les tableaux et les images.</p>
          <ul className="space-y-1.5 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
            <li>• <strong>Word</strong> : les titres « Titre 1 » (ou les lignes « Module 1 : … ») deviennent des modules, les « Titre 2 » (ou « Leçon 1.1 : … ») des leçons.</li>
            <li>• <strong>PowerPoint</strong> : chaque diapositive « En-tête de section » ouvre un module, chaque diapositive devient une leçon (avec les notes du présentateur).</li>
            <li>• <strong>PDF</strong> : les titres sont repérés d'après la taille des caractères.</li>
            <li>• Une leçon intitulée « Exercice », « TP » ou « Projet » devient un exercice à rendre.</li>
          </ul>
          <DropZone accept={COURSE_FORMATS} busy={busy} label="Choisir le document du cours" hint="Word (.docx, .doc), PowerPoint (.pptx, .ppt), PDF ou texte – 50 Mo maximum" onFile={analyse} />
          <Button variant="ghost" size="sm" onClick={() => api.download('/trainer/import/templates/cours', 'modele-cours-aluni.docx')}><Download className="size-4" />Télécharger le modèle Word d'un cours</Button>
          <FormError error={error} />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl bg-brand-50 p-4">
            <p className="text-sm font-semibold text-brand-800">Document analysé : {preview.sourceName}</p>
            <p className="mt-1 text-lg font-bold">{preview.title}</p>
            {preview.short && <p className="text-sm text-gray-700">{preview.short}</p>}
            <p className="mt-2 text-sm text-gray-600">{preview.modules.length} module(s) · {preview.lessonCount} leçon(s){preview.imageCount ? ` · ${preview.imageCount} image(s)` : ''}</p>
          </div>
          <Warnings items={preview.warnings} />

          <div className="max-h-80 overflow-y-auto rounded-xl border border-gray-200">
            {preview.modules.map((m, mi) => (
              <div key={mi} className="border-b border-gray-100 last:border-0">
                <p className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 font-bold"><span className="flex size-6 items-center justify-center rounded bg-brand-600 text-xs text-white">{mi + 1}</span>{m.title}</p>
                <ul>
                  {m.lessons.map((l, li) => {
                    const key = `${mi}-${li}`
                    return (
                      <li key={key} className="border-t border-gray-50">
                        <button onClick={() => setOpenLesson(openLesson === key ? null : key)} className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-gray-50">
                          <FileText className="size-4 shrink-0 text-gray-400" />
                          <span className="flex-1">{l.title}</span>
                          {l.practical && <Badge tone="flame">À rendre</Badge>}
                          <span className="text-xs text-gray-500">{l.duration}</span>
                          <ChevronDown className={cx('size-4 text-gray-400 transition', openLesson === key && 'rotate-180')} />
                        </button>
                        {openLesson === key && (
                          <div className="mx-4 mb-3 max-h-60 overflow-y-auto rounded-lg border border-gray-100 p-3 text-sm">
                            {l.content ? <RichContent html={l.content} /> : <p className="text-gray-500">Leçon sans contenu.</p>}
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>

          <div className="space-y-2 rounded-xl border border-gray-200 p-4 text-[15px]">
            {hasContent && (
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2"><input type="radio" checked={mode === 'append'} onChange={() => setMode('append')} className="accent-brand-600" />Ajouter à la suite des modules existants</label>
                <label className="flex items-center gap-2"><input type="radio" checked={mode === 'replace'} onChange={() => setMode('replace')} className="accent-brand-600" />Remplacer tout le contenu actuel</label>
              </div>
            )}
            <label className="flex items-center gap-2"><input type="checkbox" checked={useTitle} onChange={(e) => setUseTitle(e.target.checked)} className="size-4 accent-brand-600" />Utiliser le titre et le résumé du document</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={attach} onChange={(e) => setAttach(e.target.checked)} className="size-4 accent-brand-600" />Joindre le document original (consultable et téléchargeable par les apprenants)</label>
          </div>
          <p className="text-sm text-gray-500">Rien n'est encore enregistré : vous pourrez tout modifier dans l'éditeur avant de cliquer sur « Enregistrer ».</p>
        </div>
      )}
    </Modal>
  )
}

// ---------------------------------------------------------------- Import de questions

function QuestionPreview({ q, index }) {
  return (
    <li className={cx('rounded-xl border p-3', q.error ? 'border-red-200 bg-red-50/50' : 'border-gray-200')}>
      <div className="flex flex-wrap items-start gap-2">
        <span className="text-sm font-bold text-gray-400">{index + 1}.</span>
        <p className="min-w-0 flex-1 text-sm font-semibold">{q.text || <em className="text-gray-400">Énoncé manquant</em>}</p>
        <Badge tone="blue">{QUESTION_TYPES[q.type]}</Badge>
        <Badge>{q.points} pt</Badge>
      </div>
      {q.options.length > 0 && (
        <ul className="mt-2 space-y-1 pl-6 text-sm">
          {q.options.map((o, i) => (
            <li key={i} className={cx('flex items-center gap-2', q.correct.includes(i) ? 'font-semibold text-brand-700' : 'text-gray-600')}>
              {q.correct.includes(i) ? <CheckCircle2 className="size-4" /> : <span className="size-4 text-center text-xs">{String.fromCharCode(97 + i)}</span>}{o}
            </li>
          ))}
        </ul>
      )}
      {q.accepted.length > 0 && <p className="mt-2 pl-6 text-sm text-brand-700">Réponses acceptées : <strong>{q.accepted.join(' · ')}</strong></p>}
      {q.error && <p className="mt-2 flex items-start gap-1.5 pl-6 text-sm font-medium text-red-700"><XCircle className="mt-0.5 size-4 shrink-0" />Ligne {q.line} : {q.error}</p>}
    </li>
  )
}

/**
 * Crée des questions à partir d'un document. courses : formations proposées ; fixedCourse : formation imposée (onglet Examen).
 */
export function ImportQuestionsModal({ open, onClose, courses = [], fixedCourse, onImported }) {
  const [courseId, setCourseId] = useState(fixedCourse?.id ?? courses[0]?.id ?? '')
  const [moduleId, setModuleId] = useState('')
  const [addToExam, setAddToExam] = useState(true)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  useEffect(() => {
    if (!courseId && (fixedCourse?.id ?? courses[0]?.id)) setCourseId(fixedCourse?.id ?? courses[0].id)
  }, [courses, fixedCourse, courseId])
  const course = useApi(open && courseId ? `/trainer/courses/${courseId}` : null)
  const modules = course.data?.modules ?? []
  const competence = course.data?.certTypes?.includes('competence')

  const reset = () => { setFile(null); setPreview(null); setError(null) }
  const close = () => { reset(); onClose() }
  const send = async (dryRun, f = file) => {
    setBusy(true)
    setError(null)
    try {
      const res = await api.upload('/trainer/import/questions', f, {
        courseId, ...(moduleId ? { moduleId } : {}), dryRun: String(dryRun), addToExam: String(!moduleId && addToExam && competence),
      })
      if (dryRun) setPreview(res)
      else {
        onImported(res)
        close()
      }
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={close} title="Importer des questions depuis un document" size="lg"
      footer={preview ? (
        <><Button variant="outline-gray" onClick={reset}>Choisir un autre fichier</Button>
          <Button disabled={!preview.valid || busy} onClick={() => send(false)}><ListChecks className="size-4" />{busy ? 'Création…' : `Créer ${preview.valid} question(s)`}</Button></>
      ) : <Button variant="outline-gray" onClick={close}>Fermer</Button>}>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {!fixedCourse && (
            <Field label="Formation">
              <select value={courseId} onChange={(e) => { setCourseId(e.target.value); setModuleId(''); setPreview(null) }} className="input">
                {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </Field>
          )}
          <Field label="Les questions serviront pour">
            <select value={moduleId} onChange={(e) => { setModuleId(e.target.value); setPreview(null) }} className="input">
              <option value="">L'examen final (banque de questions)</option>
              {modules.map((m, i) => <option key={m.id} value={m.id}>Le quiz du module {i + 1} : {m.title}</option>)}
            </select>
          </Field>
        </div>
        {!moduleId && competence && (
          <label className="flex items-center gap-2 text-[15px]"><input type="checkbox" checked={addToExam} onChange={(e) => setAddToExam(e.target.checked)} className="size-4 accent-brand-600" />Ajouter directement les questions à l'examen final</label>
        )}

        {!preview ? (
          <>
            <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
              <p className="font-semibold text-ink">Comment rédiger le document ?</p>
              <pre className="mt-2 font-sans whitespace-pre-wrap">{`1. Quel élément affiche les informations ?
a) Le clavier
b) L'écran      ← en gras, ou suivi de *, ou ligne « Réponse : b »
c) La souris

2. Une clé USB sert à transporter des fichiers.
Réponse : Vrai

3. Logiciel pour naviguer sur Internet ?
Réponse : navigateur | navigateur web`}</pre>
              <p className="mt-2">Plusieurs bonnes réponses = choix multiples · « (2 points) » pour le barème · « [Pratique] » pour un exercice à rendre.</p>
            </div>
            <DropZone accept={QUESTION_FORMATS} busy={busy} label="Choisir le document des questions" hint="Word (.docx), PDF ou texte" onFile={(f) => { setFile(f); send(true, f) }} />
            <Button variant="ghost" size="sm" onClick={() => api.download('/trainer/import/templates/questions', 'modele-questions-aluni.docx')}><Download className="size-4" />Télécharger le modèle Word des questions</Button>
          </>
        ) : (
          <>
            <div className={cx('rounded-xl p-3 text-sm font-semibold', preview.invalid ? 'bg-amber-50 text-amber-900' : 'bg-brand-50 text-brand-800')}>
              {file?.name} : {preview.valid} question(s) reconnue(s){preview.invalid ? ` · ${preview.invalid} à corriger dans le document (elles seront ignorées)` : ''}
            </div>
            <ol className="max-h-96 space-y-2 overflow-y-auto">
              {preview.questions.map((q, i) => <QuestionPreview key={i} q={q} index={i} />)}
            </ol>
          </>
        )}
        <FormError error={error} />
      </div>
    </Modal>
  )
}
