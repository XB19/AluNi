import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import {
  Award, Ban, BookOpen, Check, CheckCircle2, Download, Eye, FileSpreadsheet, Inbox, Mail, Pencil, Phone, Plus, Search, Trash2, TrendingUp, Upload,
  UserCheck, Users, X,
} from 'lucide-react'
import { CERT_TYPES, COURSE_STATUS, PROFILE_LABELS, ROLE_LABELS, STATUS_LABELS, formatDate, formatDateTime } from '../../data/constants'
import { api, fileUrl, qs } from '../../api/client'
import { useApi } from '../../api/useApi'
import { useSettings } from '../../context/SettingsContext'
import { CATEGORY_COLORS, CATEGORY_ICON_NAMES, CategoryIcon } from '../../components/CourseCard'
import { BarList, ColumnChart } from '../../components/Charts'
import Certificate, { TEMPLATES } from '../../components/Certificate'
import { Async, Avatar, Badge, Button, cx, EmptyState, Field, FormError, Modal, PageHeader, StatCard, Tabs, Toast } from '../../components/ui'

const STATUS_TONES = { actif: 'green', 'en-attente': 'amber', suspendu: 'red', refuse: 'gray' }

/** Exécute une action et affiche un message de succès ou l'erreur. */
function useAction() {
  const [toast, setToast] = useState('')
  const run = async (fn, success) => {
    try {
      await fn()
      if (success) setToast(success)
      return true
    } catch (e) {
      setToast(e.message)
      return false
    }
  }
  return { run, toastEl: <Toast message={toast} onDone={() => setToast('')} /> }
}

