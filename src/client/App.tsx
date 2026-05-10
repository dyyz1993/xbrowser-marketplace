import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './Layout'
import { LoadingSpinner } from './components/LoadingSpinner'
import { HomePage } from './pages/Home'
import { PluginDetailPage } from './pages/PluginDetail'
import { CategoriesPage } from './pages/Categories'
import { CLIPage } from './pages/CLI'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'

const SearchPage = lazy(() => import('./pages/Search').then(m => ({ default: m.SearchPage })))
const NotificationPage = lazy(() =>
  import('./pages/NotificationPage/NotificationPageView').then(m => ({
    default: m.NotificationPage,
  }))
)
const PublishPage = lazy(() =>
  import('./pages/PublishPage').then(m => ({ default: m.PublishPage }))
)
const DeveloperDashboardPage = lazy(() =>
  import('./pages/DeveloperDashboardPage').then(m => ({ default: m.DeveloperDashboardPage }))
)

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <LoadingSpinner size="lg" />
    </div>
  )
}

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/plugin/:slug" element={<PluginDetailPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/cli" element={<CLIPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/search"
            element={
              <Suspense fallback={<PageLoader />}>
                <SearchPage />
              </Suspense>
            }
          />
          <Route
            path="/notifications"
            element={
              <Suspense fallback={<PageLoader />}>
                <NotificationPage />
              </Suspense>
            }
          />
          <Route
            path="/publish"
            element={
              <Suspense fallback={<PageLoader />}>
                <PublishPage />
              </Suspense>
            }
          />
          <Route
            path="/developer"
            element={
              <Suspense fallback={<PageLoader />}>
                <DeveloperDashboardPage />
              </Suspense>
            }
          />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
