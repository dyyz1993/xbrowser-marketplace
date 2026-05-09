import React, { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import { Layout } from './layouts/Layout'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ProtectedRoute, CaptchaModal } from './components'

const PluginDashboardPage = React.lazy(() =>
  import('./pages/PluginDashboardPage').then(m => ({ default: m.PluginDashboardPage }))
)
const PluginReviewPage = React.lazy(() =>
  import('./pages/PluginReviewPage/index').then(m => ({ default: m.PluginReviewPage }))
)
const PluginManagementPage = React.lazy(() =>
  import('./pages/PluginManagementPage').then(m => ({ default: m.PluginManagementPage }))
)
const CategoryManagementPage = React.lazy(() =>
  import('./pages/CategoryManagementPage').then(m => ({ default: m.CategoryManagementPage }))
)
const SettingsPage = React.lazy(() =>
  import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage }))
)
const PermissionsPage = React.lazy(() =>
  import('./pages/PermissionsPage').then(m => ({ default: m.PermissionsPage }))
)
const RolesPage = React.lazy(() =>
  import('./pages/RolesPage/index').then(m => ({ default: m.RolesPage }))
)
const SystemLogsPage = React.lazy(() =>
  import('./pages/SystemLogsPage').then(m => ({ default: m.SystemLogsPage }))
)
const MonitorPage = React.lazy(() =>
  import('./pages/MonitorPage').then(m => ({ default: m.MonitorPage }))
)
const UsersPage = React.lazy(() =>
  import('./pages/UsersPage').then(m => ({ default: m.UsersPage }))
)
const MediaTestPage = React.lazy(() =>
  import('./pages/MediaTestPage/index').then(m => ({ default: m.MediaTestPage }))
)
const TestCaptchaPage = React.lazy(() =>
  import('./pages/TestCaptchaPage').then(m => ({ default: m.TestCaptchaPage }))
)

const Loading = () => (
  <div className="flex items-center justify-center h-64">
    <div className="text-gray-400">Loading...</div>
  </div>
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
                    <Route
                      path="/dashboard"
                      element={
                        <Suspense fallback={<Loading />}>
                          <PluginDashboardPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/plugins/review"
                      element={
                        <Suspense fallback={<Loading />}>
                          <PluginReviewPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/plugins/manage"
                      element={
                        <Suspense fallback={<Loading />}>
                          <PluginManagementPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/plugins/categories"
                      element={
                        <Suspense fallback={<Loading />}>
                          <CategoryManagementPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/users"
                      element={
                        <Suspense fallback={<Loading />}>
                          <UsersPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/system/settings"
                      element={
                        <Suspense fallback={<Loading />}>
                          <SettingsPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/system/logs"
                      element={
                        <Suspense fallback={<Loading />}>
                          <SystemLogsPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/system/permissions"
                      element={
                        <Suspense fallback={<Loading />}>
                          <PermissionsPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/system/roles"
                      element={
                        <Suspense fallback={<Loading />}>
                          <RolesPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/system/monitor"
                      element={
                        <Suspense fallback={<Loading />}>
                          <MonitorPage />
                        </Suspense>
                      }
                    />
                    {process.env.NODE_ENV !== 'production' && (
                      <>
                        <Route
                          path="/media-test"
                          element={
                            <Suspense fallback={<Loading />}>
                              <MediaTestPage />
                            </Suspense>
                          }
                        />
                        <Route
                          path="/test-captcha"
                          element={
                            <Suspense fallback={<Loading />}>
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
