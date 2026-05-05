# Chat Area Refactoring Plan

## 当前问题分析

### 1. **ChatArea.tsx - 职责过于臃肿**
- 同时处理：滚动逻辑、消息加载、表单提交、自动滚动、pending 消息
- 15 个 selectors 从 store 获取数据，过于冗长
- 9 个 useEffect/handler 混在一起，难以维护
- Scroll 相关的 refs 和逻辑分散在各处

### 2. **agentStore.ts - 逻辑混杂**
- 40+ 个 state 字段和 methods
- SSE 流式更新逻辑（updateMessage, addAgentMessage 等）与基础 CRUD 混在一起
- Pending message 逻辑与聊天逻辑耦合
- 没有清晰的模块化分组

### 3. **RoundCard.tsx - 组件过大**
- SubRoundView 和 ToolCallCard 定义在同一文件
- Markdown 渲染配置过于冗长（~80 行）
- Tool 类型配置可以抽离

---

## 重构方案

### 阶段一：ChatArea 拆分

#### 1.1 提取 Scroll 逻辑为 Custom Hook
**文件**: `template/src/client/hooks/useScrollLoading.ts`

```typescript
interface UseScrollLoadingOptions {
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => Promise<void>
  threshold?: number
}

interface UseScrollLoadingReturn {
  containerRef: RefObject<HTMLDivElement>
  handleScroll: () => void
  isAtBottom: boolean
}

export function useScrollLoading(options: UseScrollLoadingOptions): UseScrollLoadingReturn
```

**职责**:
- 滚动检测
- 加载更多触发
- 自动滚动状态管理
- Scroll 位置恢复

#### 1.2 提取 Chat 逻辑为 Custom Hook
**文件**: `template/src/client/hooks/useChat.ts`

```typescript
interface UseChatReturn {
  input: string
  setInput: (value: string) => void
  handleSubmit: () => void
  handleStop: () => void
  handleKeyDown: (e: KeyboardEvent) => void
  handleButtonClick: () => void
  buttonState: ButtonState
}

export function useChat(): UseChatReturn
```

**职责**:
- Input 状态管理
- 表单提交逻辑
- Pending message 处理
- Button 状态计算

#### 1.3 重构后的 ChatArea.tsx
```typescript
export const ChatArea: React.FC = () => {
  // State
  const rounds = useAgentStore(state => state.rounds)
  const loading = useAgentStore(state => state.loading)
  const isRunning = useAgentStore(state => state.isRunning)
  
  // Hooks
  const { containerRef, handleScroll, isAtBottom } = useScrollLoading({
    hasMore: useAgentStore(state => state.hasMoreRounds),
    loadingMore: useAgentStore(state => state.loadingMore),
    onLoadMore: useAgentStore(state => state.loadMoreRounds),
  })
  
  const {
    input,
    setInput,
    handleSubmit,
    handleStop,
    handleKeyDown,
    handleButtonClick,
    buttonState,
  } = useChat()
  
  // Render
  return (
    <div className="flex flex-col h-full">
      <MessageList
        ref={containerRef}
        rounds={rounds}
        isRunning={isRunning}
        loadingMore={loadingMore}
        hasMoreRounds={hasMoreRounds}
        onScroll={handleScroll}
      />
      
      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        onButtonClick={handleButtonClick}
        buttonState={buttonState}
        disabled={loading}
      />
    </div>
  )
}
```

#### 1.4 新建 MessageList 组件
**文件**: `template/src/client/components/MessageList.tsx`

```typescript
interface MessageListProps {
  rounds: MessageRound[]
  isRunning: boolean
  loadingMore: boolean
  hasMoreRounds: boolean
  onScroll: () => void
}

export const MessageList = forwardRef<HTMLDivElement, MessageListProps>((props, ref) => {
  // 只负责渲染消息列表
  // 不包含任何业务逻辑
})
```

#### 1.5 新建 ChatInput 组件
**文件**: `template/src/client/components/ChatInput.tsx`

