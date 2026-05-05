# `/api/agents` 调用2次问题分析

## 问题原因

### 1. React StrictMode（主要原因）
在 `src/client/main.tsx:11-13` 中使用了 `<React.StrictMode>`：
- React 18 的 StrictMode 在**开发环境**下会故意让组件挂载两次
- 这是 React 的预期行为，用于检测副作用问题
- **生产环境不会有这个问题**

### 2. useEffect 依赖问题
在 `src/client/pages/ChatPage.tsx:15-23` 中：
```tsx
useEffect(() => {
  const init = async () => {
    if (!agent) {
      await fetchAgent()
    }
    setIsInitialized(true)
  }
  init()
}, [agent, fetchAgent])
```

问题：
- StrictMode 第一次挂载：`agent` 是 `null`，发起请求
- StrictMode 卸载并重新挂载：`agent` 仍然是 `null`（第一次请求可能还没完成），又发起请求

## 是否正常？

**开发环境：正常** - 这是 React StrictMode 的预期行为
**生产环境：不正常** - 生产环境不会有双重渲染

## 解决方案（可选优化）

如果想避免开发环境的双重请求，可以：

### 方案 A：使用 ref 追踪请求状态
```tsx
const fetchingRef = useRef(false)

useEffect(() => {
  const init = async () => {
    if (!agent && !fetchingRef.current) {
      fetchingRef.current = true
      await fetchAgent()
    }
    setIsInitialized(true)
  }
  init()
}, [agent, fetchAgent])
```

### 方案 B：在 store 层面防重
在 `agentStore.ts` 的 `fetchAgent` 中检查是否已有 agent：
```tsx
fetchAgent: async () => {
  const currentAgent = get().agent
  if (currentAgent) return  // 已有 agent，不再请求
  
  set({ loading: true, error: null })
  // ... 原有逻辑
}
```

## 建议

**不需要修改** - 这是开发环境的正常行为，React StrictMode 的设计目的就是帮助发现副作用问题。生产环境不会有这个问题。

如果确实想优化，推荐**方案 B**，在 store 层面防重更加健壮。
