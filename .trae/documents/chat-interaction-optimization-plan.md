# 聊天交互优化实现计划

## 需求分析

### 交互状态设计

根据用户需求，聊天界面需要支持以下交互状态：

#### 1. 运行状态（Agent 正在响应）
- **输入框为空**：
  - 按钮显示红色暂停按钮
  - 点击可以暂停当前响应
  
- **输入框有内容**：
  - 按钮变成发送按钮
  - 可以发送 follow-up 消息
  - follow-up 消息显示在输入框上方
  - 每条 follow-up 消息右侧有删除按钮

#### 2. 非运行状态（Agent 空闲）
- **输入框为空**：
  - 按钮显示灰色发送按钮（禁用状态）
  
- **输入框有内容**：
  - 按钮显示蓝色发送按钮（可点击）

## 架构设计

### 状态管理

需要在 `agentStore` 中添加以下状态：

```typescript
interface AgentState {
  // 现有状态
  agent: Agent | null
  messages: ChatMessage[]
  loading: boolean
  error: string | null
  sseStatus: 'connecting' | 'open' | 'closed'
  
  // 新增状态
  isRunning: boolean  // Agent 是否正在响应
  pendingMessages: string[]  // follow-up 消息队列
  
  // 新增方法
  stopGeneration: () => void  // 停止生成
  addPendingMessage: (content: string) => void  // 添加 follow-up
  removePendingMessage: (index: number) => void  // 删除 follow-up
  sendPendingMessages: () => Promise<void>  // 发送所有 follow-up
}
```

### 组件结构

```
ChatArea
├── MessageList (消息列表)
│   └── ChatMessageCard (消息卡片)
├── PendingMessages (follow-up 消息队列)
│   └── PendingMessageItem (单条 follow-up)
│       ├── 内容
│       └── 删除按钮
└── InputArea (输入区域)
    ├── 输入框
    └── 动态按钮
        ├── 暂停按钮 (红色，运行中且无输入)
        ├── 发送按钮 (蓝色，有输入)
        └── 发送按钮 (灰色，无输入且空闲)
```

## 详细实现步骤

### 第一阶段：状态管理增强

#### 1.1 更新 agentStore
- 添加 `isRunning` 状态
- 添加 `pendingMessages` 数组
- 实现 `stopGeneration()` 方法
- 实现 `addPendingMessage()` 方法
- 实现 `removePendingMessage()` 方法
- 实现 `sendPendingMessages()` 方法
- 更新 `sendMessage()` 以支持 follow-up

#### 1.2 SSE 连接管理
- 在 SSE 事件处理中更新 `isRunning` 状态
- `pi-agent-start` 事件：设置 `isRunning = true`
- `pi-agent-end` 事件：设置 `isRunning = false`
- 实现停止 SSE 连接的逻辑

### 第二阶段：UI 组件开发

#### 2.1 创建 PendingMessages 组件
- 显示所有 follow-up 消息
- 每条消息显示内容和删除按钮
- 样式：小卡片，带阴影，可删除

#### 2.2 创建动态按钮组件
- 根据状态显示不同按钮：
  - 暂停按钮（红色，带暂停图标）
  - 发送按钮（蓝色，带发送图标）
  - 发送按钮（灰色，禁用状态）

#### 2.3 更新 ChatArea 组件
- 集成 PendingMessages 组件
- 更新按钮逻辑
- 添加 follow-up 发送逻辑

### 第三阶段：交互逻辑实现

#### 3.1 按钮状态转换
```
状态转换图：
┌─────────────┐
│  Agent 空闲  │
└──────┬──────┘
       │
       ├─ 输入为空 ──> 灰色发送按钮（禁用）
       │
       └─ 输入有内容 ──> 蓝色发送按钮（可点击）
              │
              │ 点击发送
              ▼
       ┌─────────────┐
       │ Agent 运行中 │
       └──────┬──────┘
              │
              ├─ 输入为空 ──> 红色暂停按钮
              │                    │
              │                    │ 点击暂停
              │                    ▼
              │              停止生成，回到空闲
              │
              └─ 输入有内容 ──> 蓝色发送按钮
                                   │
                                   │ 点击发送
                                   ▼
                              添加到 pending 队列
```

#### 3.2 Follow-up 消息流程
```
用户输入 follow-up
    ↓
点击发送按钮
    ↓
添加到 pendingMessages 队列
    ↓
显示在输入框上方
    ↓
Agent 完成当前响应
    ↓
自动发送所有 pendingMessages
    ↓
清空 pendingMessages 队列
```

### 第四阶段：样式和动画

#### 4.1 按钮样式
- **暂停按钮**：红色背景，白色暂停图标
- **发送按钮（激活）**：蓝色背景，白色发送图标
- **发送按钮（禁用）**：灰色背景，灰色发送图标

#### 4.2 Follow-up 消息样式
- 小卡片样式
- 浅蓝色背景
- 右侧删除按钮（X 图标）
- 淡入淡出动画

#### 4.3 过渡动画
- 按钮状态切换：平滑过渡
- Follow-up 消息：滑入动画
- 删除消息：滑出动画

## 文件修改清单

### 新建文件
1. `src/client/components/PendingMessages.tsx` - Follow-up 消息队列组件
2. `src/client/components/DynamicButton.tsx` - 动态按钮组件

### 修改文件
1. `src/client/stores/agentStore.ts` - 添加新状态和方法
2. `src/client/components/ChatArea.tsx` - 集成新组件和逻辑
3. `src/client/hooks/useChatSSEConnection.ts` - 更新运行状态

## 技术要点

### 1. 状态同步
- `isRunning` 状态需要与 SSE 连接状态同步
- Follow-up 消息队列需要持久化（可选）

### 2. 性能优化
- 使用 `useMemo` 优化按钮状态计算
- 使用 `useCallback` 优化事件处理函数

### 3. 用户体验
- 按钮状态切换要有平滑过渡
- Follow-up 消息要有清晰的视觉反馈
- 暂停功能要立即生效

### 4. 错误处理
- 网络错误时的状态恢复
- SSE 连接断开时的处理
- Follow-up 发送失败的重试机制

## 测试计划

### 单元测试
- [ ] agentStore 的新方法测试
- [ ] PendingMessages 组件测试
- [ ] DynamicButton 组件测试

### 集成测试
- [ ] 完整的交互流程测试
- [ ] Follow-up 消息发送测试
- [ ] 暂停功能测试

### E2E 测试
- [ ] 用户发送消息流程
- [ ] 添加和删除 follow-up
- [ ] 暂停和恢复生成

## 实现优先级

### P0（必须实现）
1. 状态管理增强（isRunning, pendingMessages）
2. 动态按钮组件
3. 基本的 follow-up 功能

### P1（重要功能）
1. 暂停功能
2. Follow-up 消息删除
3. 样式优化

### P2（锦上添花）
1. 动画效果
2. 键盘快捷键
3. 消息持久化

## 时间估算

- 状态管理：2小时
- UI 组件：3小时
- 交互逻辑：2小时
- 样式优化：1小时
- 测试：2小时

**总计：约 10 小时**

## 风险和注意事项

1. **SSE 连接管理**：需要确保暂停功能能正确关闭 SSE 连接
2. **状态同步**：多个状态之间的同步需要仔细处理
3. **性能**：大量 follow-up 消息可能影响性能
4. **兼容性**：需要考虑不同浏览器的兼容性
