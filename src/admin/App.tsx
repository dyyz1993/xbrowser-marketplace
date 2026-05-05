import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import { Layout } from './layouts/Layout'
import { PluginDashboardPage } from './pages/PluginDashboardPage'
import { PluginReviewPage } from './pages/PluginReviewPage'
import { PluginManagementPage } from './pages/PluginManagementPage'
import { CategoryManagementPage } from './pages/CategoryManagementPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { SettingsPage } from './pages/SettingsPage'
import { PermissionsPage } from './pages/PermissionsPage'
import { RolesPage } from './pages/RolesPage'
import { SystemLogsPage } from './pages/SystemLogsPage'
import { UsersPage } from './pages/UsersPage'
import { ProtectedRoute, CaptchaModal } from './components'

export const App: React.FC = () => {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1890ff',
        },
      }}
    >
      <BrowserRouter basename="/admin">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<PluginDashboardPage />} />
                    <Route path="/plugins/review" element={<PluginReviewPage />} />
                    <Route path="/plugins/manage" element={<PluginManagementPage />} />
                    <Route path="/plugins/categories" element={<CategoryManagementPage />} />
                    <Route path="/users" element={<UsersPage />} />
                    <Route path="/system/settings" element={<SettingsPage />} />
                    <Route path="/system/logs" element={<SystemLogsPage />} />
                    <Route path="/system/permissions" element={<PermissionsPage />} />
                    <Route path="/system/roles" element={<RolesPage />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
        <CaptchaModal />
      </BrowserRouter>
    </ConfigProvider>
  )
}