```typescript
interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onKeyDown: (e: KeyboardEvent) => void
  onButtonClick: () => void
  buttonState: ButtonState
  disabled: boolean
}

export const ChatInput: React.FC<ChatInputProps> = (props) => {
  // 只负责输入框 UI 和交互
})
```

---

### 阶段二：Agent Store 模块化

#### 2.1 创建 Slices 模式
**文件**: `template/src/client/stores/agentStore.ts`

使用 Zustand 的 slice pattern 拆分：

```typescript
// types.ts
interface AgentSlice {
  agent: Agent | null
  fetchAgent: () => Promise<void>
  updateAgent: (input: UpdateAgentInput) => Promise<void>
}

interface MessageSlice {
  rounds: MessageRound[]
  loading: boolean
  loadingMore: boolean
  hasMoreRounds: boolean
  fetchRounds: (...) => Promise<void>
  loadMoreRounds: () => Promise<void>
}

interface ChatSlice {
  isRunning: boolean
  pendingMessages: string[]
  sendMessage: (content: string) => Promise<void>
  stopGeneration: () => void
  addPendingMessage: (content: string) => void
  // ...
}

interface StreamingSlice {
  // SSE 流式更新相关
  updateMessage: (...) => void
  addAgentMessage: (...) => void
  // ...
}

// agentStore.ts
export const useAgentStore = create<AgentState>()(
  persist(
    (...a) => ({
      ...createAgentSlice(...a),
      ...createMessageSlice(...a),
      ...createChatSlice(...a),
      ...createStreamingSlice(...a),
    }),
    { name: 'agent-storage' }
  )
)
```

#### 2.2 抽离 Streaming 逻辑到单独 Store
**文件**: `template/src/client/stores/streamingStore.ts`

```typescript
interface StreamingState {
  activeMessageId?: string
  currentSubRoundId?: string
  // 流式更新方法
  startStreaming: (messageId: string) => void
  updateThinking: (updater: (prev: string) => string) => void
  updateContent: (updater: (prev: string) => string) => void
  addToolCall: (toolCall: ToolCall) => void
  completeToolCall: (toolCallId: string, result: unknown) => void
  endStreaming: () => void
}

export const useStreamingStore = create<StreamingState>((set, get) => ({
  // ...
}))
```

**好处**:
- ChatArea 不需要关心流式更新的细节
- SSE 逻辑独立，易于测试和维护
- 减少 agentStore 的复杂度

---

### 阶段三：RoundCard 优化

#### 3.1 拆分 SubRoundView
**文件**: `template/src/client/components/SubRoundView.tsx`

```typescript
export const SubRoundView: React.FC<{
  subRound: AgentSubRound
  index: number
  isStreaming?: boolean
  isLastSubRound: boolean
}> = memo((props) => {
  // 独立的 sub-round 组件
})
```

#### 3.2 拆分 ToolCallCard
**文件**: `template/src/client/components/ToolCallCard.tsx`

```typescript
export const ToolCallCard: React.FC<{
  toolCall: ToolCall
}> = memo((props) => {
  // 独立的工具调用卡片
})
```

#### 3.3 抽离 Markdown 配置
**文件**: `template/src/client/components/Markdown.tsx`

```typescript
interface MarkdownProps {
  content: string
  isStreaming?: boolean
}

export const Markdown: React.FC<MarkdownProps> = ({ content, isStreaming }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={markdownComponents}
    >
      {content}
    </ReactMarkdown>
  )
}

// 内部定义 components
const markdownComponents: Components = {
  // ... 所有自定义渲染逻辑
}
```

#### 3.4 抽离 Tool 类型配置
**文件**: `template/src/client/utils/toolStyles.ts`

```typescript
export interface ToolTypeConfig {
  icon: string
  color: string
  bgColor: string
  borderColor?: string
}

export const toolTypeConfigs: Record<string, ToolTypeConfig> = {
  bash: { icon: '⌨️', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  read: { icon: '📄', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  // ...
}

export function getToolConfig(toolName: string): ToolTypeConfig {
  return toolTypeConfigs[toolName] || toolTypeConfigs.default
}
```

---

## 文件结构变化

