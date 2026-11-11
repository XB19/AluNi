import { useId } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { formatDate } from '../data/constants'
import { useAcademy } from '../context/SettingsContext'
import logo from '../assets/logo-cdej.jpg'

/**
 * Modèles de certificat : même mise en page, seules les couleurs du bandeau et du sceau changent.
 * Les clés restent celles enregistrées dans les paramètres (classique, vert, flamme). Couleurs reprises par le PDF serveur.
 */
export const TEMPLATES = {
  classique: { name: 'ALuNI (vert et orange)', band: ['#07210f', '#16592b', '#258a41', '#f26a1b'], accent: '#16592b', seal: '#f26a1b' },
  vert: { name: 'Vert CDEJ', band: ['#07210f', '#134725', '#1a6f33', '#45a660'], accent: '#16592b', seal: '#258a41' },
  flamme: { name: 'Flamme', band: ['#0f3a1f', '#b4400e', '#f26a1b', '#fb8a3c'], accent: '#b4400e', seal: '#f26a1b' },
}
export const templateSwatch = (t) => `linear-gradient(100deg, ${t.band.join(', ')})`

const FRAME = 'linear-gradient(160deg, #134725 0%, #0f3a1f 45%, #07210f 100%)'
const PAPER = '#f7f8f7'
const INK = '#1b1f1d'
const MUTED = '#5b625e'
const DOTTED = '#c5cbc7'

