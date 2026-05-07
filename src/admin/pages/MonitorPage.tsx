import { Activity } from 'lucide-react'

export const MonitorPage: React.FC = () => {
  return (
    <div className="p-6" data-testid="monitor-container">
      <div className="flex items-center gap-3 mb-6">
        <Activity className="w-8 h-8 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">系统监控</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">系统状态</h3>
          <p className="mt-2 text-3xl font-bold text-green-600">正常运行</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">运行时间</h3>
          <p className="mt-2 text-3xl font-bold text-blue-600">99.9%</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">活跃连接</h3>
          <p className="mt-2 text-3xl font-bold text-purple-600">0</p>
        </div>
      </div>
    </div>
  )
}
