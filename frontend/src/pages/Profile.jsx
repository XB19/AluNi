import { useState } from 'react'
import { Camera, KeyRound, Save } from 'lucide-react'
import { PROFILE_LABELS } from '../data/constants'
import { api, fileUrl } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Avatar, Badge, Button, Field, FormError, PageHeader, Toast } from '../components/ui'

// Profil commun aux trois espaces (apprenant, formateur, administrateur)
export default function Profile() {
  const { user, updateUser } = useAuth()
  const [f, setF] = useState({
    firstName: user.firstName, lastName: user.lastName, phone: user.phone ?? '', email: user.email ?? '',
    birthDate: user.birthDate ?? '', gender: user.gender ?? '', title: user.title ?? '', bio: user.bio ?? '',
  })
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [toast, setToast] = useState('')
  const [profileError, setProfileError] = useState(null)
  const [pwError, setPwError] = useState(null)
  const [busy, setBusy] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const setP = (k) => (e) => setPw({ ...pw, [k]: e.target.value })

  const onPhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy('photo')
    try {
      updateUser(await api.upload('/me/photo', file))
      setToast('Photo mise à jour')
    } catch (err) {
      setProfileError(err)
    } finally {
      setBusy('')
    }
  }

  const saveProfile = async (e) => {
    e.preventDefault()
    setBusy('profile')
    setProfileError(null)
    try {
      updateUser(await api.put('/me/profile', { ...f, phone: f.phone || null, email: f.email || null, birthDate: f.birthDate || null }))
      setToast('Informations enregistrées')
    } catch (err) {
      setProfileError(err)
    } finally {
      setBusy('')
    }
  }

  const savePassword = async (e) => {
    e.preventDefault()
    if (pw.newPassword !== pw.confirm) return setPwError(new Error('Les mots de passe ne correspondent pas.'))
    setBusy('password')
    setPwError(null)
    try {
      await api.put('/me/password', { currentPassword: pw.currentPassword, newPassword: pw.newPassword })
      setPw({ currentPassword: '', newPassword: '', confirm: '' })
      setToast('Mot de passe modifié')
    } catch (err) {
      setPwError(err)
    } finally {
      setBusy('')
    }
  }

  return (
    <>
      <PageHeader title="Mon profil" subtitle="Gérez vos informations personnelles et votre mot de passe." />
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="card flex flex-col items-center p-6 text-center lg:self-start">
          <div className="relative">
            <Avatar name={`${user.firstName} ${user.lastName}`} src={fileUrl(user.photo)} size="xl" />
            <label className="absolute right-0 bottom-0 flex size-9 cursor-pointer items-center justify-center rounded-full bg-brand-600 text-white shadow ring-4 ring-white hover:bg-brand-700" aria-label="Changer la photo">
              <Camera className="size-4" />
              <input type="file" accept="image/*" className="sr-only" onChange={onPhoto} disabled={busy === 'photo'} />
            </label>
          </div>
          <p className="mt-4 text-lg font-bold">{user.firstName} {user.lastName}</p>
          <Badge tone="green" className="mt-1">{PROFILE_LABELS[user.profile] ?? PROFILE_LABELS[user.role]}</Badge>
          {user.center && <p className="mt-2 text-sm text-gray-600">{user.center}</p>}
        </div>

        <div className="space-y-6">
          <form className="card p-6" onSubmit={saveProfile}>
            <h2 className="mb-5 text-lg font-bold">Informations personnelles</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Nom" error={profileError?.fields?.lastName}><input required value={f.lastName} onChange={set('lastName')} className="input" /></Field>
              <Field label="Prénom(s)" error={profileError?.fields?.firstName}><input required value={f.firstName} onChange={set('firstName')} className="input" /></Field>
              <Field label="Téléphone"><input value={f.phone} onChange={set('phone')} type="tel" className="input" placeholder="90 00 00 00" /></Field>
              <Field label="E-mail" error={profileError?.fields?.email}><input value={f.email} onChange={set('email')} type="email" className="input" /></Field>
              {user.role === 'apprenant' && (
                <>
                  <Field label="Date de naissance"><input value={f.birthDate} onChange={set('birthDate')} type="date" className="input" /></Field>
                  <Field label="Sexe">
                    <select value={f.gender} onChange={set('gender')} className="input">
                      <option value="">—</option><option value="F">Féminin</option><option value="M">Masculin</option>
                    </select>
                  </Field>
                </>
              )}
              {user.role === 'formateur' && (
                <>
                  <Field label="Titre affiché" className="sm:col-span-2"><input value={f.title} onChange={set('title')} className="input" placeholder="Ex. : Formateur en bureautique" /></Field>
                  <Field label="Présentation (visible sur vos formations)" className="sm:col-span-2"><textarea rows={3} value={f.bio} onChange={set('bio')} className="input" placeholder="Votre parcours, votre expérience…" /></Field>
                </>
              )}
            </div>
            <div className="mt-4"><FormError error={profileError && !Object.keys(profileError.fields ?? {}).length ? profileError : null} /></div>
            <Button type="submit" className="mt-4" disabled={busy === 'profile'}><Save className="size-4" />{busy === 'profile' ? 'Enregistrement…' : 'Enregistrer'}</Button>
          </form>

          <form className="card p-6" onSubmit={savePassword}>
            <h2 className="mb-5 flex items-center gap-2 text-lg font-bold"><KeyRound className="size-5 text-gray-400" />Mot de passe</h2>
            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="Mot de passe actuel"><input type="password" required value={pw.currentPassword} onChange={setP('currentPassword')} className="input" autoComplete="current-password" /></Field>
              <Field label="Nouveau" hint="8 caractères minimum"><input type="password" minLength={8} required value={pw.newPassword} onChange={setP('newPassword')} className="input" autoComplete="new-password" /></Field>
              <Field label="Confirmer"><input type="password" minLength={8} required value={pw.confirm} onChange={setP('confirm')} className="input" autoComplete="new-password" /></Field>
            </div>
            <div className="mt-4"><FormError error={pwError} /></div>
            <Button type="submit" variant="outline" className="mt-4" disabled={busy === 'password'}>Modifier le mot de passe</Button>
          </form>
        </div>
      </div>
      <Toast message={toast} onDone={() => setToast('')} />
    </>
  )
}
