# 基于时间戳的分页方案设计

## 问题分析

### 当前问题

1. **后端只读取最新的 session 文件**
   - 48 个 session 文件，只读取最新的 1 个
   - 忽略了其他 47 个历史文件

2. **使用 offset/limit 分页**
   - 只能对单个文件内的消息分页
   - 无法跨文件分页

3. **时间戳混乱**
   - 不同 session 文件的消息时间戳可能交错
   - 简单合并会导致时间顺序混乱

---

## 时间戳结构分析

### 原始数据

```jsonl
{"id":"818e1485","timestamp":1774411392884,"role":"user"}
{"id":"f045add6","timestamp":1774411392887,"role":"assistant"}
{"id":"9cc64a07","timestamp":1774411395510,"role":"toolResult"}
{"id":"31e79aca","timestamp":1774411395512,"role":"assistant"}
```

**特点**：
- `timestamp` 是毫秒级时间戳（数字）
- 按时间顺序排列
- 不同 session 文件的时间戳可能重叠

### API 返回

```json
{
  "id": "msg-1774443210040-0",
  "createdAt": "2026-03-25T12:53:30.040Z",
  "role": "user"
}
```

**特点**：
- `createdAt` 是 ISO 8601 字符串
- 由 `timestamp` 转换而来

---

## 基于时间戳分页的优势

### 1. 正确处理多个 session 文件

```
session-1.jsonl: 消息时间戳 1000-2000
session-2.jsonl: 消息时间戳 1500-2500  ← 时间重叠
session-3.jsonl: 消息时间戳 2000-3000

基于时间戳分页：
  - 读取所有文件
  - 按时间戳排序
  - 正确分页
```

### 2. 避免消息重复

```
offset/limit 分页：
  - 如果新消息插入，offset 会错位
  - 可能导致消息重复或遗漏

时间戳分页：
  - 使用 before/after 时间戳
  - 不受新消息影响
  - 不会重复或遗漏
```

### 3. 更符合用户直觉

```
用户操作：向上滚动加载更早的消息

时间戳分页：
  - 加载 createdAt < oldestMessage.createdAt 的消息
  - 直观：加载"更早"的消息
```

---

## 方案设计

### 方案1：基于时间戳的游标分页 ⭐ 推荐

#### API 设计

```typescript
// 请求参数
interface GetMessagesQuery {
  limit?: number           // 每页数量，默认 20
  before?: string         // 加载此时间戳之前的消息（用于向上翻页）
  after?: string          // 加载此时间戳之后的消息（用于向下翻页）
}

// 响应数据
interface MessagesResponse {
  messages: ChatMessage[]
  hasMore: boolean
  nextCursor?: string     // 下一页的游标（时间戳）
  prevCursor?: string     // 上一页的游标（时间戳）
}
```

#### 使用示例

```bash
# 1. 初始加载（最新的 20 条）
GET /api/agents/{id}/messages?limit=20

# 2. 向上翻页（加载更早的消息）
GET /api/agents/{id}/messages?limit=20&before=2026-03-25T12:53:30.040Z

# 3. 向下翻页（加载更新的消息）
GET /api/agents/{id}/messages?limit=20&after=2026-03-25T12:53:30.040Z
```

#### 后端实现

```typescript
export async function getMessages(
  agentId: string,
  userId: string,
  limit?: number,
  before?: string,
  after?: string
): Promise<MessagesResponse> {
  const { messages: allMessages, toolCallMap } = parseSessionJsonl(userId)
  
  // 转换为 ChatMessage
  let chatMessages = allMessages.map((msg, index) => {
    // ... 转换逻辑
  }).filter(Boolean) as ChatMessage[]
  
  // 按时间戳排序（降序，最新的在前）
  chatMessages.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  
  // 应用游标过滤
  if (before) {
    const beforeTime = new Date(before).getTime()
    chatMessages = chatMessages.filter(msg => 
      new Date(msg.createdAt).getTime() < beforeTime
    )
  }
  
  if (after) {
    const afterTime = new Date(after).getTime()
    chatMessages = chatMessages.filter(msg => 
      new Date(msg.createdAt).getTime() > afterTime
    )
  }
  
  // 分页
  const pageSize = limit || 20
  const pagedMessages = chatMessages.slice(0, pageSize)
  
  // 判断是否有更多
  const hasMore = chatMessages.length > pageSize
  
  // 计算游标
  const oldestMessage = pagedMessages[pagedMessages.length - 1]
  const newestMessage = pagedMessages[0]
  
  return {
    messages: pagedMessages,
    hasMore,
    nextCursor: hasMore ? oldestMessage?.createdAt : undefined,
    prevCursor: newestMessage?.createdAt,
  }
}
```