// ---------------------------------------------------------------- Tableau de bord
export function AdminDashboard() {
  const state = useApi('/admin/dashboard')
  return (
    <>
      <PageHeader title="Tableau de bord" subtitle="Vue d'ensemble de l'Académie" actions={<Button to="/admin/statistiques" variant="outline-gray"><Download className="size-4" />Rapports</Button>} />
      <Async state={state}>
        {({ stats, monthly, profiles, pendingTrainers, pendingCourses, latestCertificates }) => (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard icon={Users} label="Apprenants inscrits" value={stats.learners} hint={`+${stats.learnersThisMonth} ce mois-ci`} />
              <StatCard icon={BookOpen} label="Formations actives" value={stats.activeCourses} hint={stats.pendingCourses ? `${stats.pendingCourses} en attente de validation` : null} tone="blue" />
              <StatCard icon={TrendingUp} label="Taux de réussite" value={stats.successRate != null ? `${stats.successRate} %` : '—'} hint="Examens finaux" tone="gold" />
              <StatCard icon={Award} label="Certificats délivrés" value={stats.certificates} hint={stats.revoked ? `dont ${stats.revoked} révoqué(s)` : null} tone="flame" />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
              <section className="card p-5 sm:p-6">
                <h2 className="text-lg font-bold">Nouveaux apprenants par mois</h2>
                <p className="mb-5 text-sm text-gray-500">Année {new Date().getFullYear()}</p>
                <ColumnChart data={monthly} label="Nouveaux apprenants par mois" />
              </section>
              <section className="card p-5 sm:p-6">
                <h2 className="text-lg font-bold">Apprenants par profil</h2>
                <p className="mb-5 text-sm text-gray-500">Répartition des {stats.learners} inscrits</p>
                <BarList data={profiles} />
              </section>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <section className="card p-5 sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold">En attente de validation</h2>
                  <Link to="/admin/validations" className="text-sm font-bold text-brand-700 hover:underline">Tout voir</Link>
                </div>
                {pendingTrainers.length + pendingCourses.length ? (
                  <ul className="divide-y divide-gray-100">
                    {pendingTrainers.map((t) => (
                      <li key={`t${t.id}`} className="flex items-center gap-3 py-3">
                        <Avatar name={t.name} size="sm" />
                        <div className="min-w-0 flex-1"><p className="font-semibold">{t.name}</p><p className="truncate text-sm text-gray-500">Formateur · {t.speciality}</p></div>
                        <Badge tone="amber">Compte</Badge>
                      </li>
                    ))}
                    {pendingCourses.map((c) => (
                      <li key={`c${c.id}`} className="flex items-center gap-3 py-3">
                        <span className="flex size-8 items-center justify-center rounded-full bg-blue-50 text-blue-700"><BookOpen className="size-4" /></span>
                        <div className="min-w-0 flex-1"><p className="truncate font-semibold">{c.title}</p><p className="text-sm text-gray-500">par {c.trainer}</p></div>
                        <Badge tone="blue">Formation</Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-600">Rien à valider pour le moment. 👍</p>
                )}
              </section>
              <section className="card p-5 sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold">Derniers certificats</h2>
                  <Link to="/admin/certificats" className="text-sm font-bold text-brand-700 hover:underline">Gérer</Link>
                </div>
                <ul className="divide-y divide-gray-100">
                  {latestCertificates.map((c) => (
                    <li key={c.code} className="flex items-center gap-3 py-3">
                      <Award className={cx('size-6 shrink-0', c.status === 'revoque' ? 'text-red-400' : 'text-gold-500')} />
                      <div className="min-w-0 flex-1"><p className="truncate font-semibold">{c.name}</p><p className="truncate text-sm text-gray-500">{c.course.title}</p></div>
                      <span className="text-xs text-gray-500">{formatDate(c.date, { day: 'numeric', month: 'short' })}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </>
        )}
      </Async>
    </>
  )
}

// ---------------------------------------------------------------- Utilisateurs
function downloadCsv(name, rows) {
  const csv = rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n')
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

function CredentialsList({ accounts }) {
  return (
    <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 p-4">
      <p className="text-sm font-bold text-brand-900">Identifiants provisoires ({accounts.length})</p>
      <p className="text-xs text-brand-900/70">Ils ont été envoyés par SMS / e-mail. Notez-les maintenant : ils ne seront plus affichés.</p>
      <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto text-sm">
        {accounts.map((a) => (
          <li key={a.id} className="flex justify-between gap-3 rounded bg-white px-3 py-1.5">
            <span className="truncate">{a.name} · {a.phone ?? a.email}</span>
            <code className="font-bold">{a.tempPassword}</code>
          </li>
        ))}
      </ul>
      <Button size="sm" variant="outline" className="mt-3" onClick={() => downloadCsv('identifiants-aluni.csv', [['Nom', 'Téléphone', 'E-mail', 'Mot de passe provisoire'], ...accounts.map((a) => [a.name, a.phone, a.email, a.tempPassword])])}>
        <Download className="size-4" />Télécharger (CSV)
      </Button>
    </div>
  )
}

function CreateUserModal({ open, onClose, onCreated }) {
  const empty = { firstName: '', lastName: '', phone: '', email: '', role: 'apprenant', profile: 'interne', center: '', speciality: '' }
  const [f, setF] = useState(empty)
  const [error, setError] = useState(null)
  const [created, setCreated] = useState(null)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const close = () => { setF(empty); setError(null); setCreated(null); onClose() }
  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      const res = await api.post('/admin/users', { ...f, phone: f.phone || null, email: f.email || null })
      setCreated(res)
      onCreated()
    } catch (err) {
      setError(err)
    }
  }
  return (
    <Modal open={open} onClose={close} title="Créer un compte"
      footer={created ? <Button onClick={close}>Terminer</Button> : <><Button variant="outline-gray" onClick={close}>Annuler</Button><Button type="submit" form="create-user">Créer le compte</Button></>}>
      {created ? (
        <CredentialsList accounts={[created]} />
      ) : (
        <form id="create-user" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom"><input required value={f.lastName} onChange={set('lastName')} className="input" /></Field>
          <Field label="Prénom(s)"><input required value={f.firstName} onChange={set('firstName')} className="input" /></Field>
          <Field label="Téléphone"><input value={f.phone} onChange={set('phone')} className="input" placeholder="90 00 00 00" /></Field>
          <Field label="E-mail"><input type="email" value={f.email} onChange={set('email')} className="input" /></Field>
          <Field label="Rôle">
            <select value={f.role} onChange={set('role')} className="input">{Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </Field>
          {f.role === 'apprenant' && (
            <Field label="Profil">
              <select value={f.profile} onChange={set('profile')} className="input">
                <option value="interne">CDEJ interne</option><option value="autre-cdej">Autre CDEJ</option><option value="particulier">Particulier</option>
              </select>
            </Field>
          )}
          {f.role === 'apprenant' && f.profile === 'autre-cdej' && <Field label="Centre" className="sm:col-span-2"><input value={f.center} onChange={set('center')} className="input" /></Field>}
          {f.role === 'formateur' && <Field label="Spécialité"><input value={f.speciality} onChange={set('speciality')} className="input" /></Field>}
          <div className="sm:col-span-2"><FormError error={error} /></div>
        </form>
      )}
    </Modal>
  )
}

function ImportModal({ open, onClose, onImported }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const close = () => { setFile(null); setPreview(null); setResult(null); setError(null); onClose() }
  const send = async (dryRun, f = file) => {
    setBusy(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('file', f)
      const res = await api.post(`/admin/users/import?dryRun=${dryRun}`, form)
      if (dryRun) setPreview(res)
      else {
        setResult(res)
        onImported()
      }
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal open={open} onClose={close} title="Créer des comptes en lot (Excel)" size="lg"
      footer={result ? <Button onClick={close}>Terminer</Button> : (
        <><Button variant="outline-gray" onClick={close}>Annuler</Button><Button disabled={!preview?.valid || busy} onClick={() => send(false)}>{busy ? 'Création…' : `Créer ${preview?.valid ?? 0} compte(s)`}</Button></>
      )}>
      {result ? (
        <CredentialsList accounts={result.created} />
      ) : (
        <>
          <ol className="mb-4 list-decimal space-y-1 pl-5 text-sm text-gray-700">
            <li>Téléchargez le modèle et remplissez une ligne par jeune du CDEJ.</li>
            <li>Colonnes : Nom, Prénom, Date de naissance, Sexe (F/M), Téléphone, E-mail (facultatif).</li>
            <li>Déposez le fichier : un aperçu s'affiche, puis confirmez la création.</li>
          </ol>
          <Button variant="ghost" size="sm" className="mb-4" onClick={() => api.download('/admin/users/import-template', 'modele-import-apprenants.xlsx')}><Download className="size-4" />Télécharger le modèle (.xlsx)</Button>
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 p-6 text-center hover:border-brand-400">
            <Upload className="size-7 text-gray-400" />
            <span className="font-semibold">{file ? file.name : 'Choisir un fichier Excel ou CSV'}</span>
            <span className="text-xs text-gray-500">.xlsx ou .csv</span>
            <input type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; setFile(f); setPreview(null); if (f) send(true, f) }} />
          </label>
          <div className="mt-3"><FormError error={error} /></div>
          {busy && !preview && <p className="mt-3 text-sm text-gray-500">Lecture du fichier…</p>}
          {preview && (
            <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
              <p className={cx('p-2 text-xs font-semibold', preview.invalid ? 'bg-amber-50 text-amber-900' : 'bg-brand-50 text-brand-800')}>
                {preview.valid} ligne(s) valide(s){preview.invalid ? ` · ${preview.invalid} ligne(s) ignorée(s)` : ''} · profil « CDEJ interne »
              </p>
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50"><tr><th className="p-2">Ligne</th><th>Nom</th><th>Prénom</th><th>Naissance</th><th>Téléphone</th><th>Statut</th></tr></thead>
                <tbody>
                  {preview.rows.map((r) => (
                    <tr key={r.line} className="border-t border-gray-100">
                      <td className="p-2">{r.line}</td><td>{r.lastName}</td><td>{r.firstName}</td><td>{r.birthDate ? formatDate(r.birthDate, { dateStyle: 'short' }) : ''}</td><td>{r.phone ?? r.email}</td>
                      <td className={r.error ? 'text-red-600' : 'text-brand-700'}>{r.error ?? 'OK'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Modal>
  )
}

export function AdminUsers() {
  const [tab, setTab] = useState('apprenant')
  const [q, setQ] = useState('')
  const state = useApi('/admin/users' + qs({ role: tab, q }))
  const [modal, setModal] = useState('')
  const { run, toastEl } = useAction()

  const patch = (u, body, msg) => run(async () => {
    const updated = await api.patch(`/admin/users/${u.id}`, body)
    state.setData((list) => list.map((x) => (x.id === u.id ? updated : x)).filter((x) => x.role === tab))
  }, msg)

  return (
    <>
      <PageHeader title="Utilisateurs" subtitle="Activez, suspendez et gérez les rôles des comptes."
        actions={<><Button variant="outline-gray" onClick={() => setModal('import')}><FileSpreadsheet className="size-4" />Import Excel</Button><Button onClick={() => setModal('create')}><Plus className="size-4" />Créer un compte</Button></>} />
      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label: label + 's' }))} />
      <label className="relative mb-4 block sm:w-80">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} className="input pl-9" placeholder="Nom, téléphone ou e-mail" />
      </label>
      <Async state={state}>
        {(list) =>
          list.length ? (
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
                  <tr><th className="px-4 py-3 font-semibold">Nom</th><th className="font-semibold">Profil</th><th className="font-semibold">Contact</th><th className="font-semibold">Inscrit le</th><th className="font-semibold">Rôle</th><th className="font-semibold">Statut</th><th className="pr-4 text-right font-semibold">Action</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {list.map((u) => (
                    <tr key={u.id}>
                      <td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar name={u.name} size="sm" /><div><p className="font-semibold">{u.name}</p><p className="text-xs text-gray-500">{u.center ?? u.speciality}</p></div></div></td>
                      <td>{PROFILE_LABELS[u.profile]}</td>
                      <td className="text-gray-700">{u.phone ?? ''}<br /><span className="text-xs text-gray-500">{u.email}</span></td>
                      <td className="text-gray-700">{formatDate(u.joined, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td>
                        <select value={u.role} onChange={(e) => patch(u, { role: e.target.value }, 'Rôle modifié')} className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm" aria-label={`Rôle de ${u.name}`}>
                          {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </td>
                      <td><Badge tone={STATUS_TONES[u.status]}>{STATUS_LABELS[u.status]}</Badge></td>
                      <td className="pr-4 text-right">
                        {u.status === 'actif'
                          ? <Button size="sm" variant="ghost" className="text-red-600" onClick={() => patch(u, { status: 'suspendu' }, 'Compte suspendu')}>Suspendre</Button>
                          : <Button size="sm" variant="secondary" onClick={() => patch(u, { status: 'actif' }, 'Compte activé')}>Activer</Button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={Users} title="Aucun compte trouvé" />
          )
        }
      </Async>
      <CreateUserModal open={modal === 'create'} onClose={() => setModal('')} onCreated={state.reload} />
      <ImportModal open={modal === 'import'} onClose={() => setModal('')} onImported={state.reload} />
      {toastEl}
    </>
  )
}

// ---------------------------------------------------------------- Validations
export function AdminValidations() {
  const state = useApi('/admin/validations')
  const [tab, setTab] = useState('trainers')
  const [rejecting, setRejecting] = useState(null)
  const [comment, setComment] = useState('')
  const { run, toastEl } = useAction()

  const decide = (kind, id, approve, reason) => run(async () => {
    await api.post(`/admin/validations/${kind}/${id}/${approve ? 'approve' : 'reject'}`, { comment: reason || null })
    state.reload()
  }, approve ? 'Demande approuvée' : 'Demande refusée')

  const Actions = ({ kind, id }) => (
    <div className="flex gap-2">
      <Button size="sm" variant="secondary" onClick={() => decide(kind, id, true)}><Check className="size-4" />Approuver</Button>
      <Button size="sm" variant="ghost" className="text-red-600" onClick={() => { setRejecting({ kind, id }); setComment('') }}><X className="size-4" />Refuser</Button>
    </div>
  )

  return (
    <>
      <PageHeader title="Validations" subtitle="Comptes formateurs, formations, inscriptions et certificats en attente." />
      <Async state={state}>
        {(v) => (
          <>
            <Tabs className="mb-5" value={tab} onChange={setTab} tabs={[
              { value: 'trainers', label: 'Formateurs', count: v.trainers.length },
              { value: 'courses', label: 'Formations', count: v.courses.length },
              { value: 'enrollments', label: 'Inscriptions', count: v.enrollments.length },
              { value: 'certificates', label: 'Certificats', count: v.certificates.length },
            ]} />
            {tab === 'trainers' && (v.trainers.length ? (
              <div className="card divide-y divide-gray-100">
                {v.trainers.map((t) => (
                  <div key={t.id} className="flex flex-wrap items-center gap-4 p-4">
                    <Avatar name={t.name} />
                    <div className="min-w-0 flex-1"><p className="font-bold">{t.name}</p><p className="text-sm text-gray-600">{t.speciality} · {[t.email, t.phone].filter(Boolean).join(' · ')}</p><p className="text-xs text-gray-500">Demande du {formatDate(t.date)}</p></div>
                    <Actions kind="trainers" id={t.id} />
                  </div>
                ))}
              </div>
            ) : <EmptyState icon={UserCheck} title="Aucune demande en attente" />)}
            {tab === 'courses' && (v.courses.length ? (
              <div className="card divide-y divide-gray-100">
                {v.courses.map((c) => (
                  <div key={c.id} className="flex flex-wrap items-center gap-4 p-4">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><BookOpen className="size-5" /></span>
                    <div className="min-w-0 flex-1"><p className="font-bold">{c.title}</p><p className="text-sm text-gray-600">par {c.trainer} · {c.modules} module(s) · soumise le {formatDate(c.date)}</p></div>
                    <Button size="sm" variant="ghost" to={`/admin/formations/${c.id}`}><Eye className="size-4" />Examiner</Button>
                    <Actions kind="courses" id={c.id} />
                  </div>
                ))}
              </div>
            ) : <EmptyState icon={BookOpen} title="Aucune formation en attente" />)}
            {tab === 'enrollments' && (v.enrollments.length ? (
              <div className="card divide-y divide-gray-100">
                {v.enrollments.map((e) => (
                  <div key={e.id} className="flex flex-wrap items-center gap-4 p-4">
                    <Avatar name={e.name} />
                    <div className="min-w-0 flex-1"><p className="font-bold">{e.name} <Badge className="ml-1">{PROFILE_LABELS[e.profile]}</Badge></p><p className="text-sm text-gray-600">souhaite suivre « {e.course.title} » · {formatDate(e.date)}</p></div>
                    <Actions kind="enrollments" id={e.id} />
                  </div>
                ))}
              </div>
            ) : <EmptyState icon={Users} title="Aucune inscription en attente" />)}
            {tab === 'certificates' && (v.certificates.length ? (
              <div className="card divide-y divide-gray-100">
                {v.certificates.map((c) => (
                  <div key={c.code} className="flex flex-wrap items-center gap-4 p-4">
                    <Award className="size-8 shrink-0 text-gold-500" />
                    <div className="min-w-0 flex-1"><p className="font-bold">{c.name}</p><p className="text-sm text-gray-600">{c.course.title} · {c.score}/100 · {c.code}</p></div>
                    <Actions kind="certificates" id={c.code} />
                  </div>
                ))}
              </div>
            ) : <EmptyState icon={Award} title="Aucun certificat en attente" />)}
          </>
        )}
      </Async>
      <Modal open={!!rejecting} onClose={() => setRejecting(null)} title="Refuser la demande"
        footer={<><Button variant="outline-gray" onClick={() => setRejecting(null)}>Annuler</Button><Button variant="danger" onClick={() => { decide(rejecting.kind, rejecting.id, false, comment); setRejecting(null) }}>Refuser</Button></>}>
        <Field label="Motif (communiqué à la personne concernée)"><textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} className="input" placeholder="Ex. : contenu à compléter, pièces manquantes…" /></Field>
      </Modal>
      {toastEl}
    </>
  )
}

// ---------------------------------------------------------------- Formations et catégories
function CategoryModal({ category, onClose, onSaved }) {
  const [f, setF] = useState(category)
  const [error, setError] = useState(null)
  const submit = async (e) => {
    e.preventDefault()
    try {
      await (f.dbId ? api.put(`/admin/categories/${f.dbId}`, f) : api.post('/admin/categories', f))
      onSaved()
    } catch (err) {
      setError(err)
    }
  }
  return (
    <Modal open onClose={onClose} title={f.dbId ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
      footer={<><Button variant="outline-gray" onClick={onClose}>Annuler</Button><Button type="submit" form="category-form">Enregistrer</Button></>}>
      <form id="category-form" onSubmit={submit} className="space-y-4">
        <Field label="Nom"><input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="input" /></Field>
        <div>
          <p className="label">Icône</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_ICON_NAMES.map((icon) => (
              <button type="button" key={icon} onClick={() => setF({ ...f, icon })} className={cx('rounded-lg border-2 p-2.5', f.icon === icon ? 'border-brand-600 bg-brand-50' : 'border-gray-200')} aria-label={icon}>
                <CategoryIcon icon={icon} className="size-5" />
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="label">Couleur</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_COLORS.map((color) => (
              <button type="button" key={color} onClick={() => setF({ ...f, color })} className={cx('size-10 rounded-lg bg-gradient-to-br ring-offset-2', color, f.color === color && 'ring-2 ring-brand-600')} aria-label={color} />
            ))}
          </div>
        </div>
        <FormError error={error} />
      </form>
    </Modal>
  )
}

export function AdminCourses() {
  const courses = useApi('/admin/courses')
  const categories = useApi('/categories')
  const [editing, setEditing] = useState(null)
  const { run, toastEl } = useAction()

  const setStatus = (c, status) => run(async () => {
    await api.patch(`/admin/courses/${c.id}`, { status })
    courses.setData((list) => list.map((x) => (x.id === c.id ? { ...x, status } : x)))
  }, status === 'publiee' ? 'Formation publiée' : 'Formation archivée')

  const removeCategory = (c) => confirm(`Supprimer la catégorie « ${c.name} » ?`) && run(async () => { await api.del(`/admin/categories/${c.dbId}`); categories.reload() }, 'Catégorie supprimée')

  return (
    <>
      <PageHeader title="Formations & catégories" />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Async state={courses}>
          {(list) => (
            <section className="card overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
                  <tr><th className="px-4 py-3 font-semibold">Formation</th><th className="font-semibold">Formateur</th><th className="font-semibold">Inscrits</th><th className="font-semibold">Statut</th><th className="pr-4 text-right font-semibold">Action</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {list.map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-3"><Link to={`/admin/formations/${c.id}`} className="font-semibold hover:text-brand-700">{c.title}</Link><p className="text-xs text-gray-500">{c.categoryName} · {c.level} · accès {c.access}</p></td>
                      <td>{c.trainer}</td>
                      <td>{c.learners}</td>
                      <td><Badge tone={COURSE_STATUS[c.status]?.tone}>{COURSE_STATUS[c.status]?.label}</Badge></td>
                      <td className="pr-4 text-right">
                        {c.status === 'publiee' && <Button size="sm" variant="ghost" onClick={() => setStatus(c, 'archivee')}>Archiver</Button>}
                        {c.status === 'archivee' && <Button size="sm" variant="secondary" onClick={() => setStatus(c, 'publiee')}>Republier</Button>}
                        {c.status === 'en-validation' && <Button size="sm" variant="secondary" to="/admin/validations">Valider</Button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </Async>
        <section className="card self-start p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">Catégories</h2>
            <Button size="sm" onClick={() => setEditing({ name: '', icon: 'FileText', color: CATEGORY_COLORS[0] })}><Plus className="size-4" />Ajouter</Button>
          </div>
          <ul className="space-y-2">
            {(categories.data ?? []).map((c) => (
              <li key={c.id} className="flex items-center gap-3 rounded-xl border border-gray-200 p-2.5">
                <span className={cx('flex size-9 items-center justify-center rounded-lg bg-gradient-to-br text-white', c.color)}><CategoryIcon icon={c.icon} className="size-4" /></span>
                <span className="flex-1"><span className="block font-semibold">{c.name}</span><span className="text-xs text-gray-500">{c.count} formation(s) publiée(s)</span></span>
                <button onClick={() => setEditing(c)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100" aria-label="Modifier"><Pencil className="size-4" /></button>
                <button onClick={() => removeCategory(c)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" aria-label="Supprimer"><Trash2 className="size-4" /></button>
              </li>
            ))}
          </ul>
        </section>
      </div>
      {editing && <CategoryModal category={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); categories.reload() }} />}
      {toastEl}
    </>
  )
}

// ---------------------------------------------------------------- Certificats
function TemplatesTab({ sample }) {
  const settings = useSettings()
  const [f, setF] = useState(null)
  const { run, toastEl } = useAction()
  useEffect(() => {
    if (settings['certificate.template']) setF({ template: settings['certificate.template'], signatory: settings['certificate.signatory'], signatoryTitle: settings['certificate.signatoryTitle'] })
  }, [settings['certificate.template']])
  if (!f) return null
  const save = () => run(async () => {
    await api.put('/admin/settings', { 'certificate.template': f.template, 'certificate.signatory': f.signatory, 'certificate.signatoryTitle': f.signatoryTitle })
    settings.reload()
  }, 'Modèle enregistré : il s’applique à tous les certificats')
  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <div className="card self-start p-5">
        <p className="label">Modèle actif</p>
        <div className="space-y-2">
          {Object.entries(TEMPLATES).map(([k, t]) => (
            <button key={k} onClick={() => setF({ ...f, template: k })} className={cx('flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left', f.template === k ? 'border-brand-600 bg-brand-50' : 'border-gray-200')}>
              <span className="size-6 rounded-full" style={{ background: t.border }} />
              <span className="flex-1 font-semibold">{t.name}</span>
              {f.template === k && <CheckCircle2 className="size-5 text-brand-600" />}
            </button>
          ))}
        </div>
        <Field label="Signataire" className="mt-5"><input value={f.signatory} onChange={(e) => setF({ ...f, signatory: e.target.value })} className="input" /></Field>
        <Field label="Fonction du signataire" className="mt-3"><input value={f.signatoryTitle} onChange={(e) => setF({ ...f, signatoryTitle: e.target.value })} className="input" /></Field>
        <Button className="mt-5 w-full" onClick={save}>Enregistrer le modèle</Button>
      </div>
      <div className="rounded-2xl bg-gray-200/60 p-4 sm:p-6">
        {sample ? <Certificate cert={{ ...sample, signatory: f.signatory, signatoryTitle: f.signatoryTitle }} template={f.template} /> : <p className="text-gray-600">Aucun certificat pour l'aperçu.</p>}
      </div>
      {toastEl}
    </div>
  )
}

export function AdminCertificates() {
  const [q, setQ] = useState('')
  const state = useApi('/admin/certificates' + qs({ q }))
  const [tab, setTab] = useState('liste')
  const [revoke, setRevoke] = useState(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState(null)
  const { run, toastEl } = useAction()

  const confirmRevoke = async () => {
    setError(null)
    try {
      const updated = await api.post(`/admin/certificates/${revoke.code}/revoke`, { reason })
      state.setData((list) => list.map((c) => (c.code === updated.code ? updated : c)))
      setRevoke(null)
    } catch (e) {
      setError(e)
    }
  }

  return (
    <>
      <PageHeader title="Certificats" subtitle="Recherchez, révoquez et personnalisez les certificats." />
      <Tabs className="mb-5" value={tab} onChange={setTab} tabs={[{ value: 'liste', label: 'Certificats délivrés', count: state.data?.length }, { value: 'modeles', label: 'Modèle et signature' }]} />
      {tab === 'liste' ? (
        <>
          <label className="relative mb-4 block sm:w-96">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} className="input pl-9" placeholder="Numéro ou nom du titulaire" />
          </label>
          <Async state={state}>
            {(list) =>
              list.length ? (
                <div className="card overflow-x-auto">
                  <table className="w-full min-w-[820px] text-left text-sm">
                    <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
                      <tr><th className="px-4 py-3 font-semibold">Numéro</th><th className="font-semibold">Titulaire</th><th className="font-semibold">Formation</th><th className="font-semibold">Type</th><th className="font-semibold">Date</th><th className="font-semibold">Statut</th><th className="pr-4" /></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {list.map((c) => (
                        <tr key={c.code}>
                          <td className="px-4 py-3 font-mono text-xs font-semibold">{c.code}</td>
                          <td className="font-semibold">{c.name}</td>
                          <td className="text-gray-700">{c.course.title}</td>
                          <td>{CERT_TYPES[c.type].short}{c.score != null ? ` · ${c.score}/100` : ''}</td>
                          <td>{formatDate(c.date, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                          <td><Badge tone={c.status === 'valide' ? 'green' : c.status === 'revoque' ? 'red' : 'amber'}>{c.status === 'valide' ? 'Valide' : c.status === 'revoque' ? 'Révoqué' : 'En attente'}</Badge></td>
                          <td className="pr-4 text-right whitespace-nowrap">
                            <Button size="sm" variant="ghost" onClick={() => run(() => api.download(`/certificates/${c.code}/pdf`, `certificat-${c.code}.pdf`))} aria-label="Télécharger le PDF"><Download className="size-4" /></Button>
                            <Button size="sm" variant="ghost" to={`/verifier/${c.code}`} aria-label="Page de vérification"><Eye className="size-4" /></Button>
                            {c.status === 'valide' && <Button size="sm" variant="ghost" className="text-red-600" onClick={() => { setRevoke(c); setReason(''); setError(null) }}><Ban className="size-4" />Révoquer</Button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState icon={Award} title="Aucun certificat trouvé" />
              )
            }
          </Async>
        </>
      ) : (
        <TemplatesTab sample={state.data?.find((c) => c.type === 'competence' && c.status === 'valide')} />
      )}
      <Modal open={!!revoke} onClose={() => setRevoke(null)} title="Révoquer ce certificat ?"
        footer={<><Button variant="outline-gray" onClick={() => setRevoke(null)}>Annuler</Button><Button variant="danger" disabled={!reason.trim()} onClick={confirmRevoke}>Révoquer définitivement</Button></>}>
        {revoke && (
          <>
            <p className="text-gray-700">Le certificat <strong>{revoke.code}</strong> de <strong>{revoke.name}</strong> apparaîtra comme « révoqué » sur la page publique de vérification. Cette action est définitive.</p>
            <Field label="Motif (fraude avérée)" className="mt-4"><textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className="input" /></Field>
            <div className="mt-3"><FormError error={error} /></div>
          </>
        )}
      </Modal>
      {toastEl}
    </>
  )
}

// ---------------------------------------------------------------- Site vitrine
function ImageField({ label, value, onChange }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const upload = async (file) => {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      onChange((await api.upload('/admin/files', file)).url)
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div>
      <p className="label">{label}</p>
      <div className="flex items-center gap-3">
        {value && <img src={fileUrl(value)} alt="" className="h-14 w-20 rounded-lg object-cover" />}
        <label className={cx('flex cursor-pointer items-center gap-2 text-sm font-semibold text-brand-700', busy && 'opacity-50')}>
          <Upload className="size-4" />{busy ? 'Envoi…' : value ? 'Changer' : 'Ajouter une image'}
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
        </label>
        {value && <button type="button" onClick={() => onChange(null)} className="text-sm text-red-600 hover:underline">Retirer</button>}
      </div>
      <FormError error={error} />
    </div>
  )
}

function CrudList({ endpoint, title, emptyLabel, render, toForm, fromForm, fields, blank }) {
  const listEndpoint = endpoint === 'news' ? '/admin/news' : endpoint === 'partners' ? '/partners' : '/faq'
  const state = useApi(listEndpoint)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState(null)
  const { run, toastEl } = useAction()
  const save = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      const body = fromForm(editing)
      await (editing.id ? api.put(`/admin/${endpoint}/${editing.id}`, body) : api.post(`/admin/${endpoint}`, body))
      setEditing(null)
      state.reload()
    } catch (err) {
      setError(err)
    }
  }
  const remove = (item) => confirm('Supprimer cet élément ?') && run(async () => { await api.del(`/admin/${endpoint}/${item.id}`); state.reload() }, 'Élément supprimé')
  return (
    <>
      <Async state={state}>
        {(items) =>
          items.length ? (
            <div className="card divide-y divide-gray-100">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-4">
                  <div className="min-w-0 flex-1">{render(item)}</div>
                  <button onClick={() => { setEditing(toForm(item)); setError(null) }} className="rounded p-1.5 text-gray-400 hover:bg-gray-100" aria-label="Modifier"><Pencil className="size-4" /></button>
                  <button onClick={() => remove(item)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" aria-label="Supprimer"><Trash2 className="size-4" /></button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Inbox} title={emptyLabel} />
          )
        }
      </Async>
      <Button className="mt-4" onClick={() => { setEditing(blank); setError(null) }}><Plus className="size-4" />{title}</Button>
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Modifier' : title} size="lg"
        footer={<><Button variant="outline-gray" onClick={() => setEditing(null)}>Annuler</Button><Button type="submit" form="crud-form">Enregistrer</Button></>}>
        {editing && (
          <form id="crud-form" onSubmit={save} className="space-y-4">
            {fields(editing, (patch) => setEditing({ ...editing, ...patch }))}
            <FormError error={error} />
          </form>
        )}
      </Modal>
      {toastEl}
    </>
  )
}

function NewsAdmin() {
  return (
    <CrudList
      endpoint="news" title="Nouvelle actualité" emptyLabel="Aucune actualité"
      blank={{ title: '', category: 'Événement', excerpt: '', body: '', date: new Date().toISOString().slice(0, 10), image: null, published: true }}
      toForm={(n) => ({ ...n, body: n.body.join('\n\n') })}
      fromForm={(n) => ({ title: n.title, category: n.category, excerpt: n.excerpt, body: n.body, date: n.date, image: n.image, published: n.published })}
      render={(n) => (
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1"><p className="truncate font-semibold">{n.title}</p><p className="text-sm text-gray-500">{formatDate(n.date)} · {n.category}</p></div>
          <Badge tone={n.published ? 'green' : 'gray'}>{n.published ? 'Publiée' : 'Brouillon'}</Badge>
        </div>
      )}
      fields={(n, set) => (
        <>
          <Field label="Titre"><input required value={n.title} onChange={(e) => set({ title: e.target.value })} className="input" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Catégorie"><select value={n.category} onChange={(e) => set({ category: e.target.value })} className="input"><option>Événement</option><option>Session</option><option>Annonce</option></select></Field>
            <Field label="Date"><input type="date" value={n.date} onChange={(e) => set({ date: e.target.value })} className="input" /></Field>
          </div>
          <Field label="Résumé"><input value={n.excerpt ?? ''} onChange={(e) => set({ excerpt: e.target.value })} maxLength={500} className="input" /></Field>
          <Field label="Contenu" hint="Laissez une ligne vide entre les paragraphes."><textarea rows={7} value={n.body ?? ''} onChange={(e) => set({ body: e.target.value })} className="input" /></Field>
          <ImageField label="Photo" value={n.image} onChange={(image) => set({ image })} />
          <label className="flex items-center gap-3 text-[15px]"><input type="checkbox" checked={n.published} onChange={(e) => set({ published: e.target.checked })} className="size-4.5 accent-brand-600" />Publier sur le site</label>
        </>
      )}
    />
  )
}

function PartnersAdmin() {
  return (
    <CrudList
      endpoint="partners" title="Nouveau partenaire" emptyLabel="Aucun partenaire"
      blank={{ name: '', logo: null, website: '' }}
      toForm={(p) => p}
      fromForm={(p) => ({ name: p.name, logo: p.logo, website: p.website || null })}
      render={(p) => (
        <div className="flex items-center gap-3">
          {p.logo ? <img src={fileUrl(p.logo)} alt="" className="h-10 w-14 rounded object-contain" /> : <span className="flex h-10 w-14 items-center justify-center rounded bg-gray-100 text-xs font-bold text-gray-500">LOGO</span>}
          <div className="min-w-0"><p className="font-semibold">{p.name}</p>{p.website && <p className="truncate text-sm text-gray-500">{p.website}</p>}</div>
        </div>
      )}
      fields={(p, set) => (
        <>
          <Field label="Nom"><input required value={p.name} onChange={(e) => set({ name: e.target.value })} className="input" /></Field>
          <Field label="Site web (facultatif)"><input value={p.website ?? ''} onChange={(e) => set({ website: e.target.value })} className="input" placeholder="https://" /></Field>
          <ImageField label="Logo" value={p.logo} onChange={(logo) => set({ logo })} />
        </>
      )}
    />
  )
}

function FaqAdmin() {
  return (
    <CrudList
      endpoint="faq" title="Nouvelle question" emptyLabel="Aucune question"
      blank={{ q: '', a: '', tag: 'Inscription' }}
      toForm={(f) => f}
      fromForm={(f) => ({ q: f.q, a: f.a, tag: f.tag })}
      render={(f) => <><p className="font-semibold">{f.q}</p><p className="line-clamp-1 text-sm text-gray-500">{f.tag} · {f.a}</p></>}
      fields={(f, set) => (
        <>
          <Field label="Question"><input required value={f.q} onChange={(e) => set({ q: e.target.value })} className="input" /></Field>
          <Field label="Réponse"><textarea required rows={5} value={f.a} onChange={(e) => set({ a: e.target.value })} className="input" /></Field>
          <Field label="Thème"><input value={f.tag ?? ''} onChange={(e) => set({ tag: e.target.value })} className="input" placeholder="Inscription, Compte, Examens…" /></Field>
        </>
      )}
    />
  )
}

const SETTINGS_FIELDS = [
  ['Accueil', [['home.heroTitle', 'Grand titre de la page d’accueil'], ['home.heroSubtitle', 'Texte d’introduction', true]]],
  ['À propos', [['about.mission', 'Mission', true], ['about.vision', 'Vision', true], ['about.values', 'Valeurs', true]]],
  ['Chiffres clés', [['stats.learners', 'Jeunes formés'], ['stats.courses', 'Formations'], ['stats.certificates', 'Certificats'], ['stats.computers', 'Ordinateurs en salle']]],
  ['Coordonnées', [['contact.phone', 'Téléphone'], ['contact.whatsapp', 'WhatsApp (indicatif sans +, ex. 22890000000)'], ['contact.email', 'E-mail'], ['contact.address', 'Adresse'], ['contact.hours', 'Horaires'], ['contact.facebook', 'Page Facebook (lien)'], ['contact.youtube', 'Chaîne YouTube (lien)'], ['contact.mapLat', 'Carte : latitude'], ['contact.mapLng', 'Carte : longitude']]],
]

function SettingsAdmin() {
  const state = useApi('/admin/settings')
  const settings = useSettings()
  const [f, setF] = useState(null)
  const { run, toastEl } = useAction()
  useEffect(() => { if (state.data) setF(state.data) }, [state.data])
  if (!f) return <Async state={state}>{() => null}</Async>
  const keys = SETTINGS_FIELDS.flatMap(([, fields]) => fields.map(([k]) => k))
  const save = (e) => {
    e.preventDefault()
    run(async () => {
      await api.put('/admin/settings', Object.fromEntries(keys.map((k) => [k, f[k] ?? ''])))
      settings.reload()
    }, 'Contenus enregistrés')
  }
  return (
    <form className="max-w-3xl space-y-6" onSubmit={save}>
      {SETTINGS_FIELDS.map(([group, fields]) => (
        <section key={group} className="card p-6">
          <h2 className="mb-4 text-lg font-bold">{group}</h2>
          <div className={cx('grid gap-4', group === 'Chiffres clés' ? 'sm:grid-cols-4' : group === 'Coordonnées' ? 'sm:grid-cols-2' : '')}>
            {fields.map(([k, label, long]) => (
              <Field key={k} label={label}>
                {long ? <textarea rows={3} value={f[k] ?? ''} onChange={(e) => setF({ ...f, [k]: e.target.value })} className="input" /> : <input value={f[k] ?? ''} onChange={(e) => setF({ ...f, [k]: e.target.value })} className="input" />}
              </Field>
            ))}
          </div>
        </section>
      ))}
      <Button type="submit">Enregistrer les contenus</Button>
      {toastEl}
    </form>
  )
}

function MessagesAdmin() {
  const state = useApi('/admin/messages')
  const toggle = async (m) => {
    const updated = await api.patch(`/admin/messages/${m.id}`, { handled: !m.handled })
    state.setData((list) => list.map((x) => (x.id === m.id ? updated : x)))
  }
  return (
    <Async state={state}>
      {(list) =>
        list.length ? (
          <div className="space-y-3">
            {list.map((m) => (
              <div key={m.id} className={cx('card p-5', m.handled && 'opacity-60')}>
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{m.name} <span className="font-normal text-gray-500">· {m.subject}</span></p>
                    <p className="mt-0.5 flex flex-wrap gap-x-4 text-sm text-gray-500">
                      {m.phone && <a href={`tel:${m.phone}`} className="flex items-center gap-1 hover:text-brand-700"><Phone className="size-3.5" />{m.phone}</a>}
                      {m.email && <a href={`mailto:${m.email}`} className="flex items-center gap-1 hover:text-brand-700"><Mail className="size-3.5" />{m.email}</a>}
                      <span>{formatDateTime(m.date)}</span>
                    </p>
                  </div>
                  <Button size="sm" variant={m.handled ? 'ghost' : 'secondary'} onClick={() => toggle(m)}>{m.handled ? 'Rouvrir' : <><Check className="size-4" />Traité</>}</Button>
                </div>
                <p className="mt-3 whitespace-pre-line text-gray-700">{m.message}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={Inbox} title="Aucun message reçu" />
        )
      }
    </Async>
  )
}

export function AdminSite() {
  const [tab, setTab] = useState('actualites')
  return (
    <>
      <PageHeader title="Site vitrine" subtitle="Gérez les contenus publics : actualités, partenaires, FAQ, textes et coordonnées." actions={<Button to="/" variant="outline-gray"><Eye className="size-4" />Voir le site</Button>} />
      <Tabs className="mb-5" value={tab} onChange={setTab} tabs={[
        { value: 'actualites', label: 'Actualités' },
        { value: 'partenaires', label: 'Partenaires' },
        { value: 'faq', label: 'FAQ' },
        { value: 'pages', label: 'Textes & coordonnées' },
        { value: 'messages', label: 'Messages reçus' },
      ]} />
      {tab === 'actualites' && <NewsAdmin />}
      {tab === 'partenaires' && <PartnersAdmin />}
      {tab === 'faq' && <FaqAdmin />}
      {tab === 'pages' && <SettingsAdmin />}
      {tab === 'messages' && <MessagesAdmin />}
    </>
  )
}

// ---------------------------------------------------------------- Statistiques
export function AdminReports() {
  const year = new Date().getFullYear()
  const [from, setFrom] = useState(`${year}-01-01`)
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10))
  const [course, setCourse] = useState('')
  const [profile, setProfile] = useState('')
  const courses = useApi('/admin/courses').data ?? []
  const filters = qs({ from, to, course, profile })
  const state = useApi('/admin/reports' + filters)
  const { run, toastEl } = useAction()
  const exportAs = (format) => run(() => api.download(`/admin/reports/export${filters}&format=${format}`, `rapport-aluni.${format}`))

  return (
    <>
      <PageHeader title="Statistiques & rapports" subtitle="Analysez l'activité et exportez vos rapports."
        actions={<><Button variant="outline-gray" onClick={() => exportAs('xlsx')}><FileSpreadsheet className="size-4" />Excel</Button><Button variant="outline-gray" onClick={() => exportAs('pdf')}><Download className="size-4" />PDF</Button></>} />
      <div className="card mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Du"><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input" /></Field>
        <Field label="Au"><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input" /></Field>
        <Field label="Formation">
          <select value={course} onChange={(e) => setCourse(e.target.value)} className="input"><option value="">Toutes les formations</option>{courses.map((c) => <option key={c.id} value={c.slug}>{c.title}</option>)}</select>
        </Field>
        <Field label="Type d'apprenant">
          <select value={profile} onChange={(e) => setProfile(e.target.value)} className="input">
            <option value="">Tous les profils</option><option value="interne">CDEJ interne</option><option value="autre-cdej">Autres CDEJ</option><option value="particulier">Particuliers</option>
          </select>
        </Field>
      </div>

      <Async state={state}>
        {({ stats, monthly, successByCourse, byProfile }) => (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard icon={Users} label="Inscriptions aux formations" value={stats.signups} hint="Période sélectionnée" />
              <StatCard icon={CheckCircle2} label="Formations terminées" value={stats.completed} tone="blue" />
              <StatCard icon={TrendingUp} label="Taux de réussite" value={stats.successRate != null ? `${stats.successRate} %` : '—'} tone="gold" />
              <StatCard icon={Award} label="Certificats" value={stats.certificates} tone="flame" />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <section className="card p-5 sm:p-6">
                <h2 className="text-lg font-bold">Inscriptions par mois</h2>
                <p className="mb-5 text-sm text-gray-500">Nombre d'inscriptions aux formations</p>
                {monthly.some((m) => m.value > 0) ? <ColumnChart data={monthly} label="Inscriptions par mois" /> : <p className="text-sm text-gray-500">Aucune inscription sur la période.</p>}
              </section>
              <section className="card p-5 sm:p-6">
                <h2 className="text-lg font-bold">Taux de réussite par formation</h2>
                <p className="mb-5 text-sm text-gray-500">Part des candidats admis à l'examen final</p>
                {successByCourse.length ? <BarList data={successByCourse} unit=" %" max={100} /> : <p className="text-sm text-gray-500">Aucun examen passé sur la période.</p>}
              </section>
            </div>

            <section className="card mt-6 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <caption className="p-5 text-left text-lg font-bold">Synthèse par type d'apprenant</caption>
                <thead className="border-y border-gray-200 bg-gray-50 text-gray-600">
                  <tr><th className="px-5 py-3 font-semibold">Profil</th><th className="font-semibold">Inscrits</th><th className="font-semibold">Formations terminées</th><th className="font-semibold">Taux de réussite</th><th className="pr-5 font-semibold">Certificats</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {byProfile.map((r) => (
                    <tr key={r.profile}>
                      <td className="px-5 py-3 font-semibold">{r.label}</td>
                      <td className="tabular-nums">{r.learners}</td>
                      <td className="tabular-nums">{r.completed}</td>
                      <td className="tabular-nums">{r.successRate} %</td>
                      <td className="pr-5 tabular-nums">{r.certificates}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )}
      </Async>
      {toastEl}
    </>
  )
}
