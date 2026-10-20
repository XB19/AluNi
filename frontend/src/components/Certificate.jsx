import { QRCodeSVG } from 'qrcode.react'
import { CERT_TYPES, formatDate } from '../data/constants'
import { useAcademy } from '../context/SettingsContext'
import logo from '../assets/logo-cdej.jpg'

export const TEMPLATES = {
  classique: { name: 'Classique (or)', border: '#b5a36a', accent: '#16592b', bg: '#fffdf7' },
  vert: { name: 'Vert CDEJ', border: '#1a6f33', accent: '#1a6f33', bg: '#ffffff' },
  flamme: { name: 'Flamme', border: '#f26a1b', accent: '#b4400e', bg: '#fffaf6' },
}

// Aperçu à l'écran du certificat (le PDF officiel est généré par le serveur).
// Dimensions en cqw : le certificat garde ses proportions quelle que soit la largeur d'écran.
export default function Certificate({ cert, template, className = '' }) {
  const academy = useAcademy()
  const t = TEMPLATES[template ?? cert.template] ?? TEMPLATES.classique
  const competence = cert.type === 'competence'
  const cq = (n) => `${n}cqw`

  return (
    <div className={`relative w-full overflow-hidden shadow-xl ${className}`} style={{ containerType: 'inline-size', aspectRatio: '297 / 210', background: t.bg }}>
      <div className="absolute" style={{ inset: cq(1.6), border: `${cq(0.5)} solid ${t.border}` }} />
      <div className="absolute" style={{ inset: cq(2.6), border: `${cq(0.12)} solid ${t.border}` }} />
      {cert.status === 'revoque' && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="rotate-[-18deg] font-black text-red-600/25" style={{ fontSize: cq(14) }}>RÉVOQUÉ</span>
        </div>
      )}

      <div className="relative flex h-full flex-col items-center text-center" style={{ padding: `${cq(5)} ${cq(7)}` }}>
        <div className="flex w-full items-center justify-between">
          <img src={logo} alt="Logo CDEJ" style={{ width: cq(9), height: cq(9) }} className="object-contain" />
          <div className="text-right leading-tight">
            <p className="font-extrabold" style={{ fontSize: cq(3), color: t.accent }}>ALu<span style={{ color: '#f26a1b' }}>N</span>I</p>
            <p className="text-gray-600" style={{ fontSize: cq(1.1) }}>{academy.name}</p>
            <p className="text-gray-500" style={{ fontSize: cq(1.1) }}>{academy.center} · {academy.code}</p>
          </div>
        </div>

        <p className="font-bold uppercase" style={{ fontSize: cq(3.4), letterSpacing: '0.18em', color: t.accent, marginTop: cq(1.5) }}>
          {competence ? 'Certificat de compétence' : 'Attestation de suivi'}
        </p>
        <div style={{ width: cq(12), height: cq(0.25), background: t.border, margin: `${cq(1.2)} 0` }} />
        <p className="text-gray-600" style={{ fontSize: cq(1.6) }}>L'{academy.name} certifie que</p>
        <p className="font-extrabold text-ink" style={{ fontSize: cq(4.6), marginTop: cq(1), fontFamily: 'Georgia, "Times New Roman", serif' }}>{cert.name}</p>
        <p className="text-gray-700" style={{ fontSize: cq(1.6), marginTop: cq(1), maxWidth: cq(70) }}>
          {competence ? "a réussi l'examen final de la formation" : 'a suivi avec assiduité et terminé la formation'}
        </p>
        <p className="font-bold" style={{ fontSize: cq(2.4), color: t.accent, marginTop: cq(0.6) }}>« {cert.course?.title} »</p>
        {competence && cert.score != null && (
          <p className="text-gray-700" style={{ fontSize: cq(1.6), marginTop: cq(0.8) }}>
            avec la note de <strong>{cert.score}/100</strong> – mention <strong>{cert.mention}</strong>
          </p>
        )}
        <p className="text-gray-600" style={{ fontSize: cq(1.4), marginTop: cq(0.8) }}>Durée : {cert.hours} heures · Délivré à Kpévé, le {formatDate(cert.date)}</p>

        <div className="mt-auto flex w-full items-end justify-between">
          <div className="text-left" style={{ fontSize: cq(1.1) }}>
            <p className="text-gray-500">N° du certificat</p>
            <p className="font-bold text-ink" style={{ fontSize: cq(1.5) }}>{cert.code}</p>
            <p className="text-gray-500" style={{ marginTop: cq(0.6) }}>{CERT_TYPES[cert.type]?.label}</p>
          </div>
          <div className="text-center" style={{ fontSize: cq(1.1) }}>
            <p style={{ fontFamily: '"Brush Script MT", "Segoe Script", cursive', fontSize: cq(3), color: t.accent }}>{cert.signatory}</p>
            <div style={{ width: cq(20), height: cq(0.12), background: '#999', margin: `${cq(0.3)} auto` }} />
            <p className="font-semibold text-gray-700">{cert.signatoryTitle}</p>
            <p className="text-gray-400">Signature numérique : {cert.signature}</p>
          </div>
          <div className="flex flex-col items-center" style={{ fontSize: cq(1) }}>
            <div className="bg-white" style={{ padding: cq(0.5) }}>
              <QRCodeSVG value={cert.verifyUrl} size={256} fgColor="#0f3a1f" style={{ width: cq(9), height: cq(9) }} />
            </div>
            <p className="text-gray-500" style={{ marginTop: cq(0.4) }}>Vérifier l'authenticité</p>
          </div>
        </div>
      </div>
    </div>
  )
}
