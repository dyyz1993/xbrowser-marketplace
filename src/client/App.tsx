import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './Layout'
import { HomePage } from './pages/Home'
import { SearchPage } from './pages/Search'
import { PluginDetailPage } from './pages/PluginDetail'
import { CategoriesPage } from './pages/Categories'
import { CLIPage } from './pages/CLI'

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/plugin/:slug" element={<PluginDetailPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/cli" element={<CLIPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
