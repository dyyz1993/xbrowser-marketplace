# Agent 模块数据流分析

## 存储链路（自动）

```
用户发送消息
  ↓
POST /api/agents/:id/messages
  ↓
processChatMessage(agentId, userId, content)
  ↓
┌─ 1. agentService.createMessage() → 保存 user message 到数据库 chatMessages 表
│     ↓
│ 2. getLLMService(userId) → 获取 LLM 服务
│     ↓
│ 3. llm.chat() → 调用 PI SDK 处理
│     ↓
│ 4. SSE 事件发送 → 前端实时显示
│     - pi-agent-start
│     - pi-thinking-delta
│     - pi-text-delta
│     - pi-tool-start / pi-tool-end
│     - pi-agent-end
│     ↓
└─ 5. agentService.createMessage() → 保存 agent message 到数据库 [刚修复]

数据库: SQLite (dev) / D1 (prod)
表: chatMessages
```

## 获取链路（手动）

```
前端刷新页面 / 切换 Agent
  ↓
ChatPage.tsx useEffect → fetchMessages()
  ↓
GET /api/agents/:id/messages?limit=10&offset=0
  ↓
agentService.getMessages(agentId, userId, limit, offset)
  ↓
SQL: SELECT * FROM chatMessages
     WHERE agentId = ? AND userId = ?
     ORDER BY createdAt DESC
     LIMIT ? OFFSET ?
  ↓
返回消息列表
```

## 当前问题

### 1. Agent 消息未保存 → 已修复 ✅
- 问题：`processChatMessage` 只保存了 user message，没有保存 agent message
- 修复：添加 `agentService.createMessage('agent', agentContent, agentThinking)`

### 2. 可能的获取问题（待验证）
- 前端 `fetchMessages()` 被调用的时机
- `limit` 和 `offset` 参数是否正确传递
- `ChatPage` 的 `useEffect` 依赖是否正确

## 待验证

1. 发送消息后刷新页面，消息是否还在？
2. 控制台是否有 `fetchMessages` 的请求日志？
3. `/api/agents/:id/messages` API 是否返回正确数据？
