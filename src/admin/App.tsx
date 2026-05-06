import React, { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import { Layout } from './layouts/Layout'
import { PluginDashboardPage } from './pages/PluginDashboardPage'
import { PluginReviewPage } from './pages/PluginReviewPage/index'
import { PluginManagementPage } from './pages/PluginManagementPage'
import { CategoryManagementPage } from './pages/CategoryManagementPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { SettingsPage } from './pages/SettingsPage'
import { PermissionsPage } from './pages/PermissionsPage'
import { RolesPage } from './pages/RolesPage/index'
import { SystemLogsPage } from './pages/SystemLogsPage'
import { UsersPage } from './pages/UsersPage'
import { ProtectedRoute, CaptchaModal } from './components'

const MediaTestPage = React.lazy(() =>
  import('./pages/MediaTestPage/index').then(m => ({ default: m.MediaTestPage }))
)
const TestCaptchaPage = React.lazy(() =>
  import('./pages/TestCaptchaPage').then(m => ({ default: m.TestCaptchaPage }))
)

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
                    {process.env.NODE_ENV !== 'production' && (
                      <>
                        <Route
                          path="/media-test"
                          element={
                            <Suspense fallback={null}>
                              <MediaTestPage />
                            </Suspense>
                          }
                        />
                        <Route
                          path="/test-captcha"
                          element={
                            <Suspense fallback={null}>
                              <TestCaptchaPage />
                            </Suspense>
                          }
                        />
                      </>
                    )}
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
