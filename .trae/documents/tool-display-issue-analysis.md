# API `/api/agents/{id}/messages` 工具展示问题分析

## 问题概述

用户反馈：访问 `http://localhost:5173/api/agents/agent_feee4a5dac6d/messages?limit=20` 时，工具调用信息没有正确展示。

## 数据流分析

### 1. 数据源：`.pi/sessions/{userId}/*.jsonl` 文件

**位置**：`/Users/xuyingzhou/Project/create-biomimic-app/template/.pi/sessions/3/`

**格式示例**：
```jsonl
{"type":"message","id":"f045add6","timestamp":"2026-03-25T04:03:15.493Z","message":{"role":"assistant","content":[{"type":"thinking","thinking":"..."},{"type":"toolCall","id":"call_function_ossi13uz06zb_1","name":"bash","arguments":{"command":"ls -la"}}]}}
{"type":"message","id":"9cc64a07","timestamp":"2026-03-25T04:03:15.510Z","message":{"role":"toolResult","toolCallId":"call_function_ossi13uz06zb_1","content":[{"type":"text","text":"..."}]}}
```

### 2. 数据解析：`session-parser.ts`

**文件**：[session-parser.ts](../../src/server/module-agent/services/session-parser.ts)

**关键函数**：
- `parseSessionJsonl()`: 解析 JSONL 文件，构建消息列表和工具调用映射
- `parseAssistantSubRounds()`: 将 assistant 消息解析为 subRounds 结构
- `extractTextContent()`: 提取文本内容

**解析逻辑**：
```typescript
// 1. 解析消息
if (msg.role === 'assistant') {
  const assistantMsg = msg as PiAssistantMessage
  for (const block of assistantMsg.content) {
    if (block.type === 'toolCall') {
      toolCallMap.set(block.id, block as ToolCallWithResult)
    }
  }
}

// 2. 关联工具结果
else if (msg.role === 'toolResult') {
  const toolResult = msg as PiToolResultMessage
  const toolCall = toolCallMap.get(toolResult.toolCallId)
  if (toolCall) {
    toolCall.result = toolResult.content
    if (toolResult.isError) {
      toolCall.error = 'Tool execution failed'
    }
  }
}

// 3. 构建 subRounds
if (block.type === 'toolCall') {
  const toolCallBlock = block as PiToolCall
  if (!currentSubRound.toolCalls) {
    currentSubRound.toolCalls = []
  }
  
  const toolCallWithResult = toolCallMap?.get(toolCallBlock.id)
  
  currentSubRound.toolCalls.push({
    id: toolCallBlock.id,
    name: toolCallBlock.name,
    args: toolCallBlock.arguments,
    result: toolCallWithResult?.result,
    error: toolCallWithResult?.error,
  })
}
```

### 3. API 返回数据

**实际返回示例**：
```json
{
  "success": true,
  "data": [
    {
      "id": "msg-1774411392887-1",
      "role": "agent",
      "subRounds": [
        {
          "id": "subround-1774411392887-0",
          "thinking": "The user wants to list files...",
          "toolCalls": [
            {
              "id": "call_function_ossi13uz06zb_1",
              "name": "bash",
              "args": {"command": "ls -la"},
              "result": [{"type": "text", "text": "..."}]
            }
          ]
        }
      ]
    }
  ]
}
```

### 4. 前端渲染：`RoundCard.tsx`

**文件**：[RoundCard.tsx](../../src/client/components/RoundCard.tsx)

**渲染逻辑**：
```tsx
{subRound.toolCalls && subRound.toolCalls.length > 0 && (
  <div className="mb-3 space-y-2">
    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
      Tools
    </div>
    {subRound.toolCalls.map(toolCall => (
      <div key={toolCall.id} className="p-3 bg-white border border-gray-200 rounded-lg">
        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-mono">
          {toolCall.name}
        </span>
        <pre>{JSON.stringify(toolCall.args, null, 2)}</pre>
        {toolCall.result && renderToolResult(toolCall.result)}
      </div>
    ))}
  </div>
)}
```

## 问题诊断

### ✅ API 数据正确

从实际测试来看，API **确实返回了工具调用信息**：
- `toolCalls` 数组存在
- 包含 `name`, `args`, `result` 字段
- 数据结构完整

### ✅ 前端代码正确

