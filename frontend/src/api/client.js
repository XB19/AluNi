// Client HTTP de l'API ALuNI (Spring Boot).
// En développement, Vite redirige /api et /files vers http://localhost:8080 (voir vite.config.js).
import { readStore, writeStore } from '../context/storage'

const BASE = import.meta.env.VITE_API_URL ?? ''
const TOKEN_KEY = 'aluni-token'

export class ApiError extends Error {
  constructor(status, message, fields) {
    super(message)
    this.status = status
    this.fields = fields ?? {}
  }
}

export const getToken = () => readStore(TOKEN_KEY, null)
export const setToken = (token) => writeStore(TOKEN_KEY, token)

/** URL absolue d'un fichier servi par le backend (/files/...). */
export const fileUrl = (path) => (!path ? null : /^https?:/.test(path) ? path : BASE + path)

// Vitrine statique (déploiement Vercel sans serveur) : données publiques capturées dans public/demo/
// par scripts/snapshot-demo.mjs ; les actions (connexion, inscription, formulaires) sont indisponibles.
export const STATIC_DEMO = import.meta.env.VITE_DEMO_STATIC === 'true'
const DEMO_MESSAGE =
  "Ceci est la version de présentation du site : la connexion, l'inscription et les formulaires seront disponibles à la mise en service de la plateforme."

const fold = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const DEMO_SORTS = {
  rating: (a, b) => b.rating - a.rating,
  short: (a, b) => a.hours - b.hours,
  recent: (a, b) => b.id - a.id,
  popular: (a, b) => b.popular - a.popular || b.learners - a.learners,
}

async function demoRequest(method, path, signal) {
  if (method !== 'GET') throw new ApiError(503, DEMO_MESSAGE)
  const [pathname, query = ''] = path.split('?')
  let res
  try {
    res = await fetch(`/demo${pathname}.json`, { signal })
  } catch (e) {
    if (e.name === 'AbortError') throw e
    throw new ApiError(0, 'Impossible de charger la page. Vérifiez votre connexion internet.')
  }
  // Vite et Vercel renvoient index.html pour un fichier absent : on vérifie le type
  if (!res.ok || !(res.headers.get('content-type') ?? '').includes('json')) {
    throw new ApiError(pathname.startsWith('/me') || pathname.startsWith('/auth') ? 401 : 404, pathname.startsWith('/certificates') ? 'Certificat introuvable.' : 'Ressource introuvable.')
  }
  const data = await res.json()
  if (pathname !== '/courses') return data
  const params = new URLSearchParams(query)
  const term = fold(params.get('q')).trim()
  const list = term ? data.filter((c) => fold([c.title, c.short, c.categoryName].join(' ')).includes(term)) : [...data]
  return list.sort(DEMO_SORTS[params.get('sort')] ?? DEMO_SORTS.popular)
}

async function request(method, path, { body, headers = {}, raw = false, signal } = {}) {
  if (STATIC_DEMO) return demoRequest(method, path, signal)
  const token = getToken()
  const isForm = body instanceof FormData
  let res
  try {
    res = await fetch(BASE + '/api' + path, {
      method,
      signal,
      headers: {
        ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    })
  } catch (e) {
    if (e.name === 'AbortError') throw e
    throw new ApiError(0, 'Impossible de joindre le serveur. Vérifiez votre connexion internet.')
  }

  if (res.status === 401 && token) {
    // Jeton expiré ou invalide : on déconnecte proprement
    setToken(null)
    window.dispatchEvent(new Event('aluni:logout'))
  }
  if (!res.ok) {
    let data = {}
    try {
      data = await res.json()
    } catch {
      /* pas de corps JSON */
    }
    throw new ApiError(res.status, data.message ?? 'Une erreur est survenue.', data.fields)
  }
  if (raw) return res
  if (res.status === 204) return null
  const type = res.headers.get('content-type') ?? ''
  return type.includes('application/json') ? res.json() : null
}

export const api = {
  get: (path, opts) => request('GET', path, opts),
  post: (path, body, opts) => request('POST', path, { ...opts, body }),
  put: (path, body, opts) => request('PUT', path, { ...opts, body }),
  patch: (path, body, opts) => request('PATCH', path, { ...opts, body }),
  del: (path, opts) => request('DELETE', path, opts),
  upload: (path, file, extra = {}) => {
    const form = new FormData()
    form.append('file', file)
    Object.entries(extra).forEach(([k, v]) => form.append(k, v))
    return request('POST', path, { body: form })
  },
  /** Télécharge un fichier protégé (PDF, Excel…) et déclenche son enregistrement. */
  download: async (path, fallbackName) => {
    const res = await request('GET', path, { raw: true })
    const disposition = res.headers.get('content-disposition') ?? ''
    const match = /filename\*=UTF-8''([^;]+)/.exec(disposition) ?? /filename="?([^";]+)"?/.exec(disposition)
    const name = match ? decodeURIComponent(match[1]) : fallbackName
    const url = URL.createObjectURL(await res.blob())
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  },
}

/** Construit une chaîne de requête en ignorant les valeurs vides. */
export const qs = (params) => {
  const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString()
  return s ? `?${s}` : ''
}
