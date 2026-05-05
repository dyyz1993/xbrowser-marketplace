# 滚动加载更多 - 完整设计方案

## 问题分析

### 当前问题

1. **内容跳动**：新消息添加到顶部，导致已有内容向下推移，产生"闪一下"的效果
2. **滚动位置丢失**：加载后没有保持用户的视觉位置
3. **触发条件不合理**：使用百分比（50%）不够直观

### 根本原因

**加载流程**：
1. 用户滚动到顶部
2. 触发加载
3. 新消息添加到数组开头：`[...newRounds, ...oldRounds]`
4. React 重新渲染，新内容插入到顶部
5. ❌ 浏览器保持 scrollTop = 0，但内容已经变化
6. ❌ 用户看到"闪一下"的效果

**正确的做法**：
1. 记录加载前的滚动位置（距离顶部的高度）
2. 加载新消息
3. 计算新增内容的高度
4. 调整 scrollTop，保持用户的视觉位置不变

---

## 完整设计方案

### 1. 滚动触发策略

**触发条件**：距离顶部一定距离（如 100px）

```typescript
const LOAD_MORE_THRESHOLD = 100  // 距离顶部 100px 时触发

if (scrollTop <= LOAD_MORE_THRESHOLD && hasMoreRounds && !loadingMore) {
  loadMore()
}
```

**优点**：
- ✅ 直观：用户快滚到顶部时就预加载
- ✅ 体验好：加载完成后用户才到达顶部，感觉流畅
- ✅ 简单：不需要复杂的百分比计算

---

### 2. 保持滚动位置

**核心思路**：
1. 加载前记录 `scrollTop` 和 `scrollHeight`
2. 加载后计算新增内容的高度
3. 调整 `scrollTop`，补偿新增的高度

**实现**：

```typescript
const loadMoreTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
const prevScrollHeightRef = useRef<number>(0)
const isScrollRestoringRef = useRef(false)

const handleScroll = useCallback(() => {
  const container = containerRef.current
  if (!container || loadingMore) return

  const { scrollTop, scrollHeight } = container

  if (scrollTop <= LOAD_MORE_THRESHOLD && hasMoreRounds) {
    // 记录加载前的高度
    prevScrollHeightRef.current = scrollHeight
    
    if (loadMoreTimeoutRef.current) {
      clearTimeout(loadMoreTimeoutRef.current)
    }
    loadMoreTimeoutRef.current = setTimeout(() => {
      handleLoadMore()
    }, 300)
  }
}, [hasMoreRounds, loadingMore, handleLoadMore])

// 监听 rounds 变化，恢复滚动位置
useEffect(() => {
  const container = containerRef.current
  if (!container || isScrollRestoringRef.current) return

  const prevScrollHeight = prevScrollHeightRef.current
  const currentScrollHeight = container.scrollHeight

  if (currentScrollHeight > prevScrollHeight) {
    // 有新内容添加到顶部
    const heightDiff = currentScrollHeight - prevScrollHeight
    isScrollRestoringRef.current = true
    
    // 调整 scrollTop，保持视觉位置
    container.scrollTop = heightDiff
    
    // 重置标记
    setTimeout(() => {
      isScrollRestoringRef.current = false
    }, 50)
  }
}, [rounds])
```

---

### 3. 防抖和加载间隔

**防抖**：防止连续触发

```typescript
if (loadMoreTimeoutRef.current) {
  clearTimeout(loadMoreTimeoutRef.current)
}
loadMoreTimeoutRef.current = setTimeout(() => {
  handleLoadMore()
}, 300)
```

**最小加载间隔**：防止短时间内重复加载

```typescript
const lastLoadTimeRef = useRef(0)

const handleLoadMore = useCallback(async () => {
  const now = Date.now()
  if (now - lastLoadTimeRef.current < 1000) {
    return  // 1 秒内不重复加载
  }
  lastLoadTimeRef.current = now
  
  await loadMoreRounds()
}, [loadMoreRounds])
```

---

### 4. 自动滚动控制

**场景**：
- 用户发送消息：自动滚动到底部
- 用户查看历史：不自动滚动
- 用户接近底部：启用自动滚动

**实现**：

```typescript
const [autoScrollEnabled, setAutoScrollEnabled] = useState(true)

const handleScroll = useCallback(() => {
  const container = containerRef.current
  if (!container) return

  const { scrollTop, scrollHeight, clientHeight } = container
  const distanceFromBottom = scrollHeight - scrollTop - clientHeight

  // 距离底部 <= 100px 时启用自动滚动
  if (distanceFromBottom <= 100) {
    setAutoScrollEnabled(true)
  } else {
    setAutoScrollEnabled(false)
  }
}, [])

const scrollToBottom = useCallback(() => {
  if (autoScrollEnabled) {
    messagesEndRef.current?.scrollIntoView({ behavior: 'instant' })
  }
}, [autoScrollEnabled])
```

---

## 完整实现代码

