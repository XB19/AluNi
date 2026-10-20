import { useState } from 'react'

// Histogramme vertical à une seule série (une seule teinte : la couleur de la marque)
export function ColumnChart({ data, label, unit = '' }) {
  const [hover, setHover] = useState(null)
  const max = Math.max(1, ...data.map((d) => d.value))
  const step = max <= 10 ? 2 : max <= 50 ? 10 : max <= 200 ? 50 : 100
  const top = Math.ceil(max / step) * step
  const ticks = [0, top / 2, top]
  const last = data.length - 1

  return (
    <figure>
      <div className="relative flex h-56 gap-3">
        <div className="flex flex-col justify-between pb-6 text-right text-xs text-gray-400 tabular-nums">
          {[...ticks].reverse().map((t) => <span key={t} className="-translate-y-1/2">{t}</span>)}
        </div>
        <div className="relative flex-1">
          <div className="absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between">
            {ticks.map((t) => <div key={t} className="border-t border-gray-100" />)}
          </div>
          <div className="absolute inset-x-0 top-0 bottom-6 flex items-end gap-[2px]">
            {data.map((d, i) => (
              <div
                key={d.label}
                className="relative flex h-full flex-1 cursor-default items-end justify-center"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                <div
                  className={`w-full max-w-9 rounded-t transition-colors ${hover === i ? 'bg-brand-700' : 'bg-brand-500'}`}
                  style={{ height: `${(d.value / top) * 100}%` }}
                />
                {(hover === i || (hover == null && i === last)) && (
                  <div className="pointer-events-none absolute z-10 -translate-y-2 rounded-lg bg-ink px-2.5 py-1.5 text-xs whitespace-nowrap text-white shadow-lg" style={{ bottom: `${(d.value / top) * 100}%` }}>
                    <span className="font-bold">{d.value}{unit}</span> · {d.label}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-0 flex gap-[2px]">
            {data.map((d) => <span key={d.label} className="flex-1 text-center text-[11px] text-gray-500">{d.label}</span>)}
          </div>
        </div>
      </div>
      <table className="sr-only">
        <caption>{label}</caption>
        <tbody>{data.map((d) => <tr key={d.label}><th>{d.label}</th><td>{d.value}{unit}</td></tr>)}</tbody>
      </table>
    </figure>
  )
}

// Barres horizontales étiquetées (comparaison de grandeurs entre catégories)
export function BarList({ data, unit = '', max }) {
  const top = max ?? Math.max(...data.map((d) => d.value))
  return (
    <ul className="space-y-3.5">
      {data.map((d) => (
        <li key={d.label} title={`${d.label} : ${d.value}${unit}`}>
          <div className="mb-1 flex justify-between gap-3 text-sm">
            <span className="truncate text-gray-700">{d.label}</span>
            <span className="font-bold text-ink tabular-nums">{d.value}{unit}</span>
          </div>
          <div className="h-2.5 rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${(d.value / top) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}
