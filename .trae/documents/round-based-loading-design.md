# 历史消息按轮次加载方案

## 问题分析

### 当前加载策略的问题

**现状**：按消息数量加载（limit=20）

```json
[
  { "role": "user" },    // 轮次1开始
  { "role": "agent" },
  { "role": "agent" },   // ← 如果在这里断开，轮次1不完整
  { "role": "user" },    // 轮次2开始
  { "role": "agent" },
  ...
]
```

**问题**：
1. ❌ 在轮次中间断开，导致轮次不完整
2. ❌ 工具调用被截断，无法正确展示
3. ❌ 无法正确闭合轮次
4. ❌ 用户体验差

### 轮次结构

```json
{
  "userMessage": { "role": "user", "content": "ls" },
  "agentMessages": [
    { "role": "agent", "subRounds": [{ "toolCalls": [...] }] },  // 工具调用
    { "role": "agent", "subRounds": [{ "content": "..." }] }     // 最终回复
  ]
}
```

一个完整的轮次 = 1个user消息 + N个agent消息

---

## 解决方案

### 方案1：按轮次加载 ⭐ 推荐

#### API 设计

```typescript
// 请求参数
interface GetRoundsQuery {
  limit?: number      // 加载轮次数，默认 10
  before?: string    // 加载此时间之前的轮次（基于最早消息的时间戳）
  after?: string     // 加载此时间之后的轮次
}

// 响应数据
interface RoundsResponse {
  rounds: MessageRound[]
  hasMore: boolean
  oldestTimestamp?: string   // 最老轮次的时间戳
  newestTimestamp?: string   // 最新轮次的时间戳
}

// MessageRound 结构
interface MessageRound {
  userMessage: ChatMessage
  agentMessages: ChatMessage[]
  timestamp: string  // 轮次的时间戳（user 消息的时间）
}
```

#### 使用示例

```bash
# 初始加载（最新 10 轮）
GET /api/agents/{id}/rounds?limit=10

# 向上翻页（加载更早的轮次）
GET /api/agents/{id}/rounds?limit=10&before=2026-03-25T09:40:03.099Z
```

#### 优点

- ✅ 每轮加载都是完整的
- ✅ 不会在轮次中间断开
- ✅ 工具调用总是完整的
- ✅ 用户体验好

#### 缺点

- ⚠️ 实现复杂
- ⚠️ 需要修改 API 和前端

---

### 方案2：优化当前方案（简单修复）

#### 思路

保持当前的扁平消息结构，但确保：
1. 加载时包含完整的轮次
2. 避免在轮次中间断开

#### 实现

```typescript
// 后端：确保返回完整的轮次
export async function getMessages(..., limit?: number, offset?: number) {
  const allMessages = parseSessionJsonl(userId)
  
  // 按时间排序（降序）
  allMessages.sort((a, b) => b.timestamp - a.timestamp)
  
  // 按 user-agent 分组
  const rounds = groupIntoRounds(allMessages)
  
  // 计算起始位置（基于轮次，而不是消息）
  const startRound = Math.floor(offset / roundsPerPage)
  const startMessageIndex = findFirstMessageIndexOfRound(rounds, startRound)
  
  // 确保加载完整的轮次
  const messages = []
  let roundCount = 0
  for (let i = startMessageIndex; i < allMessages.length && roundCount < limit; i++) {
    messages.push(allMessages[i])
    if (allMessages[i].role === 'user' && i > startMessageIndex) {
      roundCount++
    }
  }
  
  return messages
}
```

#### 优点

- ✅ 实现相对简单
- ✅ 不改变 API 结构
- ✅ 保持向后兼容

#### 缺点

- ⚠️ 轮次大小不一，limit 不精确

---

## 推荐方案

### 🎯 方案1：按轮次加载

**理由**：
1. **正确性**：确保每轮加载都是完整的
2. **用户体验**：不会在轮次中间断开
3. **数据完整性**：工具调用总是完整的

---

## 实施细节

### 1. 后端实现

#### 新增 API 端点

```typescript
// agent-routes.ts
router.get(
  '/:agentId/rounds',
  async (ctx) => {
    const { agentId } = ctx.params
    const { limit = '10', before, after } = ctx.query
    
    const rounds = await getRounds(agentId, userId, {
      limit: parseInt(limit),
      before,
      after,
    })
    
    ctx.body = {
      success: true,
      data: rounds,
    }
  }
)
```

#### 按轮次分组