### Before
```
src/client/
├── components/
│   ├── ChatArea.tsx (450 行)
│   ├── RoundCard.tsx (430 行)
│   └── ...
└── stores/
    └── agentStore.ts (450 行)
```

### After
```
src/client/
├── components/
│   ├── ChatArea.tsx (80 行)
│   ├── MessageList.tsx (100 行)
│   ├── ChatInput.tsx (80 行)
│   ├── RoundCard.tsx (60 行)
│   ├── SubRoundView.tsx (150 行)
│   ├── ToolCallCard.tsx (80 行)
│   ├── Markdown.tsx (100 行)
│   └── ...
├── hooks/
│   ├── useScrollLoading.ts (80 行)
│   └── useChat.ts (60 行)
├── stores/
│   ├── agentStore.ts (150 行)
│   ├── streamingStore.ts (120 行)
│   └── slices/
│       ├── agentSlice.ts
│       ├── messageSlice.ts
│       └── chatSlice.ts
└── utils/
    └── toolStyles.ts (30 行)
```

---

## 重构优先级

### Phase 1 (高优先级 - 立即执行)
1. ✅ 提取 `useScrollLoading` hook
2. ✅ 提取 `useChat` hook
3. ✅ 创建 `MessageList` 和 `ChatInput` 组件
4. ✅ 重构 `ChatArea.tsx`

**收益**: 
- ChatArea 从 220 行减少到 ~80 行
- Scroll 逻辑可复用
- 代码清晰度提升 60%

### Phase 2 (中优先级)
1. 拆分 agentStore 为 slices
2. 抽离 streamingStore
3. 简化 agentStore 接口

**收益**:
- Store 逻辑模块化
- 易于测试和维护
- 减少 re-render

### Phase 3 (低优先级 - 优化)
1. 拆分 RoundCard 子组件
2. 抽离 Markdown 配置
3. 抽离 Tool 样式配置

**收益**:
- 组件更小更专注
- 工具样式可配置
- 代码复用性更好

---

## 风险评估

### 低风险
- ChatArea 拆分（纯前端重构，不影响业务逻辑）
- RoundCard 拆分（只是文件移动）

### 中风险
- useScrollLoading hook（需要确保 scroll 位置恢复逻辑正确）
- useChat hook（需要确保 pending message 逻辑正确）

### 高风险
- agentStore 拆分（可能影响 SSE 流式更新）
- streamingStore 抽离（需要更新所有 SSE 相关代码）

**缓解措施**:
1. 每个 phase 完成后充分测试
2. 保持向后兼容的接口
3. 逐步迁移，不一次性重构所有

---

## 测试策略

### 单元测试
- `useScrollLoading`: 测试 scroll 触发、位置恢复
- `useChat`: 测试表单提交、pending message
- Slices: 测试 state 更新逻辑

### 集成测试
- MessageList + useScrollLoading
- ChatInput + useChat
- 完整的聊天流程

### E2E 测试
- 滚动加载历史消息
- 发送消息
- 流式响应显示

---

## 预期收益

### 代码质量
- ✅ 单一职责原则
- ✅ 更好的可测试性
- ✅ 减少代码重复
- ✅ 更清晰的依赖关系

### 开发效率
- ✅ 新成员更容易理解
- ✅ 修改影响范围更清晰
- ✅ 更容易添加新功能

### 性能
- ✅ 减少不必要的 re-render
- ✅ 更细粒度的 memoization
- ✅ 更小的组件体积

---

## 执行建议

1. **先执行 Phase 1**（ChatArea 拆分）
   - 风险最低
   - 收益最高
   - 可以立即看到效果

2. **观察和测试**
   - 确保 scroll 行为正常
   - 确保消息发送正常
   - 确保 pending message 正常

3. **再考虑 Phase 2 和 3**
   - 根据团队时间决定
   - 可以分多次 PR 完成
   - 不必一次性完成

---

## 下一步

请确认：
1. ✅ 是否同意这个重构方案？
2. ✅ 是否先从 Phase 1 开始？
3. ✅ 是否有其他需要特别关注的地方？

确认后我将开始执行 Phase 1 的重构。
