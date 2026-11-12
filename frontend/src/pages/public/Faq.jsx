import { useState } from 'react'
import { ChevronDown, MessageCircle, MessageCircleQuestion } from 'lucide-react'
import { openAssistant } from '../../components/Assistant'
import { useApi } from '../../api/useApi'
import { Async, Button, cx } from '../../components/ui'

export default function Faq() {
  const state = useApi('/faq')
  const [tag, setTag] = useState('Toutes')
  const [open, setOpen] = useState(0)

  return (
    <div className="container-page max-w-3xl py-12">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Questions fréquentes</h1>
      <p className="mt-2 text-gray-600">Les réponses aux questions les plus posées sur l'Académie, les formations et les certificats.</p>

      <Async state={state}>
        {(faq) => {
          const tags = ['Toutes', ...new Set(faq.map((f) => f.tag).filter(Boolean))]
          const list = faq.filter((f) => tag === 'Toutes' || f.tag === tag)
          return (
            <>
              {/* Les filtres passent à la ligne : aucun n'est coupé, quelle que soit la largeur d'écran */}
              <div className="mt-8 flex flex-wrap gap-2">
                {tags.map((t) => (
                  <button key={t} onClick={() => { setTag(t); setOpen(0) }} aria-pressed={tag === t}
                    className={cx('rounded-full border px-4 py-2 text-sm font-semibold transition', tag === t ? 'border-brand-600 bg-brand-600 text-white' : 'border-gray-300 text-gray-700 hover:border-brand-300 hover:text-brand-700')}>
                    {t}
                  </button>
                ))}
              </div>
              <div className="mt-6 divide-y divide-gray-200 rounded-2xl border border-gray-200">
                {list.map((f, i) => (
                  <div key={f.id}>
                    <button onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i} className="flex w-full items-center gap-4 px-5 py-5 text-left">
                      <span className="flex-1 font-bold">{f.q}</span>
                      <ChevronDown className={cx('size-5 shrink-0 text-gray-500 transition', open === i && 'rotate-180')} />
                    </button>
                    {open === i && <p className="px-5 pb-5 leading-relaxed whitespace-pre-line text-gray-700">{f.a}</p>}
                  </div>
                ))}
              </div>
            </>
          )
        }}
      </Async>

      <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl bg-brand-50 p-8 text-center">
        <MessageCircle className="size-8 text-brand-600" />
        <p className="text-lg font-bold">Vous ne trouvez pas votre réponse ?</p>
        <p className="text-gray-600">Posez votre question à l'assistant : il vous répond tout de suite.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={() => openAssistant()}><MessageCircleQuestion className="size-5" />Demander à l'assistant</Button>
          <Button to="/contact" variant="outline-gray">Contacter l'Académie</Button>
        </div>
      </div>
    </div>
  )
}
