import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './Layout'
import { LoadingSpinner } from './components/LoadingSpinner'

const HomePage = lazy(() => import('./pages/Home').then(m => ({ default: m.HomePage })))
const SearchPage = lazy(() => import('./pages/Search').then(m => ({ default: m.SearchPage })))
const PluginDetailPage = lazy(() => import('./pages/PluginDetail').then(m => ({ default: m.PluginDetailPage })))
const CategoriesPage = lazy(() => import('./pages/Categories').then(m => ({ default: m.CategoriesPage })))
const CLIPage = lazy(() => import('./pages/CLI').then(m => ({ default: m.CLIPage })))

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
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/plugin/:slug" element={<PluginDetailPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/cli" element={<CLIPage />} />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  )
}
