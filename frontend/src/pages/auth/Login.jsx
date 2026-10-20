import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Eye, EyeOff } from 'lucide-react'
import { HOME_BY_ROLE, useAuth } from '../../context/AuthContext'
import { Button, cx, Field, FormError } from '../../components/ui'
import AuthLayout from './AuthLayout'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [mode, setMode] = useState('phone')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!identifier.trim() || !password) return setError(new Error('Veuillez saisir votre identifiant et votre mot de passe.'))
    setBusy(true)
    setError(null)
    try {
      const user = await login(identifier.trim(), password)
      const redirect = params.get('redirect')
      navigate(redirect && redirect.startsWith('/') ? redirect : HOME_BY_ROLE[user.role], { replace: true })
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout title="Bon retour parmi nous !" subtitle="Connectez-vous pour continuer votre apprentissage.">
      <div className="mb-6 grid grid-cols-2 rounded-xl bg-gray-100 p-1" role="tablist">
        {[['phone', 'Téléphone'], ['email', 'E-mail']].map(([k, l]) => (
          <button key={k} role="tab" aria-selected={mode === k} onClick={() => { setMode(k); setIdentifier(''); setError(null) }}
            className={cx('rounded-lg py-2.5 text-sm font-semibold transition', mode === k ? 'bg-white text-ink shadow-sm' : 'text-gray-600')}>
            {l}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-5" noValidate>
        {mode === 'phone' ? (
          <Field label="Numéro de téléphone">
            <div className="flex">
              <span className="flex items-center rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 px-3 text-[15px] text-gray-600">+228</span>
              <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} type="tel" inputMode="tel" autoComplete="tel" placeholder="90 00 00 00" className="input rounded-l-none" />
            </div>
          </Field>
        ) : (
          <Field label="Adresse e-mail">
            <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} type="email" autoComplete="email" placeholder="vous@exemple.com" className="input" />
          </Field>
        )}
        <div>
          <div className="mb-1.5 flex justify-between">
            <label htmlFor="password" className="text-sm font-semibold text-gray-800">Mot de passe</label>
            <Link to="/mot-de-passe-oublie" className="text-sm font-semibold text-brand-700 hover:underline">Mot de passe oublié ?</Link>
          </div>
          <div className="relative">
            <input id="password" value={password} onChange={(e) => setPassword(e.target.value)} type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="Votre mot de passe" className="input pr-12" />
            <button type="button" onClick={() => setShow(!show)} className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 text-gray-500 hover:bg-gray-100" aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
              {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </div>
        </div>
        <FormError error={error} />
        <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? 'Connexion…' : 'Se connecter'}</Button>
      </form>

      <p className="mt-6 text-center text-[15px] text-gray-600">
        Pas encore de compte ? <Link to="/inscription" className="font-bold text-brand-700 hover:underline">S'inscrire gratuitement</Link>
      </p>
    </AuthLayout>
  )
}
