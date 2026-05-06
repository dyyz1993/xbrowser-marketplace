import { Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import type { NotificationType } from '@shared/schemas'

export const typeConfig = {
  info: {
    icon: Info,
    colorScheme: 'blue' as const,
    border: 'border-blue-400',
    lightBg: 'bg-blue-50',
  },
  warning: {
    icon: AlertTriangle,
    colorScheme: 'yellow' as const,
    border: 'border-yellow-400',
    lightBg: 'bg-yellow-50',
  },
  success: {
    icon: CheckCircle,
    colorScheme: 'green' as const,
    border: 'border-green-400',
    lightBg: 'bg-green-50',
  },
  error: {
    icon: XCircle,
    colorScheme: 'red' as const,
    border: 'border-red-400',
    lightBg: 'bg-red-50',
  },
} as const satisfies Record<NotificationType, unknown>
