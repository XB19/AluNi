import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router'
import { ArrowUp, MessageCircleQuestion, RotateCcw, X } from 'lucide-react'
import { api, STATIC_DEMO } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useAcademy } from '../context/SettingsContext'
import { cx } from './ui'
import icon from '../assets/aluni-icon.svg'

// ------------------------------------------------------------------ Ouverture depuis n'importe quelle page

const OPEN_EVENT = 'aluni:assistant'

/** Ouvre l'assistant ; avec une question, elle est envoyée directement. */
export function openAssistant(question) {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { question } }))
}

// ------------------------------------------------------------------ Mise en forme des réponses

/** Texte en ligne : **gras** et liens [texte](/chemin) (liens internes uniquement, ouverts dans le site). */
function Inline({ text, onNavigate }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g)
  return parts.map((p, i) => {
    const bold = p.match(/^\*\*([^*]+)\*\*$/)
    if (bold) return <strong key={i} className="font-semibold text-ink">{bold[1]}</strong>
    const link = p.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/)
    if (link && link[2].startsWith('/')) {
      return <Link key={i} to={link[2]} onClick={onNavigate} className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800">{link[1]}</Link>
    }
    if (link) return <Fragment key={i}>{link[1]}</Fragment>
    return <Fragment key={i}>{p}</Fragment>
  })
}

/** Paragraphes et listes (« - » ou « 1. »), sans HTML : la réponse ne peut rien injecter dans la page. */
function Rich({ text, onNavigate }) {
  const blocks = []
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    const item = line.match(/^(?:[-*•]|(\d+)[.)])\s+(.*)$/)
    const last = blocks.at(-1)
    if (!line) blocks.push(null)
    else if (item) {
      const ordered = !!item[1]
      if (last?.type === 'list' && last.ordered === ordered) last.items.push(item[2])
      else blocks.push({ type: 'list', ordered, items: [item[2]] })
    } else if (last?.type === 'p') last.lines.push(line)
    else blocks.push({ type: 'p', lines: [line] })
  }
  return blocks.filter(Boolean).map((b, i) =>
    b.type === 'p' ? (
      <p key={i} className="whitespace-pre-line">{b.lines.map((l, j) => <Fragment key={j}>{j > 0 && '\n'}<Inline text={l} onNavigate={onNavigate} /></Fragment>)}</p>
    ) : (
      (() => {
        const List = b.ordered ? 'ol' : 'ul'
        return (
          <List key={i} className={cx('space-y-1 pl-5', b.ordered ? 'list-decimal' : 'list-disc')}>
            {b.items.map((it, j) => <li key={j}><Inline text={it} onNavigate={onNavigate} /></li>)}
          </List>
        )
      })()
    ),
  )
}

// ------------------------------------------------------------------ Secours hors ligne (vitrine statique)

const fold = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const STOP = new Set('le la les un une des de du et ou en est je me mon ma mes vous votre vos que qui quoi comment pour par sur dans avec ce cette se pas puis peux bonjour merci'.split(' '))
const words = (s) => new Set(fold(s).split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !STOP.has(w)).map((w) => (w.length > 4 && w.endsWith('s') ? w.slice(0, -1) : w)))

/** Réponse tirée de la FAQ la plus proche, quand le serveur n'est pas joignable. */
async function localAnswer(question) {
  const faq = await api.get('/faq').catch(() => [])
  const q = words(question)
  let best = null
  for (const f of faq) {
    const fq = words(f.q)
    const fa = words(f.a)
    let score = 0
    for (const w of q) score += (fq.has(w) ? 2 : 0) + (fa.has(w) ? 0.6 : 0)
    if (!best || score > best.score) best = { f, score }
  }
  if (best && best.score >= 2) return `**${best.f.q}**\n\n${best.f.a}\n\nD'autres réponses dans les [questions fréquentes](/faq).`
  return "Je n'ai pas trouvé de réponse précise. Consultez les [questions fréquentes](/faq) ou écrivez à l'Académie depuis la [page Contact](/contact)."
}

// ------------------------------------------------------------------ Fenêtre de discussion

// La conversation est rangée par personne : après une déconnexion ou un changement de compte, on repart de zéro
const STORE = 'aluni-assistant'
const load = (owner) => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORE))
    return saved?.owner === owner ? saved.messages ?? [] : []
  } catch { return [] }
}
const save = (owner, messages) => {
  try { sessionStorage.setItem(STORE, JSON.stringify({ owner, messages: messages.slice(-30) })) } catch { /* stockage indisponible */ }
}

