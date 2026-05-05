# SSE 连接未发起请求 - 根本原因分析

## 问题现象
刷新页面后，没有看到 SSE 连接请求（`/api/agents/{id}/chat/stream`）

## 根本原因

**`SSEClientImpl` 的 `_status` 初始值错误！**

### 问题代码

**文件**: `src/shared/core/sse-client.ts`

```typescript
// 第 29 行 - 错误的初始值
private _status: 'connecting' | 'open' | 'closed' = 'connecting'

// 第 41-46 行 - connect 方法
connect() {
  if (this._status === 'connecting' || this._status === 'open') {
    return  // 因为 _status === 'connecting'，直接返回！
  }
  this._connect()  // 永远不会执行
}
```

### 问题链条

```
1. new SSEClientImpl(url, headers)
   ↓
   this._status = 'connecting'  (初始值)

2. connectSSEClient(client)
   ↓
   client.connect()

3. SSEClientImpl.connect()
   ↓
   if (this._status === 'connecting') return  ← 条件为 true！
   ↓
   直接返回，不调用 this._connect()

4. this._connect() 永远不会被调用
   ↓
   fetch() 请求永远不会发起
```

## 修复方案

### 修改 `_status` 初始值（推荐）

将 `_status` 的初始值从 `'connecting'` 改为 `'closed'`：

```typescript
// 修改前
private _status: 'connecting' | 'open' | 'closed' = 'connecting'

// 修改后
private _status: 'connecting' | 'open' | 'closed' = 'closed'
```

**语义解释**：
- `'closed'` = 未连接/已关闭
- `'connecting'` = 正在连接中
- `'open'` = 已连接

新创建的客户端应该处于 `'closed'` 状态，表示"未连接"，需要显式调用 `connect()` 才能开始连接。

## 修复文件

`src/shared/core/sse-client.ts` 第 29 行

## 验证步骤

修复后：
1. 刷新页面
2. 检查 Network 面板是否有 `/api/agents/{id}/chat/stream` 请求
3. 检查 SSE Status 是否显示为 `open`
