# 工具展示问题调研报告

## 调研时间
2026-03-25

## 调研目标
验证 `http://localhost:5173/api/agents/agent_feee4a5dac6d/messages?limit=20` 为什么不展示工具调用的根本原因。

---

## 调研发现

### 1. API 返回数据结构 ✅ 正确

**测试命令**：
```bash
curl -s "http://localhost:5173/api/agents/agent_feee4a5dac6d/messages?limit=5" | jq '.data[] | {id, role, hasSubRounds, subRoundsCount, hasContent}'
```

**返回结果**：
```json
{
  "id": "msg-1774411392884-0",
  "role": "user",
  "hasSubRounds": false,
  "subRoundsCount": 0,
  "hasContent": true
}
{
  "id": "msg-1774411392887-1",
  "role": "agent",
  "hasSubRounds": true,
  "subRoundsCount": 1,
  "hasContent": false  // ⚠️ 第一个 agent 消息：只有工具调用，没有文本内容
}
{
  "id": "msg-1774411395512-2",
  "role": "agent",
  "hasSubRounds": true,
  "subRoundsCount": 1,
  "hasContent": true   // ⚠️ 第二个 agent 消息：只有文本内容，没有工具调用
}
```

**关键发现**：
- ✅ API 正确返回了 3 条消息
- ✅ 工具调用信息完整存在（在消息1中）
- ✅ 最终回复完整存在（在消息2中）
- ❌ **问题**：工具调用和最终回复被分成了两条独立的 agent 消息

---

### 2. Session 文件原始数据 ✅ 正确

**测试命令**：
```bash
cat .pi/sessions/3/2026-03-25T04-03-12-304Z_d46fbb45-4bea-4a35-8eec-2db037909586.jsonl | jq -c 'select(.type == "message") | {id, role}'
```

**返回结果**：
```json
{"id":"818e1485","role":"user"}
{"id":"f045add6","role":"assistant"}
{"id":"9cc64a07","role":"toolResult"}
{"id":"31e79aca","role":"assistant"}
```

**数据流分析**：
1. 用户消息（user）：用户输入 "ls"
2. 助手消息1（assistant）：包含 thinking + toolCall
3. 工具结果（toolResult）：bash 命令的输出
4. 助手消息2（assistant）：包含 thinking + text（最终回复）

**结论**：
- ✅ 原始数据结构正确
- ✅ 这是正常的 LLM 对话流程（工具调用 → 工具结果 → 最终回复）
- ❌ **问题**：后端将两个 assistant 消息解析成了两条独立的 ChatMessage

---

### 3. 后端解析逻辑 ⚠️ 有问题

**文件**：[agent-service.ts](../../src/server/module-agent/services/agent-service.ts)

**关键代码**：
```typescript
export async function getMessages(
  agentId: string,
  userId: string,
  limit?: number,
  offset?: number
): Promise<ChatMessage[]> {
  const { messages: piMessages, toolCallMap } = parseSessionJsonl(userId)
  
  return pagedMessages.map((msg, index) => {
    if (msg.role === 'user') {
      return {
        id: `msg-${msg.timestamp}-${index}`,
        agentId,
        role: 'user',
        content: extractTextContent(msg.content),
        createdAt: new Date(msg.timestamp).toISOString(),
      }
    } else if (msg.role === 'assistant') {
      const content = extractTextContent(msg.content)
      const subRounds = parseAssistantSubRounds(msg, msg.timestamp, toolCallMap)
      
      return {
        id: `msg-${msg.timestamp}-${index}`,
        agentId,
        role: 'agent',
        content,
        subRounds: subRounds.length > 0 ? subRounds : undefined,
        createdAt: new Date(msg.timestamp).toISOString(),
      }
    }
  }).filter(Boolean) as ChatMessage[]
}
```

**问题分析**：
- ❌ 每个 assistant 消息被独立转换成一个 ChatMessage
- ❌ 没有合并同一个对话轮次中的多个 assistant 消息
- ❌ 导致前端收到两条独立的 agent 消息

**示例**：
```
原始数据：
  user: "ls"
  assistant: toolCall(bash ls -la)
  toolResult: ...
  assistant: text("Here's the directory...")

解析后：
  ChatMessage[0]: user, "ls"
  ChatMessage[1]: agent, subRounds=[{toolCalls: [...]}], content=""
  ChatMessage[2]: agent, subRounds=[{content: "..."}], content="..."
```

---

### 4. 前端消息分组逻辑 ❌ 致命缺陷

**文件**：[ChatArea.tsx](../../src/client/components/ChatArea.tsx)

