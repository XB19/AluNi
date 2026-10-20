import { lazy, Suspense } from 'react'
import { createBrowserRouter, Outlet, RouterProvider, ScrollRestoration } from 'react-router'
import { AuthProvider } from './context/AuthContext'
import { SettingsProvider } from './context/SettingsContext'
import PublicLayout from './layouts/PublicLayout'
import DashboardLayout from './layouts/DashboardLayout'
import { PageLoader } from './components/PageLoader'

import Home from './pages/public/Home'
import Catalog from './pages/public/Catalog'
import CourseDetail from './pages/public/CourseDetail'
import NotFound from './pages/public/NotFound'

const About = lazy(() => import('./pages/public/About'))
const NewsDetail = lazy(() => import('./pages/public/News').then((m) => ({ default: m.NewsDetail })))
const NewsList = lazy(() => import('./pages/public/News').then((m) => ({ default: m.NewsList })))
const Contact = lazy(() => import('./pages/public/Contact'))
const VerifyCertificate = lazy(() => import('./pages/public/VerifyCertificate'))
const Faq = lazy(() => import('./pages/public/Faq'))

const Login = lazy(() => import('./pages/auth/Login'))
const Register = lazy(() => import('./pages/auth/Register'))
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'))

const LearnerDashboard = lazy(() => import('./pages/learner/Dashboard'))
const MyCourses = lazy(() => import('./pages/learner/MyCourses'))
const Exams = lazy(() => import('./pages/learner/Exams'))
const CertificateView = lazy(() => import('./pages/learner/Certificates').then((m) => ({ default: m.CertificateView })))
const MyCertificates = lazy(() => import('./pages/learner/Certificates').then((m) => ({ default: m.MyCertificates })))
const Notifications = lazy(() => import('./pages/learner/Notifications'))
const CoursePlayer = lazy(() => import('./pages/learner/CoursePlayer'))
const Exam = lazy(() => import('./pages/learner/Exam'))
const Profile = lazy(() => import('./pages/Profile'))

const Grading = lazy(() => import('./pages/trainer/TrainerPages').then((m) => ({ default: m.Grading })))
const QuestionBank = lazy(() => import('./pages/trainer/TrainerPages').then((m) => ({ default: m.QuestionBank })))
const TrainerCourses = lazy(() => import('./pages/trainer/TrainerPages').then((m) => ({ default: m.TrainerCourses })))
const TrainerDashboard = lazy(() => import('./pages/trainer/TrainerPages').then((m) => ({ default: m.TrainerDashboard })))
const TrainerLearners = lazy(() => import('./pages/trainer/TrainerPages').then((m) => ({ default: m.TrainerLearners })))
const CourseEditor = lazy(() => import('./pages/trainer/CourseEditor'))

const AdminCertificates = lazy(() => import('./pages/admin/AdminPages').then((m) => ({ default: m.AdminCertificates })))
const AdminCourses = lazy(() => import('./pages/admin/AdminPages').then((m) => ({ default: m.AdminCourses })))
const AdminDashboard = lazy(() => import('./pages/admin/AdminPages').then((m) => ({ default: m.AdminDashboard })))
const AdminReports = lazy(() => import('./pages/admin/AdminPages').then((m) => ({ default: m.AdminReports })))
const AdminSite = lazy(() => import('./pages/admin/AdminPages').then((m) => ({ default: m.AdminSite })))
const AdminUsers = lazy(() => import('./pages/admin/AdminPages').then((m) => ({ default: m.AdminUsers })))
const AdminValidations = lazy(() => import('./pages/admin/AdminPages').then((m) => ({ default: m.AdminValidations })))

function Root() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <ScrollRestoration />
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </SettingsProvider>
    </AuthProvider>
  )
}

const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { index: true, element: <Home /> },
          { path: 'formations', element: <Catalog /> },
          { path: 'formations/:slug', element: <CourseDetail /> },
          { path: 'a-propos', element: <About /> },
          { path: 'actualites', element: <NewsList /> },
          { path: 'actualites/:slug', element: <NewsDetail /> },
          { path: 'contact', element: <Contact /> },
          { path: 'verifier', element: <VerifyCertificate /> },
          { path: 'verifier/:code', element: <VerifyCertificate /> },
          { path: 'faq', element: <Faq /> },
          { path: '*', element: <NotFound /> },
        ],
      },
      { path: 'connexion', element: <Login /> },
      { path: 'inscription', element: <Register /> },
      { path: 'mot-de-passe-oublie', element: <ForgotPassword /> },

      // Pages plein écran (sans barre latérale) pour se concentrer
      { path: 'apprendre/:slug/:lessonId?', element: <CoursePlayer /> },
      { path: 'examen/:examId', element: <Exam /> },

      {
        path: 'apprenant',
        element: <DashboardLayout role="apprenant" />,
        children: [
          { index: true, element: <LearnerDashboard /> },
          { path: 'formations', element: <MyCourses /> },
          { path: 'examens', element: <Exams /> },
          { path: 'certificats', element: <MyCertificates /> },
          { path: 'certificats/:code', element: <CertificateView /> },
          { path: 'notifications', element: <Notifications /> },
          { path: 'profil', element: <Profile /> },
        ],
      },
      {
        path: 'formateur',
        element: <DashboardLayout role="formateur" />,
        children: [
          { index: true, element: <TrainerDashboard /> },
          { path: 'formations', element: <TrainerCourses /> },
          { path: 'formations/:id', element: <CourseEditor /> },
          { path: 'questions', element: <QuestionBank /> },
          { path: 'apprenants', element: <TrainerLearners /> },
          { path: 'corrections', element: <Grading /> },
          { path: 'profil', element: <Profile /> },
        ],
      },
      {
        path: 'admin',
        element: <DashboardLayout role="admin" />,
        children: [
          { index: true, element: <AdminDashboard /> },
          { path: 'utilisateurs', element: <AdminUsers /> },
          { path: 'validations', element: <AdminValidations /> },
          { path: 'formations', element: <AdminCourses /> },
          { path: 'formations/:id', element: <CourseEditor /> },
          { path: 'certificats', element: <AdminCertificates /> },
          { path: 'site', element: <AdminSite /> },
          { path: 'statistiques', element: <AdminReports /> },
          { path: 'profil', element: <Profile /> },
        ],
      },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
