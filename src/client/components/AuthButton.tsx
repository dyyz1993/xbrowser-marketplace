import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export function AuthButton() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)

  const handleLogout = () => {
    logout()
    window.location.reload()
  }

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600" data-testid="auth-username">
          {user?.username || '已登录'}
        </span>
        <button
          onClick={handleLogout}
          className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
          data-testid="auth-logout-btn"
        >
          退出
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        to="/login"
        className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
        data-testid="auth-login-link"
      >
        登录
      </Link>
      <Link
        to="/register"
        className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
        data-testid="auth-register-link"
      >
        注册
      </Link>
    </div>
  )
}
