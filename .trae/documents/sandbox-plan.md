# Agent 沙盒安全方案

## 问题背景
需要将 LLM 执行命令的能力限制在沙盒中，防止恶意代码破坏系统。

## 沙盒方案

### 方案 1: 自定义 BashOperations（推荐）
在 `createBashTool` 时传入自定义的 `BashOperations`，在其中执行沙盒逻辑。

```typescript
// 创建沙盒 bash operations
const sandboxedBashOperations: BashOperations = {
  async run(command, timeout) {
    // 用 vm2 或 isolated-vm 执行命令
    const vm = new VM({ timeout, sandbox: {} })
    return vm.run(command)
  }
}

// 创建工具
const sandboxedBashTool = createBashTool(sandboxedBashOperations)
```

### 方案 2: Extension 扩展
使用 PI SDK 的扩展机制，在工具执行前拦截并沙盒化。

### 方案 3: customTools 自定义工具
定义一个新的自定义工具，内部使用沙盒执行。

## 推荐方案

**方案 1** 最直接，修改 `llm-service.ts` 中的 `createAgentSession` 调用：

```typescript
const sandboxedBashOperations = createSandboxedBashOperations()

const { session } = await createAgentSession({
  model,
  thinkingLevel: 'medium',
  authStorage,
  modelRegistry,
  sessionManager,
  tools: [
    createBashTool(sandboxedBashOperations),
    createReadTool(/* ... */),
    createWriteTool(/* ... */),
    // ...
  ],
})
```

## 实现步骤

### 1. 创建沙盒操作模块
- `src/server/module-agent/services/sandbox-bash.ts`
- 使用 `vm2` 或 `isolated-vm`
- 配置超时、内存限制等

### 2. 修改 llm-service.ts
- 导入沙盒 bash operations
- 创建自定义 tools 数组
- 传递给 `createAgentSession`

### 3. 配置
- 沙盒超时时间
- 内存限制
- 允许/禁止的命令列表

## 文件位置
```
src/server/module-agent/
├── services/
│   ├── sandbox-bash.ts    # 新增: 沙盒 bash 操作
│   ├── llm-service.ts     # 修改: 使用沙盒工具
```

## 注意事项
- `vm2` 是同步的，可能需要异步包装
- 沙盒内的 `console.log` 需要特殊处理才能返回给 LLM
- 用户的工作空间路径作为沙盒根目录，限制文件访问
