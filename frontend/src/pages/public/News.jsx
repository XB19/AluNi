import { Link, useParams } from 'react-router'
import { ArrowLeft, Calendar, Newspaper } from 'lucide-react'
import { formatDate } from '../../data/constants'
import { useApi } from '../../api/useApi'
import { fileUrl } from '../../api/client'
import { Async, Badge, EmptyState, ErrorState, Loading } from '../../components/ui'
import { NewsCover } from './Home'
import NotFound from './NotFound'

export function NewsList() {
  const state = useApi('/news')
  return (
    <div className="container-page py-10">
      <h1 className="text-3xl font-extrabold tracking-tight">Actualités et événements</h1>
      <p className="mt-1 text-gray-600">Sessions de formation, remises de certificats et vie de l'Académie.</p>
      <div className="mt-8">
        <Async state={state}>
          {(news) => {
            if (!news.length) return <EmptyState icon={Newspaper} title="Aucune actualité pour le moment" />
            const [first, ...rest] = news
            return (
              <>
                <Link to={`/actualites/${first.slug}`} className="group grid overflow-hidden rounded-3xl border border-gray-200 md:grid-cols-2">
                  <NewsCover item={first} index={0} className="min-h-52 p-6" />
                  <div className="p-6 sm:p-8">
                    <p className="flex items-center gap-2 text-sm text-gray-500"><Calendar className="size-4" />{formatDate(first.date)}</p>
                    <h2 className="mt-2 text-2xl font-extrabold group-hover:text-brand-700">{first.title}</h2>
                    <p className="mt-3 text-gray-700">{first.excerpt}</p>
                    <span className="mt-5 inline-block font-bold text-brand-700">Lire la suite →</span>
                  </div>
                </Link>
                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  {rest.map((n, i) => (
                    <Link key={n.slug} to={`/actualites/${n.slug}`} className="group flex gap-4 rounded-2xl border border-gray-200 p-4 hover:shadow-md">
                      <NewsCover item={{ ...n, category: null }} index={i + 1} className="w-24 shrink-0 rounded-xl sm:w-32" />
                      <div>
                        {n.category && <Badge>{n.category}</Badge>}
                        <h3 className="mt-2 font-bold group-hover:text-brand-700">{n.title}</h3>
                        <p className="mt-1 text-sm text-gray-500">{formatDate(n.date)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )
          }}
        </Async>
      </div>
    </div>
  )
}

export function NewsDetail() {
  const { slug } = useParams()
  const state = useApi(`/news/${slug}`)
  if (state.loading && !state.data) return <Loading className="min-h-[50vh]" />
  if (state.error?.status === 404) return <NotFound />
  if (state.error) return <div className="container-page py-10"><ErrorState error={state.error} onRetry={state.reload} /></div>
  const n = state.data
  if (!n) return null
  return (
    <article className="container-page max-w-3xl py-10">
      <Link to="/actualites" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"><ArrowLeft className="size-4" />Toutes les actualités</Link>
      {n.category && <Badge tone="green" className="mt-6">{n.category}</Badge>}
      <h1 className="mt-3 text-3xl leading-tight font-extrabold sm:text-4xl">{n.title}</h1>
      <p className="mt-3 flex items-center gap-2 text-gray-500"><Calendar className="size-4" />{formatDate(n.date)}</p>
      {n.image ? (
        <img src={fileUrl(n.image)} alt="" className="my-8 aspect-[16/7] w-full rounded-3xl object-cover" />
      ) : (
        <div className="my-8 aspect-[16/7] rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800" />
      )}
      <div className="prose-lesson text-lg">
        {n.body.map((p) => <p key={p}>{p}</p>)}
      </div>
    </article>
  )
}
