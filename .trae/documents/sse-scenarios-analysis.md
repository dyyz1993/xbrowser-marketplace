# SSE 流式响应交互场景分析报告

## 一、场景实现状态总览

| 场景 | 状态 | 完成度 |
|------|------|--------|
| 1. 流式 content | ✅ 已实现 | 100% |
| 2. 流式 思考+content | ⚠️ 部分实现 | 50% |
| 3. 流式 思考+tool | ⚠️ 部分实现 | 25% |
| 4. 流式 N tool | ❌ 未实现 | 0% |
| 5. 流式 content+tool | ⚠️ 部分实现 | 50% |
| 6. 流式 思考+content+tool | ⚠️ 部分实现 | 33% |
| 7. LLM 报错、限流等 | ⚠️ 部分实现 | 60% |

---

## 二、详细分析

### 场景 1: 流式 content
**状态**: ✅ 已实现

`pi-text-delta` 事件正确处理，支持增量更新和 `isFinal` 结束标志。

### 场景 2-6: 思考和工具调用
**状态**: ⚠️ 部分实现

**问题**:
- 协议定义完整（6 种事件类型）
- 客户端事件监听已注册
- **但事件处理仅 console.log，未更新 UI 状态**

```typescript
// 当前实现 - 仅打印日志
const handleThinkingDelta = (data) => {
  console.log('Thinking:', data.delta)  // ❌ 未更新 store
}
const handleToolStart = (data) => {
  console.log('Tool started:', data.toolName)  // ❌ 未更新 store
}
```

### 场景 7: 错误处理
**状态**: ⚠️ 部分实现

**已实现**:
- SSE 连接层错误处理（重连机制，最多 5 次）
- HTTP 错误处理
- 网络断开自动重连

**未实现**:
- LLM API 错误事件（如 rate_limit、token_exceeded）
- 业务层错误状态更新
- 限流特殊处理

---

## 三、缺失功能清单

### 3.1 agentStore.ts 需要添加

```typescript
// 更新思考内容
updateMessageThinking: (messageId: string, updater: (prev: string) => string) => void

// 添加工具调用
addToolCall: (messageId: string, toolCall: { id, name, args }) => void

// 更新工具调用结果
updateToolCallResult: (messageId: string, toolCallId: string, result: unknown, error?: string) => void
```

### 3.2 useChatSSEConnection.ts 需要完善

```typescript
// 思考增量
const handleThinkingDelta = (data) => {
  updateMessageThinking(data.messageId, prev => prev + data.delta)
}

// 工具开始
const handleToolStart = (data) => {
  addToolCall(data.messageId, {
    id: data.toolCallId,
    name: data.toolName,
    args: data.args
  })
}

// 工具结束
const handleToolEnd = (data) => {
  updateToolCallResult(data.messageId, data.toolCallId, data.result, data.error)
}

// 错误处理
client.onError(error => {
  setError(error.message)
  setIsRunning(false)
})
```

### 3.3 schemas.ts 需要添加

```typescript
// LLM 错误事件
export const PiErrorEventSchema = z.object({
  messageId: z.string(),
  code: z.string(),        // rate_limit, token_exceeded, api_error
  message: z.string(),
  recoverable: z.boolean(),
})
```

### 3.4 服务端 chat-service.ts 需要添加

- Tool 调用逻辑（发送 `pi-tool-start` 和 `pi-tool-end` 事件）
- 错误事件发送（`pi-error`）

---

## 四、实现优先级建议

| 优先级 | 任务 | 影响范围 |
|--------|------|----------|
| P0 | 完善 handleThinkingDelta UI 更新 | 场景 2, 3, 6 |
| P0 | 完善 handleToolStart/End UI 更新 | 场景 3, 4, 5, 6 |
| P1 | 添加 LLM 错误事件类型和处理 | 场景 7 |
| P2 | 服务端 Tool 调用实现 | 场景 3-6 |
| P2 | 限流和 Token 超限处理 | 场景 7 |
