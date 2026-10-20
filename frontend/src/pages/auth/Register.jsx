import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ArrowLeft, Building2, Check, CheckCircle2, Clock, GraduationCap, Heart, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useAcademy } from '../../context/SettingsContext'
import { Button, cx, Field, FormError } from '../../components/ui'
import AuthLayout from './AuthLayout'

function strength(pw) {
  let s = 0
  if (pw.length >= 8) s++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++
  if (/\d/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return s
}

// Champs vérifiés à chaque étape (pour revenir à la bonne étape en cas d'erreur serveur)
const STEP_FIELDS = [['profile', 'center', 'speciality'], ['lastName', 'firstName', 'birthDate', 'gender', 'phone', 'email'], ['password']]

export default function Register() {
  const [params] = useSearchParams()
  const academy = useAcademy()
  const { register } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [serverError, setServerError] = useState(null)
  const [errors, setErrors] = useState({})
  const [f, setF] = useState({
    profile: params.get('role') === 'formateur' ? 'formateur' : '',
    center: '', speciality: '', lastName: '', firstName: '', birthDate: '', gender: '', phone: '', email: '', password: '', confirm: '', accept: false,
  })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const PROFILES = [
    { id: 'interne', icon: Heart, title: `Jeune du CDEJ ${academy.code}`, text: `Je suis bénéficiaire du ${academy.center}` },
    { id: 'autre-cdej', icon: Building2, title: "Jeune d'un autre CDEJ", text: 'Je suis inscrit dans un autre centre' },
    { id: 'particulier', icon: User, title: 'Particulier', text: 'Je veux me former ou certifier mes compétences' },
    { id: 'formateur', icon: GraduationCap, title: 'Formateur', text: "Je veux publier des cours (validation par l'Académie)" },
  ]

  const validate = () => {
    const e = {}
    if (step === 0) {
      if (!f.profile) e.profile = 'Choisissez votre profil.'
      if (f.profile === 'autre-cdej' && !f.center.trim()) e.center = 'Indiquez le nom de votre centre.'
      if (f.profile === 'formateur' && !f.speciality.trim()) e.speciality = 'Indiquez votre spécialité.'
    }
    if (step === 1) {
      if (!f.lastName.trim()) e.lastName = 'Champ obligatoire'
      if (!f.firstName.trim()) e.firstName = 'Champ obligatoire'
      if (!f.birthDate) e.birthDate = 'Champ obligatoire'
      if (!f.gender) e.gender = 'Champ obligatoire'
      if (!f.phone.trim() && !f.email.trim()) e.phone = 'Indiquez au moins un téléphone ou un e-mail.'
      if (f.phone && f.phone.replace(/\D/g, '').replace(/^228/, '').length !== 8) e.phone = 'Le numéro doit contenir 8 chiffres.'
    }
    if (step === 2) {
      if (f.password.length < 8) e.password = 'Au moins 8 caractères.'
      if (f.password !== f.confirm) e.confirm = 'Les mots de passe ne correspondent pas.'
      if (!f.accept) e.accept = 'Vous devez accepter les conditions.'
    }
    setErrors(e)
    return !Object.keys(e).length
  }

  const next = async (e) => {
    e.preventDefault()
    if (!validate()) return
    if (step < 2) return setStep(step + 1)
    setBusy(true)
    setServerError(null)
    try {
      const { confirm, accept, ...data } = f
      const res = await register({ ...data, phone: data.phone || null, email: data.email || null })
      if (res.pending) setDone(true)
      else navigate('/apprenant?bienvenue=1', { replace: true })
    } catch (err) {
      setServerError(err)
      if (err.fields && Object.keys(err.fields).length) {
        setErrors(err.fields)
        const target = STEP_FIELDS.findIndex((fields) => fields.some((k) => err.fields[k]))
        if (target >= 0) setStep(target)
      } else if (/téléphone|e-mail/i.test(err.message)) {
        setStep(1)
      }
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <AuthLayout title="Demande envoyée !">
        <div className="rounded-2xl bg-amber-50 p-6 text-center">
          <Clock className="mx-auto size-12 text-amber-600" />
          <p className="mt-4 text-lg font-bold">Votre compte formateur est en attente de validation</p>
          <p className="mt-2 text-gray-700">L'administration de l'Académie va examiner votre demande. Vous serez prévenu(e) par SMS ou e-mail dès l'activation de votre compte.</p>
        </div>
        <Button to="/" variant="outline" className="mt-6 w-full">Retour à l'accueil</Button>
      </AuthLayout>
    )
  }

  const pwScore = strength(f.password)
  const steps = ['Profil', 'Informations', 'Sécurité']

  return (
    <AuthLayout title="Créer un compte" subtitle="Gratuit, en moins de 2 minutes.">
      <ol className="mb-8 flex items-center gap-2" aria-label="Étapes">
        {steps.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2">
            <span className={cx('flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold', i < step ? 'bg-brand-600 text-white' : i === step ? 'bg-brand-100 text-brand-800 ring-2 ring-brand-600' : 'bg-gray-100 text-gray-500')}>
              {i < step ? <Check className="size-4" /> : i + 1}
            </span>
            <span className={cx('text-sm font-semibold', i === step ? 'text-ink' : 'text-gray-500', i !== step && 'hidden sm:inline')}>{s}</span>
            {i < steps.length - 1 && <span className="h-px flex-1 bg-gray-200" />}
          </li>
        ))}
      </ol>

      <form onSubmit={next} noValidate className="space-y-5">
        {step === 0 && (
          <>
            <p className="font-bold">Qui êtes-vous ?</p>
            <div className="grid gap-3" role="radiogroup">
              {PROFILES.map((p) => (
                <button type="button" role="radio" aria-checked={f.profile === p.id} key={p.id} onClick={() => setF({ ...f, profile: p.id })}
                  className={cx('flex items-center gap-4 rounded-xl border-2 p-4 text-left transition', f.profile === p.id ? 'border-brand-600 bg-brand-50' : 'border-gray-200 hover:border-gray-300')}>
                  <span className={cx('flex size-11 shrink-0 items-center justify-center rounded-xl', f.profile === p.id ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600')}><p.icon className="size-5" /></span>
                  <span className="flex-1">
                    <span className="block font-bold">{p.title}</span>
                    <span className="text-sm text-gray-600">{p.text}</span>
                  </span>
                  {f.profile === p.id && <CheckCircle2 className="size-5 text-brand-600" />}
                </button>
              ))}
            </div>
            {errors.profile && <p className="text-sm font-medium text-red-600">{errors.profile}</p>}
            {f.profile === 'autre-cdej' && (
              <Field label="Nom et code de votre CDEJ" error={errors.center}><input value={f.center} onChange={set('center')} className="input" placeholder="Ex. : CDEJ TG0212 Atakpamé" /></Field>
            )}
            {f.profile === 'formateur' && (
              <Field label="Votre spécialité" error={errors.speciality}><input value={f.speciality} onChange={set('speciality')} className="input" placeholder="Ex. : Bureautique, développement web…" /></Field>
            )}
          </>
        )}

        {step === 1 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nom" error={errors.lastName}><input value={f.lastName} onChange={set('lastName')} autoComplete="family-name" className="input" /></Field>
              <Field label="Prénom(s)" error={errors.firstName}><input value={f.firstName} onChange={set('firstName')} autoComplete="given-name" className="input" /></Field>
            </div>
            <Field label="Date de naissance" error={errors.birthDate}><input type="date" value={f.birthDate} max={new Date().toISOString().slice(0, 10)} onChange={set('birthDate')} className="input" /></Field>
            <fieldset>
              <legend className="label">Sexe</legend>
              <div className="grid grid-cols-2 gap-3">
                {[['F', 'Féminin'], ['M', 'Masculin']].map(([v, l]) => (
                  <button type="button" key={v} onClick={() => setF({ ...f, gender: v })} aria-pressed={f.gender === v}
                    className={cx('h-11 rounded-lg border-2 font-semibold', f.gender === v ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-gray-200 text-gray-700')}>{l}</button>
                ))}
              </div>
              {errors.gender && <p className="mt-1 text-xs font-medium text-red-600">{errors.gender}</p>}
            </fieldset>
            <Field label="Téléphone" error={errors.phone} hint="Il servira à vous connecter et à récupérer votre mot de passe.">
              <div className="flex">
                <span className="flex items-center rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 px-3 text-gray-600">+228</span>
                <input value={f.phone} onChange={set('phone')} type="tel" inputMode="tel" placeholder="90 00 00 00" className="input rounded-l-none" />
              </div>
            </Field>
            <Field label="E-mail (facultatif)" error={errors.email}><input value={f.email} onChange={set('email')} type="email" placeholder="vous@exemple.com" className="input" /></Field>
          </>
        )}

        {step === 2 && (
          <>
            <Field label="Mot de passe" error={errors.password}>
              <input type="password" value={f.password} onChange={set('password')} autoComplete="new-password" className="input" placeholder="8 caractères minimum" />
              <div className="mt-2 flex gap-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className={cx('h-1.5 flex-1 rounded-full', i < pwScore ? ['bg-red-500', 'bg-amber-500', 'bg-brand-400', 'bg-brand-600'][pwScore - 1] : 'bg-gray-200')} />
                ))}
              </div>
              <span className="mt-1 block text-xs text-gray-500">Astuce : mélangez lettres, chiffres et symboles.</span>
            </Field>
            <Field label="Confirmer le mot de passe" error={errors.confirm}><input type="password" value={f.confirm} onChange={set('confirm')} autoComplete="new-password" className="input" /></Field>
            <label className="flex items-start gap-3 text-sm text-gray-700">
              <input type="checkbox" checked={f.accept} onChange={set('accept')} className="mt-0.5 size-4.5 accent-brand-600" />
              <span>J'accepte les conditions d'utilisation et la politique de confidentialité de l'Académie.</span>
            </label>
            {errors.accept && <p className="text-xs font-medium text-red-600">{errors.accept}</p>}
          </>
        )}

        <FormError error={serverError && !Object.keys(serverError.fields ?? {}).length ? serverError : null} />

        <div className="flex gap-3 pt-2">
          {step > 0 && (
            <Button type="button" variant="outline-gray" size="lg" onClick={() => setStep(step - 1)}><ArrowLeft className="size-5" />Retour</Button>
          )}
          <Button type="submit" size="lg" className="flex-1" disabled={busy}>
            {busy ? 'Création…' : step < 2 ? 'Continuer' : f.profile === 'formateur' ? 'Envoyer ma demande' : 'Créer mon compte'}
          </Button>
        </div>
      </form>

      <p className="mt-6 text-center text-[15px] text-gray-600">
        Déjà inscrit ? <Link to="/connexion" className="font-bold text-brand-700 hover:underline">Se connecter</Link>
      </p>
    </AuthLayout>
  )
}