前端 `RoundCard.tsx` 的渲染逻辑是正确的：
- 检查 `subRound.toolCalls` 是否存在
- 遍历并渲染每个工具调用
- 显示工具名称、参数和结果

### ❓ 可能的问题场景

#### 1. **数据顺序问题**

**现象**：API 返回的消息顺序可能导致工具调用和文本内容分离

**示例**：
```json
[
  {"role": "agent", "subRounds": [{"toolCalls": [...]}]},  // 第一个 agent 消息
  {"role": "agent", "subRounds": [{"content": "..."}]}     // 第二个 agent 消息
]
```

**原因**：`parseAssistantSubRounds()` 会为每个 assistant 消息创建独立的 subRounds，导致：
- 第一个消息只有 toolCalls
- 第二个消息只有 content

**影响**：用户可能看到两个独立的 agent 消息，而不是一个包含工具调用和回复的完整消息。

#### 2. **前端消息分组逻辑**

**文件**：[ChatArea.tsx](../../src/client/components/ChatArea.tsx)

```tsx
const rounds = useMemo<MessageRound[]>(() => {
  const result: MessageRound[] = []
  let currentRound: MessageRound | null = null

  for (const msg of messages) {
    if (msg.role === 'user') {
      currentRound = { userMessage: msg, agentMessage: null }
      result.push(currentRound)
    } else if (msg.role === 'agent' && currentRound) {
      currentRound.agentMessage = msg  // ⚠️ 只取第一个 agent 消息
    }
  }

  return result
}, [messages])
```

**问题**：如果一个 user 消息对应多个 agent 消息，只会显示第一个！

#### 3. **空 content 导致的渲染问题**

**示例**：
```json
{
  "role": "agent",
  "content": "",  // ⚠️ 空字符串
  "subRounds": [{"toolCalls": [...]}]
}
```

**前端逻辑**：
```tsx
const hasSubRounds = subRounds.length > 0
const isUserStreaming = agentMessage?.isStreaming && !hasSubRounds

// 如果 hasSubRounds 为 true，会渲染
{hasSubRounds && subRounds.map(...)}
```

这个逻辑是正确的，应该能渲染。

## 根本原因

### 🔴 **核心问题：消息分组逻辑缺陷**

**问题代码**：[ChatArea.tsx](../../src/client/components/ChatArea.tsx)

```tsx
for (const msg of messages) {
  if (msg.role === 'user') {
    currentRound = { userMessage: msg, agentMessage: null }
    result.push(currentRound)
  } else if (msg.role === 'agent' && currentRound) {
    currentRound.agentMessage = msg  // ⚠️ 后续的 agent 消息被忽略
  }
}
```

**场景重现**：

1. 用户发送 "ls"
2. LLM 返回两个消息：
   - 消息1：包含 toolCall（bash ls -la）
   - 消息2：包含文本回复（目录结构说明）
3. 前端分组逻辑：
   - 创建 round: {userMessage: "ls", agentMessage: 消息1}
   - 消息2 被忽略！

**结果**：用户只看到工具调用，看不到最终的文本回复。

### 🔴 **次要问题：数据解析逻辑**

**问题代码**：[session-parser.ts](../../src/server/module-agent/services/session-parser.ts)

```typescript
export function parseAssistantSubRounds(
  msg: PiAssistantMessage,
  timestamp: number,
  toolCallMap?: ToolCallMap
): AgentSubRound[] {
  // ...
  for (const block of msg.content) {
    if (block.type === 'thinking') {
      // 遇到 thinking，可能创建新的 subRound
    } else if (block.type === 'toolCall') {
      // 添加到当前 subRound
    } else if (block.type === 'text') {
      // 添加到当前 subRound
    }
  }
}
```

**问题**：每个 assistant 消息独立解析，无法合并同一个对话轮次中的多个消息。

## 解决方案

### 方案 1：修复前端消息分组逻辑 ⭐ 推荐

**修改文件**：[ChatArea.tsx](../../src/client/components/ChatArea.tsx)

**修改思路**：
```tsx
interface MessageRound {
  userMessage: ChatMessage
  agentMessages: ChatMessage[]  // 改为数组
}

const rounds = useMemo<MessageRound[]>(() => {
  const result: MessageRound[] = []
  let currentRound: MessageRound | null = null

  for (const msg of messages) {
    if (msg.role === 'user') {
      currentRound = { userMessage: msg, agentMessages: [] }
      result.push(currentRound)
    } else if (msg.role === 'agent' && currentRound) {
      currentRound.agentMessages.push(msg)  // 收集所有 agent 消息
    }
  }

  return result
}, [messages])
```

