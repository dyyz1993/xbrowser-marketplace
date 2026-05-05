# Agent 历史消息读取方案

## 目标
历史消息必须从 PI Session 文件读取，而不是数据库

## PI Session 文件位置
`~/.pi/agent/sessions/{userId}/xxx.jsonl`

## 实现步骤

### 1. 创建 session 历史读取函数
- 在 `llm-service.ts` 中添加 `loadSessionHistory()` 函数
- 读取 PI session 目录下的 `.jsonl` 文件
- 解析文件内容，返回消息列表

### 2. 修改 processChatMessage
- 移除 `agentService.getMessages()` 数据库查询
- 改用 `loadSessionHistory()` 从 PI 文件读取历史
- 传递历史给 `llm.chat()`

### 3. 前端获取消息
- 前端获取消息时调用新 API
- 新 API 从 PI session 文件读取并返回

## PI Session 文件格式
```jsonl
{"role":"user","content":"你好","timestamp":1234567890}
{"role":"assistant","content":"你好！有什么帮助？","timestamp":1234567891}
```