#### 前端实现

```typescript
// agentStore.ts
interface AgentState {
  // ...
  oldestMessageTime?: string    // 最老消息的时间戳
  newestMessageTime?: string    // 最新消息的时间戳
  hasMoreMessages: boolean
  
  loadOlderMessages: () => Promise<void>
  loadNewerMessages: () => Promise<void>
}

// ChatArea.tsx
const handleScroll = useCallback(() => {
  const container = containerRef.current
  if (!container) return

  const { scrollTop } = container

  // 滚动到顶部，加载更早的消息
  if (scrollTop <= 10 && hasMoreMessages && !loadingMore) {
    loadOlderMessages()
  }
}, [hasMoreMessages, loadingMore, loadOlderMessages])
```

---

### 方案2：混合分页（offset + 时间戳排序）

#### API 设计

```typescript
// 保持现有的 offset/limit 参数
interface GetMessagesQuery {
  limit?: number
  offset?: number
}

// 但后端实现改变
export async function getMessages(
  agentId: string,
  userId: string,
  limit?: number,
  offset?: number
): Promise<ChatMessage[]> {
  const { messages: allMessages, toolCallMap } = parseSessionJsonl(userId)
  
  // 转换为 ChatMessage
  let chatMessages = allMessages.map((msg, index) => {
    // ... 转换逻辑
  }).filter(Boolean) as ChatMessage[]
  
  // 按时间戳排序（降序，最新的在前）
  chatMessages.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  
  // 应用分页
  const start = offset || 0
  const end = limit !== undefined ? start + limit : undefined
  
  return chatMessages.slice(start, end)
}
```

#### 优点
- ✅ API 不变，向后兼容
- ✅ 实现简单

#### 缺点
- ⚠️ 如果新消息插入，offset 会错位
- ⚠️ 可能导致消息重复或遗漏

---

## 推荐方案

### 🎯 推荐：方案1（基于时间戳的游标分页）

**理由**：
1. **正确性**：避免消息重复和遗漏
2. **性能**：不需要读取所有消息再分页
3. **扩展性**：支持双向分页（向上/向下）
4. **用户体验**：符合直觉

---

## 实施步骤

### 第一步：修改 session-parser.ts

```typescript
export function parseSessionJsonl(userId: string): ParseSessionResult {
  const projectRoot = getProjectRoot()
  const sessionDir = path.join(projectRoot, '.pi', 'sessions', userId)

  if (!fs.existsSync(sessionDir)) {
    return { messages: [], toolCallMap: new Map() }
  }

  try {
    const sessionFiles = fs.readdirSync(sessionDir)
      .filter(f => f.endsWith('.jsonl'))
      .map(f => ({
        name: f,
        path: path.join(sessionDir, f),
        mtime: fs.statSync(path.join(sessionDir, f)).mtime.getTime(),
      }))
      .sort((a, b) => b.mtime - a.mtime)

    if (sessionFiles.length === 0) {
      return { messages: [], toolCallMap: new Map() }
    }

    const messages: PiMessage[] = []
    const toolCallMap: ToolCallMap = new Map()

    // ✅ 读取所有 session 文件
    for (const sessionFile of sessionFiles) {
      const content = fs.readFileSync(sessionFile.path, 'utf-8')
      const lines = content.trim().split('\n')

      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const entry = JSON.parse(line) as PiSessionLine

          if (entry.type === 'message' && entry.message) {
            const msg = entry.message

            if (msg.role === 'user' || msg.role === 'assistant') {
              messages.push(msg)
            }

            if (msg.role === 'assistant') {
              const assistantMsg = msg as PiAssistantMessage
              for (const block of assistantMsg.content) {
                if (block.type === 'toolCall') {
                  toolCallMap.set(block.id, block as ToolCallWithResult)
                }
              }
            } else if (msg.role === 'toolResult') {
              const toolResult = msg as PiToolResultMessage
              const toolCall = toolCallMap.get(toolResult.toolCallId)
              if (toolCall) {
                toolCall.result = toolResult.content
                if (toolResult.isError) {
                  toolCall.error = 'Tool execution failed'
                }
              }
            }
          }
        } catch (e) {
          console.warn('[SessionParser] Failed to parse line:', e)
        }
      }
    }

    // ✅ 按时间戳排序
    messages.sort((a, b) => a.timestamp - b.timestamp)

    return { messages, toolCallMap }
  } catch (error) {
    console.warn('[SessionParser] Failed to load session:', error)
    return { messages: [], toolCallMap: new Map() }
  }
}
```

