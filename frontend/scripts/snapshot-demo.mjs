// Capture les données publiques du backend dans public/demo/ pour la vitrine statique (Vercel, sans serveur).
// Usage : backend lancé sur :8080, puis  node scripts/snapshot-demo.mjs
// Variables facultatives : API (défaut http://localhost:8080), ADMIN_EMAIL / ADMIN_PASSWORD pour lister les certificats.
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const API = process.env.API ?? 'http://localhost:8080'
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'demo')
const files = new Set()

// Les chemins /files/... (images) sont copiés et réécrits vers /demo/files/...
const relink = (value) => {
  if (typeof value === 'string' && value.startsWith('/files/')) {
    files.add(value)
    return '/demo' + value
  }
  if (Array.isArray(value)) return value.map(relink)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, relink(v)]))
  return value
}

async function get(path, token) {
  const res = await fetch(API + '/api' + path, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  if (!res.ok) throw new Error(`${path} → ${res.status}`)
  return res.json()
}

async function save(path, data) {
  const file = join(OUT, path + '.json')
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, JSON.stringify(relink(data)))
  console.log('  ✓', path)
}

await rm(OUT, { recursive: true, force: true })
console.log('Capture de', API)

for (const path of ['/site/settings', '/categories', '/courses', '/news', '/faq', '/partners', '/trainers']) {
  await save(path, await get(path))
}
for (const c of await get('/courses')) await save(`/courses/${c.slug}`, await get(`/courses/${c.slug}`))
for (const n of await get('/news')) await save(`/news/${n.slug}`, await get(`/news/${n.slug}`))

// Certificats : la liste n'est pas publique, on passe par un compte administrateur si fourni
const email = process.env.ADMIN_EMAIL
const password = process.env.ADMIN_PASSWORD
if (email && password) {
  const res = await fetch(API + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: email, password }),
  })
  const { token } = await res.json()
  const certs = await get('/admin/certificates', token)
  for (const c of certs) await save(`/certificates/verify/${c.code}`, await get(`/certificates/verify/${encodeURIComponent(c.code)}`))
}

for (const f of files) {
  const res = await fetch(API + f)
  if (!res.ok) continue
  const dest = join(OUT, f)
  await mkdir(dirname(dest), { recursive: true })
  await writeFile(dest, Buffer.from(await res.arrayBuffer()))
  console.log('  ✓', f)
}
console.log('Terminé →', OUT)
