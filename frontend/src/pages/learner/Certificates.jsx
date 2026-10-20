import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, Award, Download, ExternalLink, Hourglass, Share2 } from 'lucide-react'
import { CERT_TYPES, formatDate } from '../../data/constants'
import { api } from '../../api/client'
import { useApi } from '../../api/useApi'
import Certificate from '../../components/Certificate'
import { Async, Badge, Button, EmptyState, FormError, PageHeader, Toast } from '../../components/ui'

const STATUS = { valide: ['green', 'Valide'], revoque: ['red', 'Révoqué'], 'en-attente': ['amber', 'En attente de validation'] }

export function MyCertificates() {
  const state = useApi('/me/certificates')
  return (
    <>
      <PageHeader title="Mes certificats" subtitle="Téléchargez vos certificats et partagez-les avec un employeur." />
      <Async state={state}>
        {(certificates) =>
          certificates.length ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {certificates.map((c) => (
                <div key={c.code} className="card overflow-hidden">
                  <Link to={`/apprenant/certificats/${c.code}`} className="block bg-gray-100 p-4">
                    <Certificate cert={c} className="pointer-events-none" />
                  </Link>
                  <div className="p-5">
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={c.type === 'competence' ? 'green' : 'gold'}>{CERT_TYPES[c.type].label}</Badge>
                      {c.status !== 'valide' && <Badge tone={STATUS[c.status][0]}>{STATUS[c.status][1]}</Badge>}
                    </div>
                    <p className="mt-2 font-bold">{c.course.title}</p>
                    <p className="text-sm text-gray-500">Délivré le {formatDate(c.date)} · {c.code}</p>
                    <Button to={`/apprenant/certificats/${c.code}`} size="sm" className="mt-4"><Download className="size-4" />Voir / télécharger</Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Award} title="Pas encore de certificat" text="Terminez une formation ou réussissez un examen final pour obtenir votre certificat." action={<Button to="/apprenant/formations">Mes formations</Button>} />
          )
        }
      </Async>
    </>
  )
}

export function CertificateView() {
  const { code } = useParams()
  const state = useApi(`/certificates/${code}`)
  const [toast, setToast] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const download = async () => {
    setBusy(true)
    setError(null)
    try {
      await api.download(`/certificates/${code}/pdf`, `certificat-${code}.pdf`)
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Link to="/apprenant/certificats" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"><ArrowLeft className="size-4" />Mes certificats</Link>
      <Async state={state}>
        {(cert) => {
          const share = async () => {
            try {
              if (navigator.share) await navigator.share({ title: 'Mon certificat ALuNI', url: cert.verifyUrl })
              else {
                await navigator.clipboard.writeText(cert.verifyUrl)
                setToast('Lien de vérification copié !')
              }
            } catch {
              /* partage annulé */
            }
          }
          return (
            <>
              <PageHeader
                title={cert.course.title}
                subtitle={`${CERT_TYPES[cert.type].label} · N° ${cert.code}`}
                actions={cert.status === 'en-attente' ? null : (
                  <>
                    <Button onClick={download} disabled={busy}><Download className="size-4" />{busy ? 'Préparation…' : 'Télécharger en PDF'}</Button>
                    <Button variant="outline-gray" onClick={share}><Share2 className="size-4" />Partager</Button>
                    <Button variant="ghost" to={`/verifier/${cert.code}`}><ExternalLink className="size-4" />Page de vérification</Button>
                  </>
                )}
              />
              <FormError error={error} />
              {cert.status === 'en-attente' && (
                <p className="mb-4 flex items-center gap-2 rounded-xl bg-amber-50 p-4 text-sm font-medium text-amber-900"><Hourglass className="size-4" />Ce certificat sera disponible après validation par l'Académie.</p>
              )}
              {cert.status === 'revoque' && (
                <p className="mb-4 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-800">Ce certificat a été révoqué par l'Académie{cert.revokedReason ? ` : ${cert.revokedReason}` : '.'}</p>
              )}
              <div className="rounded-2xl bg-gray-200/60 p-3 sm:p-8">
                <Certificate cert={cert} />
              </div>
              <p className="mt-4 text-sm text-gray-500">Le PDF officiel porte la signature numérique et le QR code qui permettent à un employeur de vérifier son authenticité.</p>
            </>
          )
        }}
      </Async>
      <Toast message={toast} onDone={() => setToast('')} />
    </>
  )
}
