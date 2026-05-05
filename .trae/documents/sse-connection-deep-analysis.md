# SSE 连接没有发起请求 - 深度分析

## 问题现象
刷新页面后，没有看到 SSE 连接请求（`/api/agents/{id}/chat/stream`）

## 深度推导

### 执行流程分析

1. **ChatPage 挂载**
   - `agent` = null
   - `isInitialized` = false

2. **第一个 useEffect 执行**
   ```tsx
   useEffect(() => {
     const init = async () => {
       if (!agent) {
         await fetchAgent()  // 发起请求获取 agent
       }
       setIsInitialized(true)
     }
     init()
   }, [agent, fetchAgent])
   ```

3. **fetchAgent 完成，agent 变成有值**

4. **组件重新渲染，useChatSSEConnection 重新执行**
   - `useSSE` 重新执行，传入新的 `agent` 作为 `deps`

5. **关键问题：useEffect 执行顺序**

   `useSSE` 内部有这个 useEffect：
   ```tsx
   useEffect(() => {
     depsRef.current = deps  // 更新 depsRef
   }, [deps])
   ```

   `ChatPage` 有这个 useEffect：
   ```tsx
   useEffect(() => {
     if (agent && isInitialized) {
       connectSSE()  // 调用 connect
     }
     return () => {
       disconnectSSE()
     }
   }, [agent, isInitialized, connectSSE, disconnectSSE])
   ```

### 根本原因

**React 的 useEffect 是异步执行的！**

当 `agent` 从 null 变成有值时：
1. 组件重新渲染
2. React 调度所有 useEffect 执行
3. **执行顺序不确定** - `ChatPage` 的 useEffect 可能在 `useSSE` 的 useEffect 之前执行

如果 `ChatPage` 的 useEffect 先执行：
- 调用 `connectSSE()`
- `connect` 内部使用 `depsRef.current`
- **但 `depsRef.current` 还是旧值（null）！**
- route 函数检查 `currentAgent?.id`，发现是 null，抛出错误
- 错误被 catch，`isConnectingRef.current = false`
- SSE 连接没有建立

### 验证方法

在浏览器控制台应该能看到：
```
Failed to connect SSE: Error: Agent not initialized
```

## 解决方案

### 方案 A：同步更新 depsRef（推荐）

在 `useSSE` 中，在渲染期间同步更新 `depsRef.current`：

```tsx
export function useSSE<T extends SSEProtocol, D = unknown>(
  route: (deps?: D) => Promise<SSEClient<T>>,
  deps?: D
): UseSSEReturn<T> {
  // 同步更新 - 在渲染期间执行，不依赖 useEffect
  const depsRef = useRef<D | undefined>(deps)
  depsRef.current = deps  // 关键：同步更新
  
  // ... 其他代码
}
```

**为什么这样是安全的？**
- ref 的更新不会触发重新渲染
- 在渲染期间更新 ref 是 React 允许的模式
- 确保 `connect` 被调用时，`depsRef.current` 已经是最新的值

### 方案 B：在 connect 中等待 deps 有效

```tsx
const connect = useCallback(async () => {
  // 等待 deps 有效
  if (!depsRef.current) {
    console.log('Waiting for deps...')
    return
  }
  // ...
}, [])
```

**缺点：** 需要手动重试，不够优雅

### 方案 C：改变架构，让 connect 接受参数

```tsx
const connect = useCallback(async (depsValue?: D) => {
  const effectiveDeps = depsValue ?? depsRef.current
  // ...
}, [])
```

**缺点：** 改变了 API 设计

## 推荐方案

**方案 A** - 同步更新 `depsRef.current`

修改文件：`src/shared/hooks/useSSE.ts`

```tsx
export function useSSE<T extends SSEProtocol, D = unknown>(
  route: (deps?: D) => Promise<SSEClient<T>>,
  deps?: D
): UseSSEReturn<T> {
  const [status, setStatus] = useState<SSEStatus>('closed')
  const [client, setClient] = useState<SSEClient<T> | null>(null)
  const clientRef = useRef<SSEClient<T> | null>(null)
  const isConnectingRef = useRef(false)
  const depsRef = useRef<D | undefined>(deps)
  const routeRef = useRef(route)

  // 关键修复：同步更新，不依赖 useEffect
  depsRef.current = deps
  routeRef.current = route

  // ... 其他代码保持不变
}
```

## 额外优化

移除不再需要的 useEffect：

```tsx
// 删除这两个 useEffect，改为同步更新
useEffect(() => {
  depsRef.current = deps
}, [deps])

useEffect(() => {
  routeRef.current = route
}, [route])
```