const SUGGESTIONS = {
  visitor: ['Comment créer un compte ?', 'En ligne ou en salle : quelle différence ?', 'Comment obtenir un certificat ?', "J'ai oublié mon mot de passe"],
  apprenant: ['Comment passer mon examen final ?', 'Où télécharger mon certificat ?', "Ma demande d'inscription est en attente", 'Je suis en salle ou en ligne ?'],
  formateur: ['Comment publier une formation ?', 'Comment importer des questions ?', "Comment programmer une session d'examen en salle ?", 'Comment suivre mes apprenants ?'],
  admin: ['Comment créer un compte formateur ?', "Comment valider une demande d'inscription ?", 'Comment révoquer un certificat ?', 'Comment modifier la FAQ ?'],
}

/**
 * Assistant de la plateforme : bouton flottant et fenêtre de discussion.
 * @param {'public'|'dashboard'} placement position du bouton (au-dessus de la barre de navigation mobile dans les espaces)
 */
export default function Assistant({ placement = 'public' }) {
  const { user } = useAuth()
  const academy = useAcademy()
  const [open, setOpen] = useState(false)
  const owner = user ? `${user.role}-${user.id}` : 'visiteur'
  const [messages, setMessages] = useState(() => load(owner))
  const [loadedFor, setLoadedFor] = useState(owner)
  if (loadedFor !== owner) {
    // Changement de compte : la conversation de la personne précédente n'est pas reprise
    setLoadedFor(owner)
    setMessages(load(owner))
  }
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [ai, setAi] = useState(null)
  const listRef = useRef(null)
  const inputRef = useRef(null)
  const launcherRef = useRef(null)
  const messagesRef = useRef(messages)
  messagesRef.current = messages

  useEffect(() => save(loadedFor, messages), [loadedFor, messages])

  // Les réponses sont-elles rédigées par l'IA, ou tirées de la FAQ ?
  useEffect(() => {
    if (!open || ai !== null) return
    api.get('/assistant/status').then((s) => setAi(!!s.ai)).catch(() => setAi(false))
  }, [open, ai])

  // Défilement vers le dernier message
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages, busy, open])

  const send = useCallback(async (text) => {
    const question = text.trim().slice(0, 1000)
    if (!question || busy) return
    const next = [...messagesRef.current.filter((m) => !m.error), { role: 'user', content: question }]
    setMessages(next)
    setInput('')
    setBusy(true)
    try {
      let reply
      if (STATIC_DEMO) {
        reply = { reply: await localAnswer(question), mode: 'faq' }
      } else {
        try {
          reply = await api.post('/assistant/chat', { messages: next.map(({ role, content }) => ({ role, content })) })
        } catch (e) {
          // Serveur injoignable : réponse de la FAQ ; quota dépassé ou question invalide : message du serveur
          if (e.status && e.status < 500) throw e
          reply = { reply: await localAnswer(question), mode: 'faq' }
        }
      }
      setMessages((m) => [...m, { role: 'assistant', content: reply.reply, mode: reply.mode }])
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: e.message || "Le message n'a pas pu être envoyé. Réessayez.", error: true }])
    } finally {
      setBusy(false)
    }
  }, [busy])

  // Ouverture depuis un autre bouton du site (« Poser ma question »…)
  useEffect(() => {
    const onOpen = (e) => {
      setOpen(true)
      const q = e.detail?.question
      if (q) send(q)
      else setTimeout(() => inputRef.current?.focus(), 150)
    }
    window.addEventListener(OPEN_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_EVENT, onOpen)
  }, [send])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && close()
    document.addEventListener('keydown', onKey)
    setTimeout(() => inputRef.current?.focus(), 150)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const close = () => { setOpen(false); launcherRef.current?.focus() }
  const reset = () => { setMessages([]); setInput(''); inputRef.current?.focus() }
  const suggestions = SUGGESTIONS[user?.role ?? 'visitor'] ?? SUGGESTIONS.visitor
  // Sur mobile, un lien suivi ferme la fenêtre pour laisser voir la page
  const onNavigate = () => { if (window.innerWidth < 640) setOpen(false) }
  const lift = placement === 'dashboard' ? 'bottom-20 lg:bottom-6' : 'bottom-4'

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-controls="aluni-assistant"
        aria-label={open ? "Fermer l'assistant" : "Poser une question à l'assistant ALuNI"}
        className={cx(
          'group fixed right-4 z-40 flex h-14 items-center gap-2 rounded-full bg-brand-600 pr-5 pl-4 text-white shadow-xl shadow-brand-900/25 ring-4 ring-white transition hover:-translate-y-0.5 hover:bg-brand-700',
          lift, open && 'max-sm:hidden',
        )}
      >
        {open ? <X className="size-6" /> : <MessageCircleQuestion className="size-6" />}
        <span className="text-sm font-bold">{open ? 'Fermer' : 'Une question ?'}</span>
        {!open && <span className="absolute -top-0.5 -right-0.5 size-3.5 rounded-full bg-flame-400 ring-2 ring-white" aria-hidden />}
      </button>

      {open && createPortal(
        <section
          id="aluni-assistant"
          role="dialog"
          aria-label="Assistant ALuNI"
          className={cx(
            'animate-fade-up fixed z-50 flex flex-col overflow-hidden bg-white shadow-2xl ring-1 ring-gray-200',
            'inset-0 sm:inset-auto sm:right-4 sm:h-[min(640px,calc(100dvh-7.5rem))] sm:w-[400px] sm:rounded-2xl',
            placement === 'dashboard' ? 'sm:bottom-24 lg:bottom-24' : 'sm:bottom-22',
          )}
          style={{ '--delay': '0ms' }}
        >
          {/* En-tête */}
          <header className="flex items-center gap-3 bg-gradient-to-r from-brand-800 to-brand-600 px-4 py-3 text-white">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white p-1.5"><img src={icon} alt="" className="h-full" /></span>
            <div className="min-w-0 flex-1">
              <p className="font-bold">Assistant ALuNI</p>
              <p className="truncate text-xs text-brand-100">{ai === false ? 'Réponses de la FAQ de l’Académie' : 'Vos questions sur la plateforme'}</p>
            </div>
            {messages.length > 0 && (
              <button type="button" onClick={reset} className="rounded-lg p-2 text-brand-100 hover:bg-white/10 hover:text-white" aria-label="Nouvelle conversation" title="Nouvelle conversation">
                <RotateCcw className="size-4.5" />
              </button>
            )}
            <button type="button" onClick={close} className="rounded-lg p-2 text-brand-100 hover:bg-white/10 hover:text-white" aria-label="Fermer l'assistant"><X className="size-5" /></button>
          </header>
          <div className="h-1 bg-flame-400" aria-hidden />

          {/* Conversation */}
          <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto bg-gray-50 px-4 py-4" aria-live="polite">
            <Bubble role="assistant">
              <p>Bonjour{user?.firstName ? ` ${user.firstName}` : ''} ! Je suis l'assistant de la plateforme ALuNI.</p>
              <p>Posez-moi vos questions sur l'inscription, les formations, les examens ou les certificats.</p>
            </Bubble>
            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2 pl-9">
                {suggestions.map((s) => (
                  <button key={s} type="button" onClick={() => send(s)}
                    className="rounded-full border border-brand-200 bg-white px-3 py-1.5 text-left text-sm font-medium text-brand-800 transition hover:border-brand-400 hover:bg-brand-50">
                    {s}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <Bubble key={i} role={m.role} error={m.error}>
                {m.role === 'user' ? <p className="whitespace-pre-line">{m.content}</p> : <Rich text={m.content} onNavigate={onNavigate} />}
              </Bubble>
            ))}
            {busy && (
              <Bubble role="assistant">
                <span className="flex gap-1 py-1" aria-label="L'assistant écrit">
                  {[0, 1, 2].map((d) => <span key={d} className="size-2 animate-bounce rounded-full bg-brand-400" style={{ animationDelay: `${d * 150}ms` }} />)}
                </span>
              </Bubble>
            )}
          </div>

          {/* Saisie */}
          <form onSubmit={(e) => { e.preventDefault(); send(input) }} className="border-t border-gray-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="flex items-end gap-2 rounded-2xl border border-gray-300 bg-white p-1.5 pl-3 focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-100">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
                rows={1}
                maxLength={1000}
                placeholder="Écrivez votre question…"
                aria-label="Votre question"
                className="max-h-28 min-h-9 flex-1 resize-none bg-transparent py-1.5 text-[15px] outline-none field-sizing-content"
              />
              <button type="submit" disabled={busy || !input.trim()} aria-label="Envoyer"
                className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-700 disabled:bg-gray-200 disabled:text-gray-400">
                <ArrowUp className="size-5" />
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] leading-snug text-gray-500">
              {ai === false ? 'Réponses tirées de la FAQ.' : 'Assistant automatique : il peut se tromper.'}{' '}
              Besoin d'une personne ? <Link to="/contact" onClick={onNavigate} className="font-semibold text-brand-700 hover:underline">Contactez l'Académie</Link>
              {academy.phone && <> ou appelez le <a href={`tel:${academy.phone.replace(/\s/g, '')}`} className="font-semibold text-brand-700 hover:underline">{academy.phone}</a></>}.
            </p>
          </form>
        </section>,
        document.body,
      )}
    </>
  )
}

function Bubble({ role, error, children }) {
  const mine = role === 'user'
  return (
    <div className={cx('flex items-end gap-2', mine && 'justify-end')}>
      {!mine && <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white p-1 ring-1 ring-gray-200"><img src={icon} alt="" className="h-full" /></span>}
      <div className={cx(
        'max-w-[85%] space-y-2 rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed',
        mine ? 'rounded-br-md bg-brand-600 text-white' : error ? 'rounded-bl-md bg-red-50 text-red-800 ring-1 ring-red-200' : 'rounded-bl-md bg-white text-gray-800 shadow-sm ring-1 ring-gray-100',
      )}>
        {children}
      </div>
    </div>
  )
}
