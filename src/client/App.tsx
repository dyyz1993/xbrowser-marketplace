import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './Layout'
import { LoadingSpinner } from './components/LoadingSpinner'
import { HomePage } from './pages/Home'
import { PluginDetailPage } from './pages/PluginDetail'
import { CategoriesPage } from './pages/Categories'
import { CLIPage } from './pages/CLI'

const SearchPage = lazy(() => import('./pages/Search').then(m => ({ default: m.SearchPage })))
const NotificationPage = lazy(() =>
  import('./pages/NotificationPage/NotificationPageView').then(m => ({
    default: m.NotificationPage,
  }))
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
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