**优点**：
- 最小改动
- 保持现有数据结构
- 立即生效

### 方案 2：后端合并消息

**修改文件**：[agent-service.ts](../../src/server/module-agent/services/agent-service.ts)

**修改思路**：
```typescript
export async function getMessages(...): Promise<ChatMessage[]> {
  const { messages: piMessages, toolCallMap } = parseSessionJsonl(userId)
  
  // 合并连续的 assistant 消息
  const mergedMessages = mergeAssistantMessages(piMessages)
  
  return mergedMessages.map(...)
}

function mergeAssistantMessages(messages: PiMessage[]): PiMessage[] {
  const result: PiMessage[] = []
  
  for (const msg of messages) {
    if (msg.role === 'assistant') {
      const lastMsg = result[result.length - 1]
      if (lastMsg?.role === 'assistant') {
        // 合并 content blocks
        lastMsg.content = [...lastMsg.content, ...msg.content]
      } else {
        result.push(msg)
      }
    } else {
      result.push(msg)
    }
  }
  
  return result
}
```

**优点**：
- 数据更合理
- 减少前端复杂度
- 符合用户直觉

**缺点**：
- 需要修改解析逻辑
- 可能影响其他功能

### 方案 3：改进 subRounds 解析逻辑

**修改文件**：[session-parser.ts](../../src/server/module-agent/services/session-parser.ts)

**修改思路**：
```typescript
export function parseAssistantSubRounds(
  msg: PiAssistantMessage,
  timestamp: number,
  toolCallMap?: ToolCallMap
): AgentSubRound[] {
  const subRounds: AgentSubRound[] = []
  let currentSubRound: AgentSubRound = {
    id: `subround-${timestamp}-0`,
    createdAt: new Date(timestamp).toISOString(),
  }
  
  for (const block of msg.content) {
    // 修改逻辑：只有遇到新的 thinking 才创建新 subRound
    // toolCall 和 text 都添加到当前 subRound
    if (block.type === 'toolCall') {
      if (!currentSubRound.toolCalls) {
        currentSubRound.toolCalls = []
      }
      currentSubRound.toolCalls.push({...})
    } else if (block.type === 'text') {
      currentSubRound.content = (currentSubRound.content || '') + textBlock.text
    } else if (block.type === 'thinking') {
      // 只有当前 subRound 有内容时才创建新的
      if (currentSubRound.toolCalls?.length || currentSubRound.content) {
        subRounds.push(currentSubRound)
        currentSubRound = newSubRound
      }
      currentSubRound.thinking = thinkingBlock.thinking
    }
  }
  
  return subRounds
}
```

## 推荐实施步骤

### 第一步：验证问题

1. 在浏览器中打开开发者工具
2. 查看 Network 面板中的 API 响应
3. 确认是否返回了多个 agent 消息
4. 检查前端是否只显示了第一个

### 第二步：实施修复

**推荐：方案 1（前端修复）**

1. 修改 `ChatArea.tsx` 的消息分组逻辑
2. 修改 `RoundCard.tsx` 以支持多个 agent 消息
3. 测试验证

### 第三步：优化数据结构

**可选：方案 2（后端合并）**

1. 在 `agent-service.ts` 中添加消息合并逻辑
2. 确保不影响其他功能
3. 更新相关测试

## 测试验证

### 测试用例 1：单个工具调用

**输入**：用户发送 "ls"

**预期**：
- 显示工具调用（bash ls -la）
- 显示工具结果
- 显示最终文本回复

### 测试用例 2：多个工具调用

**输入**：用户发送复杂请求

**预期**：
- 显示所有工具调用
- 按顺序显示工具结果
- 显示最终回复

### 测试用例 3：无工具调用

**输入**：用户发送简单问题

**预期**：
- 直接显示文本回复
- 不显示工具区域

## 总结

**问题根源**：前端消息分组逻辑只取第一个 agent 消息，导致后续消息（包含最终回复）被忽略。

**解决方案**：修改前端逻辑，收集所有 agent 消息，或后端合并连续的 assistant 消息。

**优先级**：高（影响用户体验）

**工作量**：中等（需要修改前端或后端逻辑）
