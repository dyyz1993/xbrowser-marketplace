# 历史数据丢失问题分析

## 数据流追踪

### 1. 发送消息时数据流
```
用户发送消息
  ↓
POST /api/agents/:id/chat
  ↓
processChatMessage(agentId, userId, content)
  ↓
createPILLMService(config, userId)
  ↓
SessionManager.create(sessionDir)  // sessionDir = .pi/sessions/{userId}
  ↓
createAgentSession({ sessionManager })
  ↓
session.prompt(prompt)
  ↓
PI SDK 内部保存到 session 文件
```

### 2. 刷新页面时数据流
```
前端刷新
  ↓
GET /api/agents/:id/messages
  ↓
getMessages(agentId, userId, limit, offset)
  ↓
读取 .pi/sessions/{userId}/xxx.jsonl
  ↓
返回消息列表
```

## 可能的问题点

### 问题 1: PI SDK 没有保存 session 文件
- 需要检查 `.pi/sessions/{userId}/` 目录是否有文件

### 问题 2: userId 不一致
- 发送消息时的 userId 和读取消息时的 userId 可能不同
- 需要检查 API 中 userId 的来源

### 问题 3: 读取路径错误
- `getMessages` 中的路径可能不正确

## 检查步骤

1. 确认发送消息后 `.pi/sessions/{userId}/` 是否有文件
2. 确认发送消息和读取消息时使用的 userId 是否一致
3. 确认 `getMessages` 的返回数据是否正确

## 待确认

请告诉我：
1. 发送消息后，`.pi/sessions/` 目录是否有文件？
2. 控制台是否有 `[LLM]` 相关日志？