// Aperçu à l'écran du certificat (le PDF officiel est généré par le serveur avec la même mise en page).
// Dimensions en cqw : le certificat garde ses proportions (A4 paysage) quelle que soit la largeur d'écran.
export default function Certificate({ cert, template, className = '' }) {
  const academy = useAcademy()
  const t = TEMPLATES[template ?? cert.template] ?? TEMPLATES.classique
  const competence = cert.type === 'competence'
  const cq = (n) => `${n}cqw`

  const field = (label, value, width) => (
    <div style={{ width: cq(width) }}>
      <p className="truncate font-bold" style={{ fontSize: cq(1.35), color: INK }}>{value}</p>
      <div style={{ borderTop: `${cq(0.12)} dashed ${DOTTED}`, marginTop: cq(0.5) }} />
      <p style={{ fontSize: cq(0.95), color: MUTED, marginTop: cq(0.4) }}>{label}</p>
    </div>
  )

  return (
    <div className={`relative w-full overflow-hidden shadow-xl ${className}`} style={{ containerType: 'inline-size', aspectRatio: '297 / 210', background: FRAME, padding: cq(2.2) }}>
      <div className="relative h-full overflow-hidden" style={{ background: PAPER }}>
        {/* Bandeau supérieur en dégradé, trame de points */}
        <div className="absolute inset-x-0 top-0" style={{ height: '27%', background: templateSwatch(t) }}>
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.22) 1px, transparent 1.3px)', backgroundSize: `${cq(1.3)} ${cq(1.3)}` }} />
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 32% 110%, rgba(255,255,255,.18), transparent 55%)' }} />
          <div className="relative flex h-full items-center text-white" style={{ paddingLeft: '13%', gap: cq(2) }}>
            <div className="flex items-center" style={{ gap: cq(1.2) }}>
              <img src={logo} alt="Logo CDEJ" className="rounded-full bg-white object-contain" style={{ width: cq(6.2), height: cq(6.2), padding: cq(0.35) }} />
              <div className="leading-none">
                <p className="font-extrabold tracking-tight" style={{ fontSize: cq(3) }}>ALu<span style={{ color: '#ffb27a' }}>N</span>I</p>
                <p className="font-light" style={{ fontSize: cq(1.15), marginTop: cq(0.45), opacity: 0.92 }}>{academy.name}</p>
              </div>
            </div>
            <span className="font-light" style={{ fontSize: cq(1.6), opacity: 0.8 }}>×</span>
            <p className="font-extrabold tracking-tight" style={{ fontSize: cq(2.8) }}>CDEJ {academy.code}</p>
          </div>
        </div>

        {/* Sceau de certification, à cheval sur le bandeau */}
        <Seal t={t} academy={academy} style={{ position: 'absolute', width: cq(17), height: cq(17), right: '9%', top: `calc(27% - ${cq(8.5)})` }} />

        {cert.status === 'revoque' && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <span className="rotate-[-18deg] font-black text-red-600/25" style={{ fontSize: cq(14) }}>RÉVOQUÉ</span>
          </div>
        )}

        {/* Corps du certificat, aligné à gauche */}
        <div className="absolute inset-x-0 bottom-0" style={{ top: '27%', padding: `${cq(4.6)} 6% ${cq(3.4)} 13%` }}>
          <p className="font-extrabold tracking-tight" style={{ fontSize: cq(3.5), color: INK, lineHeight: 1.1 }}>{cert.name}</p>
          <div style={{ width: cq(36), borderTop: `${cq(0.12)} dashed ${DOTTED}`, marginTop: cq(0.7) }} />
          <p style={{ fontSize: cq(0.95), color: MUTED, marginTop: cq(0.4) }}>Titulaire</p>

          <p style={{ fontSize: cq(1.1), color: MUTED, marginTop: cq(2.8) }}>
            {competence ? 'a obtenu le Certificat de compétence en' : "a obtenu l'Attestation de suivi de la formation"}
          </p>
          <p className="font-bold" style={{ fontSize: cq(cert.course?.title?.length > 42 ? 2.5 : 3), color: INK, lineHeight: 1.15, marginTop: cq(0.5), maxWidth: cq(62) }}>
            {cert.course?.title}
          </p>

          <div className="flex" style={{ gap: cq(2.6), marginTop: cq(2.6) }}>
            {field('Date', formatDate(cert.date), 15)}
            {field('N° du certificat', cert.code, 16)}
          </div>

          <div className="absolute flex items-end justify-between" style={{ left: '13%', right: '6%', bottom: cq(3) }}>
            <div style={{ width: cq(30) }}>
              <p className="leading-none" style={{ fontFamily: '"Brush Script MT", "Segoe Script", "Lucida Handwriting", cursive', fontSize: cq(3.1), color: INK }}>{cert.signatory}</p>
              <div style={{ borderTop: `${cq(0.12)} dashed ${DOTTED}`, marginTop: cq(0.4) }} />
              <p className="font-bold" style={{ fontSize: cq(1.1), color: INK, marginTop: cq(0.45) }}>{cert.signatory}</p>
              <p style={{ fontSize: cq(1), color: MUTED }}>{cert.signatoryTitle}</p>
              <p style={{ fontSize: cq(0.8), color: '#8a918d', marginTop: cq(0.3) }}>Signature numérique : {cert.signature}</p>
            </div>
            <div className="flex items-center" style={{ gap: cq(1.2) }}>
              <div className="text-right" style={{ fontSize: cq(0.9), color: MUTED, lineHeight: 1.35 }}>
                <p className="font-semibold" style={{ color: INK }}>Vérifier l'authenticité</p>
                <p>Scannez le code ou rendez-vous</p>
                <p>sur la page « Vérifier un certificat »</p>
              </div>
              <div className="bg-white" style={{ padding: cq(0.5), border: `${cq(0.1)} solid #e3e7e4` }}>
                <QRCodeSVG value={cert.verifyUrl} size={256} fgColor="#0f3a1f" style={{ width: cq(7.5), height: cq(7.5), display: 'block' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Sceau rond : texte circulaire « Académie Lumière du Numérique » / « Certification » et logo au centre. */
function Seal({ t, style }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 200 200" style={style} aria-hidden>
      <defs>
        {/* Arc supérieur (240°) lu de gauche à droite, arc inférieur (120°) lu de gauche à droite */}
        <path id={`top-${id}`} d="M 42.8 133 A 66 66 0 1 1 157.2 133" />
        <path id={`bottom-${id}`} d="M 30.7 140 A 80 80 0 0 0 169.3 140" />
        <clipPath id={`clip-${id}`}><circle cx="100" cy="100" r="40" /></clipPath>
      </defs>
      <circle cx="100" cy="100" r="97" fill="#fff" />
      <circle cx="100" cy="100" r="89" fill="none" stroke={t.accent} strokeWidth="3" />
      <circle cx="100" cy="100" r="55" fill="none" stroke={t.accent} strokeWidth="1.6" />
      <text fill={t.accent} fontSize="11.5" fontWeight="700" letterSpacing="1.2" fontFamily="system-ui, 'Segoe UI', sans-serif">
        <textPath href={`#top-${id}`} startOffset="50%" textAnchor="middle">ACADÉMIE LUMIÈRE DU NUMÉRIQUE</textPath>
      </text>
      <text fill={t.seal} fontSize="13" fontWeight="800" letterSpacing="2.5" fontFamily="system-ui, 'Segoe UI', sans-serif">
        <textPath href={`#bottom-${id}`} startOffset="50%" textAnchor="middle">CERTIFICATION</textPath>
      </text>
      <circle cx="35.5" cy="128" r="2.6" fill={t.seal} />
      <circle cx="164.5" cy="128" r="2.6" fill={t.seal} />
      <image href={logo} x="60" y="60" width="80" height="80" clipPath={`url(#clip-${id})`} preserveAspectRatio="xMidYMid slice" />
    </svg>
  )
}
