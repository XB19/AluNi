import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { SearchX, SlidersHorizontal, X } from 'lucide-react'
import { CERT_TYPES, LEVELS } from '../../data/constants'
import { useApi } from '../../api/useApi'
import { qs } from '../../api/client'
import { CourseCard } from '../../components/CourseCard'
import { Button, EmptyState, ErrorState } from '../../components/ui'
import { CourseGridSkeleton } from '../../components/Motion'

const DURATIONS = [
  { id: 'court', label: 'Moins de 15 h', test: (h) => h < 15 },
  { id: 'moyen', label: '15 à 25 h', test: (h) => h >= 15 && h <= 25 },
  { id: 'long', label: 'Plus de 25 h', test: (h) => h > 25 },
]

function FilterGroup({ title, options, selected, onToggle }) {
  return (
    <fieldset className="border-b border-gray-200 py-5 first:pt-0">
      <legend className="mb-3 text-[15px] font-bold">{title}</legend>
      <div className="space-y-2.5">
        {options.map((o) => (
          <label key={o.id} className="flex cursor-pointer items-center gap-3 text-[15px] text-gray-700">
            <input
              type="checkbox"
              checked={selected.includes(o.id)}
              onChange={() => onToggle(o.id)}
              className="size-4.5 rounded border-gray-300 accent-brand-600"
            />
            <span className="flex-1">{o.label}</span>
            {o.count != null && <span className="text-sm text-gray-400">{o.count}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export default function Catalog() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const get = (k) => params.getAll(k)
  const [sort, setSort] = useState('popular')
  const [sheet, setSheet] = useState(false)
  const coursesState = useApi('/courses' + qs({ q, sort }))
  const categories = useApi('/categories').data ?? []
  const all = coursesState.data ?? []

  const toggle = (key, value) => {
    const next = new URLSearchParams(params)
    const values = next.getAll(key)
    next.delete(key)
    ;(values.includes(value) ? values.filter((v) => v !== value) : [...values, value]).forEach((v) => next.append(key, v))
    setParams(next, { replace: true })
  }
  const clearAll = () => setParams(q ? { q } : {}, { replace: true })

  const filters = { categorie: get('categorie'), niveau: get('niveau'), certif: get('certif'), duree: get('duree') }
  const activeCount = Object.values(filters).flat().length

  const results = useMemo(
    () =>
      all.filter(
        (c) =>
          (!filters.categorie.length || filters.categorie.includes(c.category)) &&
          (!filters.niveau.length || filters.niveau.includes(c.level)) &&
          (!filters.certif.length || c.certTypes.some((t) => filters.certif.includes(t))) &&
          (!filters.duree.length || DURATIONS.filter((d) => filters.duree.includes(d.id)).some((d) => d.test(c.hours))),
      ),
    [all, params],
  )

  const panel = (
    <>
      <FilterGroup title="Domaine" selected={filters.categorie} onToggle={(v) => toggle('categorie', v)}
        options={categories.map((c) => ({ id: c.id, label: c.name, count: all.filter((x) => x.category === c.id).length }))} />
      <FilterGroup title="Niveau" selected={filters.niveau} onToggle={(v) => toggle('niveau', v)}
        options={LEVELS.map((l) => ({ id: l, label: l, count: all.filter((x) => x.level === l).length }))} />
      <FilterGroup title="Type de certification" selected={filters.certif} onToggle={(v) => toggle('certif', v)}
        options={Object.entries(CERT_TYPES).map(([id, t]) => ({ id, label: t.label }))} />
      <FilterGroup title="Durée" selected={filters.duree} onToggle={(v) => toggle('duree', v)} options={DURATIONS} />
    </>
  )

  return (
    <div className="container-page py-8 lg:py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          {q ? <>Résultats pour « {q} »</> : 'Catalogue des formations'}
        </h1>
        <p className="mt-1 text-gray-600">Trouvez la formation qui vous correspond et commencez dès aujourd'hui.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[250px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-28">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold">Filtrer par</h2>
              {activeCount > 0 && <button onClick={clearAll} className="text-sm font-semibold text-brand-700 hover:underline">Effacer</button>}
            </div>
            {panel}
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <button onClick={() => setSheet(true)} className="flex h-10 items-center gap-2 rounded-full border border-gray-300 px-4 text-sm font-semibold lg:hidden">
              <SlidersHorizontal className="size-4" /> Filtres {activeCount > 0 && <span className="rounded-full bg-brand-600 px-1.5 text-xs text-white">{activeCount}</span>}
            </button>
            <p className="text-sm text-gray-600"><strong className="text-ink">{results.length}</strong> formation{results.length > 1 ? 's' : ''}</p>
            <label className="ml-auto flex items-center gap-2 text-sm text-gray-600">
              Trier par
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-10 rounded-lg border border-gray-300 bg-white px-3 font-semibold text-ink">
                <option value="popular">Les plus suivies</option>
                <option value="rating">Les mieux notées</option>
                <option value="short">Les plus courtes</option>
                <option value="recent">Les plus récentes</option>
              </select>
            </label>
          </div>

          {activeCount > 0 && (
            <div className="mb-5 flex flex-wrap gap-2">
              {Object.entries(filters).flatMap(([k, vals]) =>
                vals.map((v) => (
                  <button key={k + v} onClick={() => toggle(k, v)} className="flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-800 hover:bg-brand-100">
                    {categories.find((c) => c.id === v)?.name ?? CERT_TYPES[v]?.label ?? DURATIONS.find((d) => d.id === v)?.label ?? v}
                    <X className="size-3.5" />
                  </button>
                )),
              )}
            </div>
          )}

          {coursesState.loading && !coursesState.data ? (
            <CourseGridSkeleton />
          ) : coursesState.error ? (
            <ErrorState error={coursesState.error} onRetry={coursesState.reload} />
          ) : results.length ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((c, i) => (
                <div key={`${params.toString()}-${sort}-${c.slug}`} className="animate-fade-up" style={{ '--delay': `${Math.min(i, 8) * 60}ms` }}>
                  <CourseCard course={c} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={SearchX} title="Aucune formation trouvée" text="Essayez un autre mot-clé ou retirez quelques filtres."
              action={<Button variant="outline" onClick={() => setParams({})}>Réinitialiser la recherche</Button>} />
          )}
        </div>
      </div>

      {sheet && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSheet(false)} />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-3xl bg-white">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="text-lg font-bold">Filtres</h2>
              <button onClick={() => setSheet(false)} className="rounded-lg p-1.5 hover:bg-gray-100" aria-label="Fermer"><X className="size-5" /></button>
            </div>
            <div className="overflow-y-auto px-5 py-5">{panel}</div>
            <div className="grid grid-cols-2 gap-3 border-t border-gray-100 p-4">
              <Button variant="outline-gray" onClick={clearAll}>Effacer</Button>
              <Button onClick={() => setSheet(false)}>Voir {results.length} résultat{results.length > 1 ? 's' : ''}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