```typescript
import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { MessageSquare, Loader2 } from 'lucide-react'
import { PendingMessages } from './PendingMessages'
import { DynamicButton, type ButtonState } from './DynamicButton'
import { RoundCard } from './RoundCard'
import { useAgentStore } from '../stores/agentStore'
import { EmptyState } from './EmptyState'

const LOAD_MORE_THRESHOLD = 100
const AUTO_SCROLL_THRESHOLD = 100
const LOAD_MORE_DEBOUNCE = 300
const MIN_LOAD_INTERVAL = 1000

export const ChatArea: React.FC = () => {
  const rounds = useAgentStore(state => state.rounds)
  const loading = useAgentStore(state => state.loading)
  const loadingMore = useAgentStore(state => state.loadingMore)
  const hasMoreRounds = useAgentStore(state => state.hasMoreRounds)
  const isRunning = useAgentStore(state => state.isRunning)
  const pendingMessages = useAgentStore(state => state.pendingMessages)
  const sendMessage = useAgentStore(state => state.sendMessage)
  const stopGeneration = useAgentStore(state => state.stopGeneration)
  const addPendingMessage = useAgentStore(state => state.addPendingMessage)
  const removePendingMessage = useAgentStore(state => state.removePendingMessage)
  const sendPendingMessages = useAgentStore(state => state.sendPendingMessages)
  const loadMoreRounds = useAgentStore(state => state.loadMoreRounds)

  const [input, setInput] = useState('')
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const loadMoreTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevScrollHeightRef = useRef<number>(0)
  const isScrollRestoringRef = useRef(false)
  const lastLoadTimeRef = useRef(0)

  // 加载更多
  const handleLoadMore = useCallback(async () => {
    const now = Date.now()
    if (now - lastLoadTimeRef.current < MIN_LOAD_INTERVAL) {
      return
    }
    lastLoadTimeRef.current = now

    if (!hasMoreRounds || loadingMore) return
    setAutoScrollEnabled(false)
    await loadMoreRounds()
  }, [hasMoreRounds, loadingMore, loadMoreRounds])

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    if (autoScrollEnabled) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'instant' })
    }
  }, [autoScrollEnabled])

  // 滚动事件处理
  const handleScroll = useCallback(() => {
    const container = containerRef.current
    if (!container || loadingMore) return

    const { scrollTop, scrollHeight, clientHeight } = container
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight

    // 自动滚动控制
    if (distanceFromBottom <= AUTO_SCROLL_THRESHOLD) {
      setAutoScrollEnabled(true)
    } else {
      setAutoScrollEnabled(false)
    }

    // 加载更多触发
    if (scrollTop <= LOAD_MORE_THRESHOLD && hasMoreRounds) {
      // 记录加载前的高度
      prevScrollHeightRef.current = scrollHeight
      
      if (loadMoreTimeoutRef.current) {
        clearTimeout(loadMoreTimeoutRef.current)
      }
      loadMoreTimeoutRef.current = setTimeout(() => {
        handleLoadMore()
      }, LOAD_MORE_DEBOUNCE)
    }
  }, [hasMoreRounds, loadingMore, handleLoadMore])

  // 监听 rounds 变化，恢复滚动位置
  useEffect(() => {
    const container = containerRef.current
    if (!container || isScrollRestoringRef.current) return

    const prevScrollHeight = prevScrollHeightRef.current
    const currentScrollHeight = container.scrollHeight

    if (currentScrollHeight > prevScrollHeight) {
      // 有新内容添加到顶部
      const heightDiff = currentScrollHeight - prevScrollHeight
      isScrollRestoringRef.current = true
      
      // 调整 scrollTop，保持视觉位置
      container.scrollTop = heightDiff
      
      // 重置标记
      setTimeout(() => {
        isScrollRestoringRef.current = false
      }, 50)
    }
  }, [rounds])

  // 新消息到达时滚动到底部
  useEffect(() => {
    scrollToBottom()
  }, [rounds, scrollToBottom])

  // 清理定时器
  useEffect(() => {
    return () => {
      if (loadMoreTimeoutRef.current) {
        clearTimeout(loadMoreTimeoutRef.current)
      }
    }
  }, [])

  // ... 其他逻辑保持不变
}
```

---

## 测试用例

### 测试 1：平滑加载更多历史

**步骤**：
1. 初始加载 5 个轮次
2. 向上滚动
3. 距离顶部 100px 时触发加载
4. 观察滚动位置是否保持

**预期**：
- ✅ 没有"闪一下"的效果
- ✅ 用户看到的内容保持在同一位置
- ✅ 加载过程平滑

### 测试 2：连续加载

**步骤**：
1. 快速连续向上滚动
2. 观察是否会连续触发加载

**预期**：
- ✅ 每 1 秒最多触发一次加载
- ✅ 不会连续触发多次
- ✅ 每次加载都平滑

### 测试 3：自动滚动

**步骤**：
1. 发送新消息
2. 观察是否自动滚动到底部

**预期**：
- ✅ 新消息自动显示在底部
- ✅ 如果用户在查看历史，不自动滚动

---

## 关键优化点

### 1. 滚动位置恢复

**核心**：在内容添加到顶部后，调整 `scrollTop` 补偿新增的高度

```typescript
const heightDiff = currentScrollHeight - prevScrollHeight
container.scrollTop = heightDiff
```

### 2. 防抖 + 最小间隔

**防抖**：滚动事件频繁触发，使用防抖避免重复计算

**最小间隔**：即使触发加载，也要保证至少间隔 1 秒

### 3. 自动滚动智能控制

**距离底部 <= 100px**：启用自动滚动

**距离底部 > 100px**：禁用自动滚动（用户在查看历史）

---

## 总结

### 核心改进

1. **滚动位置恢复**：加载后保持用户的视觉位置，不跳动
2. **触发条件优化**：使用固定距离（100px），更直观
3. **防抖 + 间隔**：防止连续触发，提升性能
4. **智能自动滚动**：根据用户行为自动判断

### 用户体验

- ✅ 平滑加载，没有"闪一下"
- ✅ 滚动流畅，不卡顿
- ✅ 自动滚动智能，不干扰用户
- ✅ 加载间隔合理，不过于频繁
