import { Link } from 'react-router'
import { Award, Bell, BookOpen, CheckCheck, ClipboardCheck, FileCheck, UserCheck } from 'lucide-react'
import { formatDate } from '../../data/constants'
import { api } from '../../api/client'
import { useApi } from '../../api/useApi'
import { Async, Button, cx, EmptyState, PageHeader } from '../../components/ui'

const ICONS = {
  exam: [ClipboardCheck, 'bg-flame-50 text-flame-600'],
  lesson: [BookOpen, 'bg-blue-50 text-blue-700'],
  certificate: [Award, 'bg-gold-100 text-gold-700'],
  enrollment: [UserCheck, 'bg-brand-50 text-brand-700'],
  grade: [FileCheck, 'bg-violet-50 text-violet-700'],
  account: [Bell, 'bg-gray-100 text-gray-700'],
  course: [BookOpen, 'bg-brand-50 text-brand-700'],
}

export default function Notifications() {
  const state = useApi('/me/notifications')
  const markAll = async () => {
    await api.post('/me/notifications/read-all')
    state.setData((list) => list.map((n) => ({ ...n, read: true })))
  }
  const markOne = (n) => {
    if (n.read) return
    api.post(`/me/notifications/${n.id}/read`).catch(() => {})
    state.setData((list) => list.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
  }

  return (
    <>
      <PageHeader
        title="Notifications"
        actions={state.data?.some((n) => !n.read) && <Button variant="ghost" size="sm" onClick={markAll}><CheckCheck className="size-4" />Tout marquer comme lu</Button>}
      />
      <Async state={state}>
        {(items) =>
          items.length ? (
            <div className="card divide-y divide-gray-100">
              {items.map((n) => {
                const [Icon, tone] = ICONS[n.type] ?? ICONS.account
                const content = (
                  <>
                    <span className={cx('flex size-11 shrink-0 items-center justify-center rounded-full', tone)}><Icon className="size-5" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 font-bold">{n.title}{!n.read && <span className="size-2 rounded-full bg-flame-500" aria-label="non lue" />}</p>
                      <p className="mt-0.5 text-gray-700">{n.text}</p>
                      <p className="mt-1 text-sm text-gray-500">{formatDate(n.date)}</p>
                    </div>
                  </>
                )
                const cls = cx('flex w-full gap-4 p-5 text-left hover:bg-gray-50', !n.read && 'bg-brand-50/40')
                return n.link ? (
                  <Link key={n.id} to={n.link} onClick={() => markOne(n)} className={cls}>{content}</Link>
                ) : (
                  <button key={n.id} onClick={() => markOne(n)} className={cls}>{content}</button>
                )
              })}
            </div>
          ) : (
            <EmptyState icon={Bell} title="Aucune notification" text="Vous serez prévenu ici des nouvelles leçons, examens et certificats." />
          )
        }
      </Async>
    </>
  )
}
