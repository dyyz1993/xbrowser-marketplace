# 输入框清空与消息响应流程调研报告

## 一、输入框回车后是否会清空？

### 结论：**会清空**

### 代码分析

**文件**: `src/client/components/ChatArea.tsx:46-58`

```typescript
const handleSubmit = async (e?: React.FormEvent) => {
  e?.preventDefault()
  if (!input.trim() || loading) return  // 条件检查

  const messageContent = input.trim()
  setInput('')  // ✅ 清空输入框

  if (isRunning) {
    addPendingMessage(messageContent)
  } else {
    await sendMessage(messageContent)
  }
}
```

### 清空执行条件

| 条件 | 是否清空 |
|------|----------|
| 输入非空 + 非 loading | ✅ 清空 |
| 输入为空或只有空白 | ❌ 不清空（直接返回） |
| 正在 loading | ❌ 不清空（直接返回） |

### 设计策略

采用**乐观更新**策略：先清空输入框给用户即时反馈，然后再处理消息发送。

---

## 二、消息发送后如何响应数据？

### 结论：**当前使用 Mock 数据，SSE 未与聊天流程集成**

### 当前状态

| 项目 | 状态 |
|------|------|
| LLM 调用 | **Mock 数据** - 5 个预设文本随机选择 |
| 消息响应方式 | **同步 HTTP** - 非 SSE 流式传输 |
| SSE 连接 | **已实现但未使用** - 只发送心跳 |
| 流式输出 | **代码存在但未启用** |

### 数据流

```
客户端 sendMessage()
        │
        ▼
HTTP POST → /agents/{id}/chat
        │
        ▼
服务器端：
  1. 创建用户消息到数据库
  2. mockLLMService.generateThinking() [30%概率]
  3. mockLLMService.generateResponse() - 随机选择预设文本
  4. 将 agent 响应写入数据库
  5. 返回 { userMessage, agentMessageId }
        │
        ▼
客户端收到响应，但不含 agent 回复内容
        │
        ▼
客户端需要调用 fetchMessages() 获取完整消息列表
```

### Mock LLM 服务

**文件**: `src/server/module-agent/services/mock-llm-service.ts`

```typescript
const mockResponses = [
  "I understand your question. Let me help you with that!",
  "That's an interesting point. Here's what I think...",
  "I'd be happy to assist you with this. Let me explain...",
  "Great question! Based on my analysis...",
  "I see what you're asking. Here's my perspective...",
]
```

---

## 三、问题总结

### 问题 1：响应内容不返回给客户端

`sendMessage` 的 HTTP 响应只返回 `{ userMessage, agentMessageId }`，客户端无法获取 agent 的实际回复内容。

### 问题 2：SSE 未与聊天流程集成

SSE 端点独立存在，只发送 `connected` 和 `heartbeat` 事件，`sendMessage` 流程没有触发 SSE 事件。

### 问题 3：客户端无法实时显示 agent 响应

由于响应内容不通过 HTTP 返回也不通过 SSE 推送，客户端需要通过 `fetchMessages` 轮询获取消息。

---

## 四、建议改进方向

### 方案 A：完整 SSE 流式响应

修改 `sendMessage` 路由，在生成响应时通过 SSE 推送事件：

```typescript
// 通过 SSE 推送 agent 开始事件
sseManager.send(agentId, 'pi-agent-start', { messageId, agentId })

// 流式生成响应
await mockLLMService.generateResponse((delta) => {
  sseManager.send(agentId, 'pi-text-delta', { messageId, delta })
})

// 推送结束事件
sseManager.send(agentId, 'pi-agent-end', { messageId })
```

### 方案 B：HTTP 响应直接返回内容

修改 `sendMessage` 响应 schema，直接返回 agent 的回复：

```typescript
return c.json(success({
  userMessage,
  agentMessage: {
    id: agentMessageId,
    content: response,
    thinking,
  }
}))
```

### 方案 C：集成真实 LLM API

替换 `MockLLMService`，接入真实的 LLM API（如 OpenAI、Claude 等）。
