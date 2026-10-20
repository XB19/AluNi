import { useMemo, useState } from 'react'
import { PlayCircle } from 'lucide-react'
import { fileUrl } from '../api/client'

const ALLOWED = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'UL', 'OL', 'LI', 'H2', 'H3', 'H4', 'A', 'IMG', 'CODE', 'PRE', 'BLOCKQUOTE', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'SPAN'])

/** Ne garde que les balises de mise en forme simples (protège contre l'injection de scripts). */
export function sanitizeHtml(html) {
  const doc = new DOMParser().parseFromString(`<div>${html ?? ''}</div>`, 'text/html')
  const walk = (node) => {
    ;[...node.children].forEach((el) => {
      if (!ALLOWED.has(el.tagName)) {
        el.replaceWith(...(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT'].includes(el.tagName) ? [] : el.childNodes))
        return
      }
      ;[...el.attributes].forEach((a) => {
        const keep = (el.tagName === 'A' && a.name === 'href') || (el.tagName === 'IMG' && ['src', 'alt'].includes(a.name))
        if (!keep || /^\s*javascript:/i.test(a.value)) el.removeAttribute(a.name)
      })
      if (el.tagName === 'A') {
        el.setAttribute('target', '_blank')
        el.setAttribute('rel', 'noreferrer')
      }
      walk(el)
    })
  }
  walk(doc.body.firstChild)
  return doc.body.firstChild.innerHTML
}

/** Texte brut (sans balises) : les paragraphes séparés par une ligne vide deviennent des <p>. */
export function toHtml(content) {
  if (!content) return ''
  if (/<[a-z][\s\S]*>/i.test(content)) return content
  return content
    .split(/\n\s*\n/)
    .map((p) => `<p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p>`)
    .join('')
}

export function RichContent({ html, className = 'prose-lesson' }) {
  const safe = useMemo(() => sanitizeHtml(toHtml(html)), [html])
  return <div className={className} dangerouslySetInnerHTML={{ __html: safe }} />
}

function youtubeEmbed(url) {
  const m = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/.exec(url ?? '')
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}?autoplay=1&rel=0` : null
}

/** Vidéo chargée seulement à la demande, pour économiser les données mobiles. */
export function VideoPlayer({ url, title, duration }) {
  const [play, setPlay] = useState(false)
  const embed = youtubeEmbed(url)
  if (play && url) {
    return embed ? (
      <iframe src={embed} title={title} className="aspect-video w-full rounded-2xl" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
    ) : (
      <video src={fileUrl(url)} controls autoPlay className="aspect-video w-full rounded-2xl bg-black" />
    )
  }
  return (
    <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-gray-800 to-gray-950 text-white">
      <button
        onClick={() => setPlay(true)}
        disabled={!url}
        className="flex flex-col items-center gap-2 disabled:opacity-60"
        aria-label="Lire la vidéo"
      >
        <span className="flex size-20 items-center justify-center rounded-full bg-white/15 backdrop-blur transition hover:scale-105 hover:bg-white/25">
          <PlayCircle className="size-12" />
        </span>
        <span className="text-sm text-white/80">{url ? 'Lire la vidéo' : 'Vidéo bientôt disponible'}</span>
      </button>
      <span className="absolute bottom-3 left-4 text-sm text-white/80">{title}{duration ? ` · ${duration}` : ''}</span>
      <span className="absolute top-3 right-4 rounded bg-black/40 px-2 py-0.5 text-xs">Chargée seulement si vous appuyez sur Lire</span>
    </div>
  )
}
