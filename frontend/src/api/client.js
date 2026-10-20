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

async function request(method, path, { body, headers = {}, raw = false, signal } = {}) {
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
