export const RESOURCE_TYPES = {
  USER: 'user',
  ROLE: 'role',
  PERMISSION: 'permission',
  CONTENT: 'content',
  ROUTE: 'route',
  ORDER: 'order',
  TICKET: 'ticket',
  DISPUTE: 'dispute',
  FILE: 'file',
  CHAT: 'chat',
  NOTIFICATION: 'notification',
  CAPTCHA: 'captcha',
} as const

export type ResourceType = (typeof RESOURCE_TYPES)[keyof typeof RESOURCE_TYPES]

export const PATH_TO_RESOURCE_TYPE: Record<string, ResourceType> = {
  users: RESOURCE_TYPES.USER,
  roles: RESOURCE_TYPES.ROLE,
  permissions: RESOURCE_TYPES.PERMISSION,
  contents: RESOURCE_TYPES.CONTENT,
  routes: RESOURCE_TYPES.ROUTE,
  orders: RESOURCE_TYPES.ORDER,
  tickets: RESOURCE_TYPES.TICKET,
  disputes: RESOURCE_TYPES.DISPUTE,
  files: RESOURCE_TYPES.FILE,
  chats: RESOURCE_TYPES.CHAT,
  notifications: RESOURCE_TYPES.NOTIFICATION,
  captchas: RESOURCE_TYPES.CAPTCHA,
}

export const RESOURCE_LABELS: Record<ResourceType, string> = {
  [RESOURCE_TYPES.USER]: '用户',
  [RESOURCE_TYPES.ROLE]: '角色',
  [RESOURCE_TYPES.PERMISSION]: '权限',
  [RESOURCE_TYPES.CONTENT]: '内容',
  [RESOURCE_TYPES.ROUTE]: '路由',
  [RESOURCE_TYPES.ORDER]: '订单',
  [RESOURCE_TYPES.TICKET]: '工单',
  [RESOURCE_TYPES.DISPUTE]: '争议',
  [RESOURCE_TYPES.FILE]: '文件',
  [RESOURCE_TYPES.CHAT]: '聊天',
  [RESOURCE_TYPES.NOTIFICATION]: '通知',
  [RESOURCE_TYPES.CAPTCHA]: '验证码',
}

export const ACTION_TYPES = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  ASSIGN: 'assign',
  REVOKE: 'revoke',
} as const

export type ActionType = (typeof ACTION_TYPES)[keyof typeof ACTION_TYPES]

export const ACTION_LABELS: Record<ActionType, string> = {
  [ACTION_TYPES.CREATE]: '创建',
  [ACTION_TYPES.UPDATE]: '更新',
  [ACTION_TYPES.DELETE]: '删除',
  [ACTION_TYPES.ASSIGN]: '分配',
  [ACTION_TYPES.REVOKE]: '撤销',
}

export const ACTION_COLORS: Record<ActionType, string> = {
  [ACTION_TYPES.CREATE]: 'green',
  [ACTION_TYPES.UPDATE]: 'blue',
  [ACTION_TYPES.DELETE]: 'red',
  [ACTION_TYPES.ASSIGN]: 'cyan',
  [ACTION_TYPES.REVOKE]: 'orange',
}