**关键代码**：
```typescript
const rounds = useMemo<MessageRound[]>(() => {
  const result: MessageRound[] = []
  let currentRound: MessageRound | null = null

  for (const msg of messages) {
    if (msg.role === 'user') {
      currentRound = { userMessage: msg, agentMessage: null }
      result.push(currentRound)
    } else if (msg.role === 'agent' && currentRound) {
      currentRound.agentMessage = msg  // ⚠️ 只取第一个 agent 消息！
    }
  }

  return result
}, [messages])
```

**问题分析**：
- ❌ 当遇到第一个 agent 消息时，赋值给 `currentRound.agentMessage`
- ❌ 当遇到第二个 agent 消息时，**覆盖**之前的值
- ❌ 结果：只显示最后一个 agent 消息

**实际执行过程**：
```
消息列表：
  [0] user: "ls"
  [1] agent: toolCalls=[...], content=""
  [2] agent: content="Here's the directory..."

分组逻辑执行：
  i=0: currentRound = {userMessage: msg[0], agentMessage: null}
  i=1: currentRound.agentMessage = msg[1]  // 设置为消息1
  i=2: currentRound.agentMessage = msg[2]  // ⚠️ 覆盖为消息2

最终结果：
  rounds[0] = {
    userMessage: "ls",
    agentMessage: msg[2]  // 只有最终回复，没有工具调用！
  }
```

---

### 5. RoundCard 渲染逻辑 ✅ 正确

**文件**：[RoundCard.tsx](../../src/client/components/RoundCard.tsx)

**关键代码**：
```typescript
export const RoundCard: React.FC<RoundCardProps> = memo(({ userMessage, agentMessage, isStreaming }) => {
  const subRounds = agentMessage?.subRounds || []
  const hasSubRounds = subRounds.length > 0

  return (
    <div className="space-y-4">
      {/* 用户消息 */}
      <div>{userMessage.content}</div>
      
      {/* Agent 消息 */}
      {agentMessage && (
        <div>
          {hasSubRounds && subRounds.map((subRound, index) => (
            <SubRoundView
              key={subRound.id}
              subRound={subRound}
              index={index}
              isStreaming={agentMessage.isStreaming ?? undefined}
              isLastSubRound={index === subRounds.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  )
})
```

**SubRoundView 渲染逻辑**：
```typescript
function SubRoundView({ subRound, index, isStreaming, isLastSubRound }) {
  return (
    <div>
      {/* Thinking */}
      {subRound.thinking && <div>{subRound.thinking}</div>}
      
      {/* Tool Calls */}
      {subRound.toolCalls && subRound.toolCalls.length > 0 && (
        <div>
          <div>Tools</div>
          {subRound.toolCalls.map(toolCall => (
            <div>
              <span>{toolCall.name}</span>
              <pre>{JSON.stringify(toolCall.args, null, 2)}</pre>
              {toolCall.result && renderToolResult(toolCall.result)}
            </div>
          ))}
        </div>
      )}
      
      {/* Content */}
      {subRound.content && <ReactMarkdown>{subRound.content}</ReactMarkdown>}
    </div>
  )
}
```

**结论**：
- ✅ 渲染逻辑完全正确
- ✅ 如果收到正确的数据，会正确显示工具调用
- ❌ 但由于前端分组逻辑问题，收到的数据不完整

---

## 根本原因总结

### 🔴 核心问题：两个层面的数据流断裂

#### 层面1：后端解析逻辑

**问题**：将同一个对话轮次的多个 assistant 消息解析成独立的 ChatMessage

**影响**：
- 消息1：只有工具调用，没有最终回复
- 消息2：只有最终回复，没有工具调用

**根本原因**：
- `parseSessionJsonl()` 按原始消息逐条解析
- `getMessages()` 没有合并连续的 assistant 消息
- 每条 assistant 消息独立转换成 ChatMessage

#### 层面2：前端分组逻辑

**问题**：只取最后一个 agent 消息，忽略之前的

**影响**：
- 用户只能看到最终回复
- 看不到工具调用过程

**根本原因**：
- `MessageRound` 接口设计不合理（`agentMessage` 是单个对象）
- 分组逻辑使用覆盖而不是收集

---

## 数据流完整追踪

### 原始数据（.jsonl 文件）
```
user: "ls"
assistant: thinking + toolCall(bash ls -la)
toolResult: bash output
assistant: thinking + text("Here's the directory...")
```

### 后端解析后（API 返回）
```json
[
  {
    "id": "msg-1774411392884-0",
    "role": "user",
    "content": "ls"
  },
  {
    "id": "msg-1774411392887-1",
    "role": "agent",
    "content": "",
    "subRounds": [{
      "thinking": "The user wants to list files...",
      "toolCalls": [{
        "id": "call_function_ossi13uz06zb_1",
        "name": "bash",
        "args": {"command": "ls -la"},
        "result": [...]
      }]
    }]
  },
  {
    "id": "msg-1774411395512-2",
    "role": "agent",
    "content": "Here's the directory structure...",
    "subRounds": [{
      "thinking": "The user asked to list files...",
      "content": "Here's the directory structure..."
    }]
  }
]
```