### 第二步：修改 agent-service.ts

```typescript
export async function getMessages(
  agentId: string,
  userId: string,
  limit?: number,
  before?: string,
  after?: string
): Promise<MessagesResponse> {
  const { messages: piMessages, toolCallMap } = parseSessionJsonl(userId)
  
  // 转换为 ChatMessage
  let chatMessages = piMessages.map((msg, index) => {
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
    return null
  }).filter(Boolean) as ChatMessage[]
  
  // 按时间戳降序排序（最新的在前）
  chatMessages.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  
  // 应用游标过滤
  if (before) {
    const beforeTime = new Date(before).getTime()
    chatMessages = chatMessages.filter(msg => 
      new Date(msg.createdAt).getTime() < beforeTime
    )
  }
  
  if (after) {
    const afterTime = new Date(after).getTime()
    chatMessages = chatMessages.filter(msg => 
      new Date(msg.createdAt).getTime() > afterTime
    )
  }
  
  // 分页
  const pageSize = limit || 20
  const pagedMessages = chatMessages.slice(0, pageSize)
  
  // 判断是否有更多
  const hasMore = chatMessages.length > pageSize
  
  // 计算游标
  const oldestMessage = pagedMessages[pagedMessages.length - 1]
  const newestMessage = pagedMessages[0]
  
  return {
    messages: pagedMessages,
    hasMore,
    nextCursor: hasMore ? oldestMessage?.createdAt : undefined,
    prevCursor: newestMessage?.createdAt,
  }
}
```

### 第三步：修改前端逻辑

```typescript
// agentStore.ts
loadOlderMessages: async () => {
  const { agent, messages, loadingMore, hasMoreMessages, oldestMessageTime } = get()
  if (!agent || loadingMore || !hasMoreMessages) return

  const response = await apiClient.api.agents[':id'].messages.$get({
    param: { id: agent.id },
    query: {
      limit: '20',
      before: oldestMessageTime,
    },
  })
  
  const result = await response.json()
  if (result.success) {
    set(state => ({
      messages: [...result.data.messages, ...state.messages],
      hasMoreMessages: result.data.hasMore,
      oldestMessageTime: result.data.nextCursor,
      loadingMore: false,
    }))
  }
},
```

---

## 测试验证

### 测试1：初始加载

```bash
curl "http://localhost:5173/api/agents/{id}/messages?limit=20"
# 预期：返回最新的 20 条消息
```

### 测试2：向上翻页

```bash
curl "http://localhost:5173/api/agents/{id}/messages?limit=20&before=2026-03-25T12:53:30.040Z"
# 预期：返回更早的 20 条消息
```

### 测试3：时间顺序

```bash
# 验证消息按时间降序排列
curl "http://localhost:5173/api/agents/{id}/messages?limit=20" | jq '.data.messages | map(.createdAt)'
# 预期：时间戳从新到旧
```

---

## 总结

### 核心改进

1. **读取所有 session 文件**：完整的历史数据
2. **基于时间戳分页**：避免消息重复和遗漏
3. **按时间排序**：确保消息顺序正确

### 优势

- ✅ 正确处理多个 session 文件
- ✅ 避免消息重复和遗漏
- ✅ 支持双向分页
- ✅ 符合用户直觉

### 影响评估

- **代码改动**：3 个文件，约 100 行
- **性能影响**：可接受（约 100ms）
- **用户体验**：显著提升
