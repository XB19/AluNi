import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router'
import { HOME_BY_ROLE, useAuth } from '../../context/AuthContext'
import { CheckCircle2, LifeBuoy, Mail, MessageSquare } from 'lucide-react'
import { api } from '../../api/client'
import { useApi } from '../../api/useApi'
import { useAcademy } from '../../context/SettingsContext'
import { Button, cx, Field, FormError, Loading } from '../../components/ui'
import AuthLayout from './AuthLayout'

const CHANNELS = [['sms', 'Par SMS', MessageSquare], ['email', 'Par e-mail', Mail]]

function ForgotPasswordPage() {
  const academy = useAcademy()
  // Seuls les moyens d'envoi réellement configurés sur le serveur sont proposés
  const channels = useApi('/auth/channels')
  const available = CHANNELS.filter(([k]) => channels.data?.[k])
  const [step, setStep] = useState(0)
  const [picked, setPicked] = useState(null)
  const channel = available.some(([k]) => k === picked) ? picked : available[0]?.[0]
  const [identifier, setIdentifier] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [resent, setResent] = useState(false)
  // Le serveur n'envoie qu'un code par minute : on attend avant de proposer un nouvel envoi
  const [cooldown, setCooldown] = useState(0)
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const run = async (fn) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }

  const sendCode = () => api.post('/auth/forgot-password', { channel, identifier: identifier.trim() })

  const titles = ['Mot de passe oublié', 'Saisissez le code reçu', 'Nouveau mot de passe', 'Mot de passe modifié']
  const subtitle = step === 0
    ? 'Recevez un code pour créer un nouveau mot de passe.'
    : step === 1 ? `Si un compte correspond, un code à 6 chiffres a été envoyé ${channel === 'sms' ? 'par SMS au' : 'à'} ${identifier}. Il est valable 15 minutes.` : null

  return (
    <AuthLayout title={titles[step]} subtitle={subtitle}>
      {step === 0 && channels.loading && !channels.data && <Loading className="min-h-32" />}
      {step === 0 && (channels.data || channels.error) && !available.length && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
          <LifeBuoy className="size-7 text-amber-600" />
          <p className="mt-3 font-bold">La récupération automatique n'est pas encore activée</p>
          <p className="mt-1 text-sm">
            Contactez l'Académie : l'administration réinitialise votre mot de passe et vous communique un mot de passe provisoire.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button to="/contact" size="sm">Contacter l'Académie</Button>
            {academy.phone && <Button href={`tel:${academy.phone.replace(/\s/g, '')}`} size="sm" variant="outline-gray">{academy.phone}</Button>}
          </div>
        </div>
      )}
      {step === 0 && available.length > 0 && (
        <form onSubmit={(e) => { e.preventDefault(); if (identifier.trim()) run(async () => { await sendCode(); setStep(1); setCooldown(60) }) }} className="space-y-5">
          <div className={cx('grid gap-3', available.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
            {available.map(([k, l, Icon]) => (
              <button type="button" key={k} onClick={() => { setPicked(k); setIdentifier('') }} aria-pressed={channel === k}
                className={cx('flex flex-col items-center gap-2 rounded-xl border-2 p-4 font-semibold', channel === k ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-gray-200 text-gray-700')}>
                <Icon className="size-6" />{l}
              </button>
            ))}
          </div>
          <Field label={channel === 'sms' ? 'Numéro de téléphone' : 'Adresse e-mail'}>
            <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} type={channel === 'sms' ? 'tel' : 'email'} className="input" placeholder={channel === 'sms' ? '90 00 00 00' : 'vous@exemple.com'} required />
          </Field>
          <FormError error={error} />
          <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? 'Envoi…' : 'Recevoir le code'}</Button>
        </form>
      )}
      {step === 1 && (
        <form onSubmit={(e) => { e.preventDefault(); run(async () => { await api.post('/auth/verify-code', { identifier, code }); setStep(2) }) }} className="space-y-5">
          <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} inputMode="numeric" maxLength={6} required autoFocus
            className="input h-14 text-center text-2xl font-bold tracking-[0.6em]" placeholder="••••••" aria-label="Code à 6 chiffres" />
          <FormError error={error} />
          <Button type="submit" size="lg" className="w-full" disabled={busy || code.length !== 6}>{busy ? 'Vérification…' : 'Vérifier le code'}</Button>
          <button type="button" disabled={cooldown > 0 || busy} onClick={() => run(async () => { await sendCode(); setResent(true); setCooldown(60) })}
            className="w-full text-sm font-semibold text-brand-700 hover:underline disabled:text-gray-400 disabled:no-underline">
            {cooldown > 0 ? `${resent ? 'Nouveau code envoyé ✓ · ' : ''}Renvoyer le code dans ${cooldown} s` : 'Renvoyer le code'}
          </button>
        </form>
      )}
      {step === 2 && (
        <form onSubmit={(e) => {
          e.preventDefault()
          if (password !== confirm) return setError(new Error('Les mots de passe ne correspondent pas.'))
          run(async () => { await api.post('/auth/reset-password', { identifier, code, password }); setStep(3) })
        }} className="space-y-5">
          <Field label="Nouveau mot de passe" hint="8 caractères minimum"><input type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} className="input" autoComplete="new-password" /></Field>
          <Field label="Confirmer"><input type="password" minLength={8} required value={confirm} onChange={(e) => setConfirm(e.target.value)} className="input" autoComplete="new-password" /></Field>
          <FormError error={error} />
          <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</Button>
        </form>
      )}
      {step === 3 && (
        <div className="text-center">
          <CheckCircle2 className="mx-auto size-14 text-brand-600" />
          <p className="mt-4 text-gray-700">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
          <Button to="/connexion" size="lg" className="mt-6 w-full">Se connecter</Button>
        </div>
      )}
      {step < 3 && <p className="mt-6 text-center text-sm"><Link to="/connexion" className="font-semibold text-brand-700 hover:underline">← Retour à la connexion</Link></p>}
    </AuthLayout>
  )
}

/** Déjà connecté : pas de formulaire de connexion ou d'inscription, direction l'espace personnel. */
export default function ForgotPassword() {
  const { user } = useAuth()
  const [already] = useState(user)
  return already ? <Navigate to={HOME_BY_ROLE[already.role]} replace /> : <ForgotPasswordPage />
}
