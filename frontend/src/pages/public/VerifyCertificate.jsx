import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { BadgeCheck, Ban, QrCode, Search, ShieldCheck, Smartphone, XCircle } from 'lucide-react'
import { CERT_TYPES, formatDate } from '../../data/constants'
import { useApi } from '../../api/useApi'
import { Button, ErrorState, Loading } from '../../components/ui'

function Result({ code }) {
  const state = useApi(`/certificates/verify/${encodeURIComponent(code)}`)
  if (state.loading) return <Loading label="Vérification en cours…" />
  if (state.error && state.error.status !== 404) return <ErrorState error={state.error} onRetry={state.reload} />
  const cert = state.data
  if (!cert) {
    return (
      <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-6" role="alert">
        <div className="flex items-start gap-4">
          <XCircle className="size-8 shrink-0 text-red-600" />
          <div>
            <h2 className="text-xl font-bold text-red-800">Certificat introuvable</h2>
            <p className="mt-1 text-red-900/80">Aucun certificat authentique ne correspond au numéro <strong>{code.toUpperCase()}</strong>. Vérifiez la saisie (ex. : ALUNI-2026-000148). En cas de doute, contactez l'Académie.</p>
          </div>
        </div>
      </div>
    )
  }
  const revoked = cert.status === 'revoque'
  return (
    <div className={revoked ? 'rounded-2xl border-2 border-red-200 bg-white' : 'rounded-2xl border-2 border-brand-300 bg-white'} role="status">
      <div className={revoked ? 'flex items-center gap-4 rounded-t-xl bg-red-50 p-5' : 'flex items-center gap-4 rounded-t-xl bg-brand-50 p-5'}>
        {revoked ? <Ban className="size-9 shrink-0 text-red-600" /> : <BadgeCheck className="size-9 shrink-0 text-brand-600" />}
        <div>
          <h2 className={revoked ? 'text-xl font-bold text-red-800' : 'text-xl font-bold text-brand-800'}>
            {revoked ? 'Certificat révoqué' : 'Certificat authentique'}
          </h2>
          <p className="text-sm text-gray-700">
            {revoked ? "Ce certificat a été annulé par l'Académie et n'est plus valable." : "Ce certificat a bien été délivré par l'Académie Lumière du Numérique et de l'Innovation. Sa signature numérique est valide."}
          </p>
        </div>
      </div>
      <dl className="grid gap-x-6 gap-y-4 p-6 sm:grid-cols-2">
        {[
          ['Titulaire', cert.name],
          ['Numéro', cert.code],
          ['Formation', cert.course.title],
          ['Type', CERT_TYPES[cert.type]?.label],
          ['Date de délivrance', formatDate(cert.date)],
          ['Résultat', cert.score != null ? `${cert.score} / 100 – ${cert.mention}` : 'Formation terminée'],
          ['Signature numérique', cert.signature],
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="text-sm text-gray-500">{k}</dt>
            <dd className="font-bold">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export default function VerifyCertificate() {
  const { code } = useParams()
  const navigate = useNavigate()
  const [value, setValue] = useState(code ?? '')
  useEffect(() => setValue(code ?? ''), [code])

  return (
    <div className="bg-gray-50">
      <div className="container-page max-w-3xl py-12">
        <div className="text-center">
          <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-brand-600 text-white"><ShieldCheck className="size-8" /></span>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl">Vérifier un certificat</h1>
          <p className="mx-auto mt-2 max-w-lg text-gray-600">Saisissez le numéro inscrit sur le certificat, ou scannez son QR code avec l'appareil photo de votre téléphone.</p>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); if (value.trim()) navigate(`/verifier/${value.trim().toUpperCase()}`) }}
          className="mt-8 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-3 sm:flex-row"
        >
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="input h-12 flex-1 border-0 text-base uppercase focus:ring-0"
            placeholder="ALUNI-2026-000000"
            aria-label="Numéro du certificat"
          />
          <Button type="submit" size="lg" className="h-12"><Search className="size-5" />Vérifier</Button>
        </form>

        <div className="mt-8">
          {code ? (
            <Result key={code} code={code} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex gap-4 rounded-2xl bg-white p-5">
                <QrCode className="size-8 shrink-0 text-brand-600" />
                <div>
                  <p className="font-bold">Avec le QR code</p>
                  <p className="mt-1 text-sm text-gray-600">Ouvrez l'appareil photo de votre téléphone et visez le QR code : cette page s'ouvre avec le résultat.</p>
                </div>
              </div>
              <div className="flex gap-4 rounded-2xl bg-white p-5">
                <Smartphone className="size-8 shrink-0 text-brand-600" />
                <div>
                  <p className="font-bold">Avec le numéro</p>
                  <p className="mt-1 text-sm text-gray-600">Le numéro figure en bas du certificat, au format ALUNI-ANNÉE-NUMÉRO.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