### 前端分组后（实际渲染）
```typescript
rounds = [
  {
    userMessage: { role: "user", content: "ls" },
    agentMessage: {
      id: "msg-1774411395512-2",  // ⚠️ 只有消息2，消息1被覆盖
      role: "agent",
      content: "Here's the directory structure...",
      subRounds: [{
        thinking: "...",
        content: "..."  // ⚠️ 没有工具调用
      }]
    }
  }
]
```

### 用户看到的结果
```
User: ls
Agent: Here's the directory structure:
       | Directory | Description |
       |-----------|-------------|
       | src/      | ...         |
       
       ⚠️ 看不到工具调用过程！
```

---

## 解决方案对比

### 方案1：修复前端分组逻辑 ⭐ 推荐

**优点**：
- ✅ 最小改动
- ✅ 不影响后端逻辑
- ✅ 立即生效

**缺点**：
- ⚠️ 前端需要处理多个 agent 消息的合并显示

**实施步骤**：
1. 修改 `MessageRound` 接口
2. 修改 `ChatArea.tsx` 分组逻辑
3. 修改 `RoundCard.tsx` 渲染逻辑

**代码示例**：
```typescript
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

---

### 方案2：后端合并消息

**优点**：
- ✅ 数据结构更合理
- ✅ 前端逻辑简单
- ✅ 符合用户直觉

**缺点**：
- ⚠️ 需要修改后端解析逻辑
- ⚠️ 可能影响其他功能
- ⚠️ 需要更新测试

**实施步骤**：
1. 在 `agent-service.ts` 中添加消息合并逻辑
2. 合并连续的 assistant 消息
3. 更新相关测试

**代码示例**：
```typescript
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
    } else if (msg.role !== 'toolResult') {
      result.push(msg)
    }
  }
  
  return result
}
```

---

### 方案3：改进 subRounds 解析逻辑

**优点**：
- ✅ 更精细的控制
- ✅ 可以处理复杂场景

**缺点**：
- ⚠️ 逻辑复杂
- ⚠️ 可能引入新问题

**不推荐原因**：治标不治本，问题根源在于消息分组。

---

## 推荐方案

### 🎯 推荐：方案1（前端修复）

**理由**：
1. **最小改动**：只需修改前端代码
2. **快速生效**：无需重启后端服务
3. **向后兼容**：不破坏现有 API 契约
4. **易于测试**：前端单元测试即可验证

**实施优先级**：
- 🔴 高优先级：修复前端分组逻辑
- 🟡 中优先级：优化后端数据结构（可选）
- 🟢 低优先级：改进解析逻辑（不推荐）

---

## 测试验证计划

### 测试用例1：单个工具调用
**输入**：用户发送 "ls"
**预期**：
- ✅ 显示工具调用（bash ls -la）
- ✅ 显示工具结果
- ✅ 显示最终文本回复

### 测试用例2：多个工具调用
**输入**：用户发送复杂请求
**预期**：
- ✅ 显示所有工具调用
- ✅ 按顺序显示工具结果
- ✅ 显示最终回复

### 测试用例3：无工具调用
**输入**：用户发送简单问题
**预期**：
- ✅ 直接显示文本回复
- ✅ 不显示工具区域

---

## 结论

### 问题确认 ✅

**工具调用确实没有展示，但原因不是 API 问题，而是前端消息分组逻辑缺陷。**

### 根本原因

1. **后端**：将多个 assistant 消息解析成独立的 ChatMessage
2. **前端**：只取最后一个 agent 消息，忽略之前的

### 解决方向

**优先修复前端分组逻辑，将 `agentMessage` 改为 `agentMessages` 数组，收集所有 agent 消息。**

### 影响范围

- ✅ API 数据正确
- ✅ 渲染逻辑正确
- ❌ 前端分组逻辑有缺陷

---

## 附录

### 相关文件
- [agent-service.ts](../../src/server/module-agent/services/agent-service.ts)
- [session-parser.ts](../../src/server/module-agent/services/session-parser.ts)
- [ChatArea.tsx](../../src/client/components/ChatArea.tsx)
- [RoundCard.tsx](../../src/client/components/RoundCard.tsx)

### 测试数据
- Session 文件：`.pi/sessions/3/2026-03-25T04-03-12-304Z_d46fbb45-4bea-4a35-8eec-2db037909586.jsonl`
- API 端点：`http://localhost:5173/api/agents/agent_feee4a5dac6d/messages?limit=20`
