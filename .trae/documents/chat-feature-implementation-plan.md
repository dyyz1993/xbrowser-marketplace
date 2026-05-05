# 聊天功能添加计划

## 项目背景

根据 llm-chat-skill 的指导，为当前项目的 client 端添加完整的聊天功能。

## 已完成的修改

### 1. 共享类型定义

#### 新建文件
- `src/shared/modules/agent/schemas.ts` - 聊天相关的 Zod schemas
  - `MessageRoleSchema` - 消息角色枚举
  - `ChatMessageSchema` - 聊天消息结构
  - `AgentSchema` - Agent 配置结构
  - `CreateAgentSchema` / `UpdateAgentSchema` - 创建/更新 Agent
  - `SendMessageSchema` / `GetMessagesSchema` - 发送/获取消息
  - SSE 事件类型 schemas (`PiTextDeltaEvent`, `PiToolStartEvent` 等)
  - `ChatSSEProtocolSchema` - 完整的 SSE 协议定义

- `src/shared/modules/agent/index.ts` - 导出所有类型和 schemas

#### 修改文件
- `src/shared/modules/index.ts` - 添加 agent 模块的导出

### 2. 状态管理

#### 新建文件
- `src/client/stores/agentStore.ts` - Agent 状态管理
  - 状态：
    - `agent: Agent | null` - 当前 Agent 信息
    - `messages: ChatMessage[]` - 消息列表
    - `loading: boolean` - 加载状态
    - `error: string | null` - 错误信息
    - `sseStatus: 'connecting' | 'open' | 'closed'` - SSE 连接状态
  
  - 方法：
    - `fetchAgent()` - 获取 Agent 信息
    - `updateAgent()` - 更新 Agent 配置
    - `sendMessage()` - 发送消息
    - `fetchMessages()` - 获取历史消息
    - `updateMessageContent()` - 增量更新消息内容
    - `setMessageStreaming()` - 设置消息流式状态
    - `addAgentMessage()` - 添加 AI 消息
    - `clearMessages()` - 清空消息

### 3. UI 组件

#### 新建文件
- `src/client/components/ChatMessageCard.tsx` - 聊天消息卡片组件
  - 功能：
    - 区分用户和 AI 消息样式
    - 显示思考过程（thinking）
    - 显示工具调用（toolCalls）
    - 流式消息加载动画
    - 时间戳显示

- `src/client/components/ChatArea.tsx` - 聊天区域组件
  - 功能：
    - 消息列表显示
    - 自动滚动到最新消息
    - 消息输入框
    - 发送按钮
    - 快捷键支持（Enter 发送，Shift+Enter 换行）
    - 空状态提示

#### 修改文件
- `src/client/components/index.ts` - 导出新组件
  - 导出 `ChatMessageCard`
  - 导出 `ChatArea`

### 4. 页面组件

#### 新建文件
- `src/client/pages/ChatPage.tsx` - 聊天页面
  - 布局：
    - 左侧边栏：Agent 信息、清空聊天、设置按钮
    - 右侧主区域：聊天界面
  - 功能：
    - 初始化 Agent
    - 清空聊天记录
    - 响应式设计

### 5. 路由和导航

#### 修改文件
- `src/client/App.tsx` - 添加聊天路由
  - 导入 `ChatPage` 组件
  - 添加 `/chat` 路由

- `src/client/components/Navigation.tsx` - 添加聊天导航项
  - 导入 `MessageSquare` 图标
  - 添加 `chat` 路由配置
  - 更新 `RouteKey` 类型

## 技术要点

### 类型安全
- ✅ 所有组件都有完整的 TypeScript 类型定义
- ✅ 使用 Zod schemas 进行运行时验证
- ✅ 遵循项目的 `require-nullable-for-optional` 规则

### 代码规范
- ✅ 通过 TypeScript 类型检查
- ✅ 通过 ESLint 检查
- ✅ 遵循项目现有的代码风格

### 组件设计
- ✅ 保持与现有组件（TodoPage, WebSocketPage）一致的设计模式
- ✅ 使用 Zustand 进行状态管理
- ✅ 使用 Tailwind CSS 进行样式设计
- ✅ 支持测试（data-testid 属性）

## 当前实现状态

### ✅ 已实现
1. 基础聊天界面
2. 消息发送和接收（模拟响应）
3. 消息卡片样式
4. 流式消息支持（UI 层面）
5. 工具调用展示
6. 思考过程展示

### 🔄 待实现（需要后端支持）
1. **后端 API 路由**
   - `POST /api/agents/:id/chat` - 发送消息
   - `GET /api/agents/:id/messages` - 获取历史消息
   - `GET /api/chat/stream` - SSE 流式连接

2. **SSE 流式通信**
   - 实现 SSE 客户端连接
   - 处理各种 SSE 事件
   - 自动重连机制

3. **真实 LLM 集成**
   - 连接 OpenAI/Claude API
   - 实现流式响应
   - 错误处理

4. **历史消息持久化**
   - 数据库存储
   - 从数据库恢复历史
   - 分页加载

5. **用户认证集成**
   - 与现有 `authStore` 集成
   - 多用户消息隔离
   - 用户专属 Agent

## 文件修改清单

### 新建文件（6 个）
1. `src/shared/modules/agent/schemas.ts`
2. `src/shared/modules/agent/index.ts`
3. `src/client/stores/agentStore.ts`
4. `src/client/components/ChatMessageCard.tsx`
5. `src/client/components/ChatArea.tsx`
6. `src/client/pages/ChatPage.tsx`

### 修改文件（3 个）
1. `src/shared/modules/index.ts` - 添加 agent 模块导出
2. `src/client/components/index.ts` - 导出新组件
3. `src/client/App.tsx` - 添加聊天路由
4. `src/client/components/Navigation.tsx` - 添加聊天导航项

## 测试建议

### 单元测试
- [ ] `agentStore` 的状态管理测试
- [ ] `ChatMessageCard` 组件渲染测试
- [ ] `ChatArea` 组件交互测试

### 集成测试
- [ ] 完整的聊天流程测试
- [ ] 消息发送和接收测试
- [ ] SSE 连接测试（需要 mock）

### E2E 测试
- [ ] 用户进入聊天页面
- [ ] 发送消息并接收响应
- [ ] 清空聊天记录

## 下一步行动

如果需要继续开发，建议按以下顺序：

1. **阶段一：后端 API**
   - 创建 Agent 路由和服务
   - 实现消息存储
   - 添加认证中间件

2. **阶段二：SSE 集成**
   - 实现 SSE 服务端
   - 创建 SSE 客户端 hook
   - 处理流式事件

3. **阶段三：LLM 集成**
   - 集成 LLM API
   - 实现流式响应
   - 添加错误处理

4. **阶段四：优化和完善**
   - 添加测试
   - 性能优化
   - 用户体验改进
