import { useState } from 'react'
import { Link } from 'react-router'
import { BookOpen } from 'lucide-react'
import { useApi } from '../../api/useApi'
import { CourseCard, CourseCover } from '../../components/CourseCard'
import { Async, Badge, Button, EmptyState, PageHeader, Tabs } from '../../components/ui'

export default function MyCourses() {
  const state = useApi('/me/enrollments')
  const [tab, setTab] = useState('cours')

  return (
    <>
      <PageHeader title="Mes formations" actions={<Button to="/formations" variant="outline">Trouver une formation</Button>} />
      <Async state={state}>
        {(enrollments) => {
          const groups = {
            cours: enrollments.filter((e) => e.status === 'actif' && e.progress < 100),
            terminees: enrollments.filter((e) => e.status === 'actif' && e.progress === 100),
            attente: enrollments.filter((e) => e.status === 'en-attente'),
          }
          const list = groups[tab]
          return (
            <>
              <Tabs
                className="mb-6"
                value={tab}
                onChange={setTab}
                tabs={[
                  { value: 'cours', label: 'En cours', count: groups.cours.length },
                  { value: 'terminees', label: 'Terminées', count: groups.terminees.length },
                  { value: 'attente', label: 'En attente', count: groups.attente.length },
                ]}
              />
              {!list.length ? (
                <EmptyState icon={BookOpen} title="Rien ici pour le moment"
                  text={tab === 'attente' ? 'Aucune inscription en attente de validation.' : 'Inscrivez-vous à une formation pour commencer.'}
                  action={<Button to="/formations">Explorer le catalogue</Button>} />
              ) : tab === 'attente' ? (
                <div className="space-y-3">
                  {list.map((e) => (
                    <Link key={e.id} to={`/formations/${e.course.slug}`} className="card flex items-center gap-4 p-4">
                      <CourseCover course={e.course} className="size-16 shrink-0 rounded-xl" iconSize="size-7" />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold">{e.course.title}</p>
                        <p className="text-sm text-gray-600">Votre demande a été transmise. Vous serez notifié dès sa validation.</p>
                      </div>
                      <Badge tone="amber">En attente</Badge>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {list.map((e) => <CourseCard key={e.id} course={e.course} progress={e.progress} to={`/apprendre/${e.course.slug}`} />)}
                </div>
              )}
            </>
          )
        }}
      </Async>
    </>
  )
}