```typescript
// agent-service.ts
export async function getRounds(
  agentId: string,
  userId: string,
  options: { limit?: number, before?: string, after?: string }
): Promise<RoundsResponse> {
  const { messages: piMessages, toolCallMap } = parseSessionJsonl(userId)
  
  // 转换为 ChatMessage
  const chatMessages = piMessages.map((msg, index) => {
    // ... 转换逻辑
  }).filter(Boolean) as ChatMessage[]
  
  // 按时间排序（降序）
  chatMessages.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  
  // 应用时间过滤
  let filteredMessages = chatMessages
  if (options.before) {
    const beforeTime = new Date(options.before).getTime()
    filteredMessages = filteredMessages.filter(msg => 
      new Date(msg.createdAt).getTime() < beforeTime
    )
  }
  if (options.after) {
    const afterTime = new Date(options.after).getTime()
    filteredMessages = filteredMessages.filter(msg => 
      new Date(msg.createdAt).getTime() > afterTime
    )
  }
  
  // 按轮次分组
  const rounds = groupMessagesIntoRounds(filteredMessages)
  
  // 应用 limit
  const limitedRounds = rounds.slice(0, options.limit || 10)
  
  // 判断是否有更多
  const hasMore = rounds.length > (options.limit || 10)
  
  return {
    rounds: limitedRounds,
    hasMore,
    oldestTimestamp: limitedRounds[limitedRounds.length - 1]?.timestamp,
    newestTimestamp: limitedRounds[0]?.timestamp,
  }
}

function groupMessagesIntoRounds(messages: ChatMessage[]): MessageRound[] {
  const rounds: MessageRound[] = []
  let currentRound: MessageRound | null = null
  
  for (const msg of messages) {
    if (msg.role === 'user') {
      currentRound = {
        userMessage: msg,
        agentMessages: [],
        timestamp: msg.createdAt,
      }
      rounds.push(currentRound)
    } else if (msg.role === 'agent' && currentRound) {
      currentRound.agentMessages.push(msg)
    }
  }
  
  return rounds
}
```

### 2. 前端实现

#### 修改 agentStore

```typescript
// agentStore.ts
interface AgentState {
  // ...
  rounds: MessageRound[]
  oldestTimestamp?: string
  newestTimestamp?: string
  hasMoreRounds: boolean
  
  loadRounds: async (limit?: number) => {
    const response = await apiClient.api.agents[':id'].rounds.$get({
      param: { id: agentId },
      query: { limit: limit.toString() },
    })
    
    const result = await response.json()
    if (result.success) {
      set(state => ({
        rounds: result.data.rounds,
        hasMoreRounds: result.data.hasMore,
        oldestTimestamp: result.data.oldestTimestamp,
        newestTimestamp: result.data.newestTimestamp,
      }))
    }
  }
  
  loadMoreRounds: async () => {
    const { rounds, oldestTimestamp, hasMoreRounds, loadingMore } = get()
    if (!hasMoreRounds || loadingMore) return
    
    const response = await apiClient.api.agents[':id'].rounds.$get({
      param: { id: agentId },
      query: {
        limit: '10',
        before: oldestTimestamp,
      },
    })
    
    const result = await response.json()
    if (result.success) {
      set(state => ({
        rounds: [...state.rounds, ...result.data.rounds],
        hasMoreRounds: result.data.hasMore,
        oldestTimestamp: result.data.oldestTimestamp,
      }))
    }
  }
}
```

#### 修改 ChatArea

```tsx
// ChatArea.tsx
const { rounds, loadMoreRounds, hasMoreRounds, loadingMore } = useAgentStore()

const handleScroll = useCallback(() => {
  const container = containerRef.current
  if (!container) return

  const { scrollTop } = container

  // 滚动到顶部，加载更多轮次
  if (scrollTop <= 10 && hasMoreRounds && !loadingMore) {
    loadMoreRounds()
  }
}, [hasMoreRounds, loadingMore, loadMoreRounds])

return (
  <div ref={containerRef} onScroll={handleScroll}>
    {rounds.map((round, index) => (
      <RoundCard
        key={round.userMessage.id || index}
        userMessage={round.userMessage}
        agentMessages={round.agentMessages}
      />
    ))}
  </div>
)
```

---

## 测试验证

### 测试1：初始加载

```bash
curl "http://localhost:5173/api/agents/{id}/rounds?limit=10"
# 预期：返回 10 个完整轮次
```

### 测试2：轮次完整性

```bash
curl "http://localhost:5173/api/agents/{id}/rounds?limit=10"
# 验证：每个轮次都包含 1 个 user 消息 + N 个 agent 消息
```

### 测试3：翻页

```bash
# 获取第一批轮次的时间戳
curl "http://localhost:5173/api/agents/{id}/rounds?limit=10" | jq '.data.oldestTimestamp'

# 使用 before 参数加载更早的轮次
curl "http://localhost:5173/api/agents/{id}/rounds?limit=10&before=2026-03-25T09:40:03.099Z"
# 预期：返回更早的 10 个完整轮次
```

---

## 性能考虑

### 当前数据规模

```
轮次数量：约 30-40 轮
平均每轮消息数：2-3 条
总消息数：约 100 条
```

### 性能评估

- **读取时间**：约 50-100ms
- **分组时间**：约 5-10ms
- **内存占用**：约 1-2MB
- **评估**：✅ 性能可接受

---

## 向后兼容性

### 保持现有 API

```typescript
// 仍然支持旧的 API
GET /api/agents/{id}/messages?limit=20&offset=0

// 新增轮次 API
GET /api/agents/{id}/rounds?limit=10&before=...
```

### 前端渐进迁移

1. 先保持现有逻辑
2. 新增轮次 API
3. 前端逐步迁移到新 API

---

## 总结

### 核心改进

1. **按轮次加载**：确保每轮加载都是完整的
2. **避免截断**：不会在轮次中间断开
3. **工具完整性**：工具调用总是完整的
4. **用户体验**：更好的滚动加载体验

### 实施步骤

1. 新增 `/rounds` API 端点
2. 实现按轮次分组逻辑
3. 修改前端使用新 API
4. 测试验证功能

### 影响评估

- **代码改动**：中等（需要修改 API 和前端）
- **性能影响**：可接受
- **用户体验**：显著提升
