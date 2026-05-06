# xbrowser 插件生态业务流程设计

> 本文档描述 xbrowser 插件生态系统的完整业务流程，覆盖用户旅程、认证、发布、安装、文件存储、第三方集成等核心环节。作为后续实现的蓝图文档。

## 目录

1. [用户旅程全景](#1-用户旅程全景)
2. [CLI 注册与认证流程](#2-cli-注册与认证流程)
3. [插件发布完整流程](#3-插件发布完整流程)
4. [插件安装完整流程](#4-插件安装完整流程)
5. [文件存储方案](#5-文件存储方案)
6. [第三方集成评估](#6-第三方集成评估)
7. [需要补充的功能清单](#7-需要补充的功能清单)
8. [技术架构图](#8-技术架构图)
9. [数据流图](#9-数据流图)

---

## 1. 用户旅程全景

### 1.1 角色定义

| 角色           | 说明                     | 核心诉求                           |
| -------------- | ------------------------ | ---------------------------------- |
| **普通用户**   | 使用插件进行浏览器自动化 | 发现好用的插件，快速安装，稳定运行 |
| **插件开发者** | 开发并发布插件           | 便捷的开发流程，可靠的分发渠道     |
| **市场管理员** | 管理市场质量             | 高效审核，安全可控，数据洞察       |

### 1.2 普通用户旅程

```
发现市场
  ├── 通过网站浏览 https://xbrowser.dev/marketplace
  ├── 通过 CLI 搜索 xbrowser plugin search "关键词"
  └── 通过推荐/分类发现
      │
      ▼
安装 CLI
  ├── npm install -g xbrowser
  └── 验证安装 xbrowser --version
      │
      ▼
搜索插件
  ├── xbrowser plugin search baidu
  ├── 并行搜索 marketplace + npm
  └── 查看搜索结果（名称、描述、评分、下载量）
      │
      ▼
评估插件 ──────────────────────────────┐
  ├── 查看详情 xbrowser plugin info baidu  │
  ├── 查看 README、截图、版本历史           │
  ├── 查看评分和评价                       │
  └── 查看支持的站点列表                   │
      │                                   │
      ▼                                   │
安装插件                                   │
  ├── xbrowser plugin install baidu        │
  ├── 自动下载 + 解压到插件目录             │
  └── 验证插件可加载                        │
      │                                   │
      ▼                                   │
使用插件                                   │
  ├── xbrowser baidu scrape               │
  ├── xbrowser baidu search --query "关键词" │
  └── 查看命令帮助 xbrowser baidu --help   │
      │                                   │
      ▼                                   │
评价插件 ◄────────────────────────────────┘
  ├── xbrowser plugin review baidu --rating 5
  └── 评价后帮助其他用户决策
```

### 1.3 插件开发者旅程

```
环境准备
  ├── 安装 xbrowser CLI
  ├── 注册开发者账号
  │   ├── 方式 A: xbrowser plugin register（CLI 交互式）
  │   └── 方式 B: 网站注册 + xbrowser plugin login（API Key）
  └── 验证身份 xbrowser plugin whoami
      │
      ▼
创建插件
  ├── 手动创建目录结构
  │   ├── index.ts (插件入口)
  │   ├── package.json (含 xbrowser 元数据)
  │   └── README.md (文档)
  └── 或通过 AI Skill 引导创建
      │
      ▼
本地测试
  ├── xbrowser plugin install ./my-plugin
  ├── xbrowser plugin test ./my-plugin
  ├── 验证命令注册和执行
  └── 调试 handler 逻辑
      │
      ▼
发布插件
  ├── xbrowser plugin publish
  │   ├── 验证插件结构
  │   ├── 提取元数据
  │   ├── 创建 tarball
  │   ├── 上传到 marketplace
  │   └── 状态: pending (等待审核)
  │
  └── 或发布到 npm
      ├── npm publish
      └── marketplace 通过 npm 元数据自动同步
      │
      ▼
维护更新
  ├── 修改代码
  ├── 更新版本号 (package.json)
  ├── xbrowser plugin publish (自动检测已有 slug)
  └── 查看安装量、评分
```

### 1.4 市场管理员旅程

```
登录管理后台
  ├── 通过 web 访问 /admin
  └── super_admin 角色认证
      │
      ▼
审核插件
  ├── 查看待审核列表 GET /api/admin/plugins/pending
  ├── 查看插件详情和代码
  ├── 批准: PUT /api/admin/plugins/{slug}/approve
  ├── 拒绝: PUT /api/admin/plugins/{slug}/reject
  └── 批量操作: POST /api/admin/plugins/bulk-approve
      │
      ▼
管理分类
  ├── 创建分类: POST /api/admin/categories
  ├── 编辑分类: PUT /api/admin/categories/{id}
  └── 删除分类: DELETE /api/admin/categories/{id}
      │
      ▼
处理举报
  ├── 接收举报（未来功能）
  ├── 审查插件内容
  ├── 下架: DELETE /api/admin/plugins/{slug}
  └── 记录处理结果
      │
      ▼
数据统计
  ├── 查看仪表盘 GET /api/admin/stats/dashboard
  ├── 插件总数、下载量、用户数
  └── 趋势分析（未来功能）
```

---

## 2. CLI 注册与认证流程

### 2.1 当前实现状态

| 功能         | 状态      | 实现位置                              |
| ------------ | --------- | ------------------------------------- |
| Web 注册     | ✅ 已实现 | `POST /api/auth/register`             |
| Web 登录     | ✅ 已实现 | `POST /api/auth/login` → 返回 API Key |
| Token 验证   | ✅ 已实现 | `GET /api/auth/verify` (Bearer token) |
| CLI register | ❌ 未实现 | 需新增 CLI 命令                       |
| CLI login    | ❌ 未实现 | 需新增 CLI 命令                       |
| CLI whoami   | ❌ 未实现 | 需新增 CLI 命令                       |
| Token 存储   | ❌ 未实现 | 需实现 `~/.xbrowser/auth.json`        |

### 2.2 方案评估：CLI 注册

#### Option A: CLI 交互式注册

```bash
$ xbrowser plugin register
? Username: myname
? Email: my@email.com
? Password: ********
? Confirm password: ********
✓ Registered successfully!
✓ Your API token: xbr_abc123def456...
✓ Token saved to ~/.xbrowser/auth.json

You can now publish plugins with: xbrowser plugin publish
```

**优点**: 全程 CLI 完成，开发者体验好
**缺点**: CLI 中密码输入体验不如 Web；无法做 CAPTCHA；邮箱验证流程复杂

#### Option B: Web 注册 + CLI 登录

```bash
# 步骤 1: 在浏览器中注册
# 访问 https://xbrowser.dev/register
# 填写表单，验证邮箱

# 步骤 2: 获取 API Key
# 登录后进入开发者设置页面，复制 API Key

# 步骤 3: CLI 登录
$ xbrowser plugin login --token xbr_abc123def456...
✓ Logged in as myname
✓ Token saved to ~/.xbrowser/auth.json
```

**优点**: Web 注册可以做更丰富的验证（邮箱验证、CAPTCHA）
**缺点**: 需要切换浏览器，步骤较多

#### Option C: 混合模式 (推荐)

```bash
# 方式 A: CLI 直接注册（适合快速体验）
$ xbrowser plugin register
? Username: myname
? Email: my@email.com
? Password: ********
✓ Registered! API token saved.

# 方式 B: Web 注册 + CLI 登录（适合正式开发者）
$ xbrowser plugin login
? Email: my@email.com
? Password: ********
✓ Logged in as myname

# 方式 C: 直接使用 API Key（适合 CI/CD）
$ xbrowser plugin login --token xbr_abc123...
✓ Logged in as myname

# 通用操作
$ xbrowser plugin whoami
Username: myname
Email: my@email.com
Role: developer

$ xbrowser plugin logout
✓ Token removed from ~/.xbrowser/auth.json
```

**推荐理由**: 覆盖最多场景，开发者可以自由选择最适合自己的方式。

### 2.3 认证架构

#### 当前架构

```
开发者表 (developers)
├── id: UUID
├── username: unique
├── email: unique
├── passwordHash: bcrypt
├── role: 'developer' | 'super_admin'
└── apiKey: UUID (作为 Bearer token 使用)
```

- 登录时返回 `apiKey` 作为 token
- 认证中间件通过 `apiKey` 查询 `developers` 表验证身份
- Token 格式: `xbr_` 前缀 + UUID (当前实现为纯 UUID，建议添加前缀)

#### 认证方式对比

| 维度       | API Key (当前方案) | JWT                     |
| ---------- | ------------------ | ----------------------- |
| 实现复杂度 | 低 ✅              | 中（需要 refresh 机制） |
| 无状态     | 否（需查库）       | 是                      |
| 过期管理   | 无过期 ✅ 简单     | 需要刷新机制            |
| 撤销       | 直接删除 key ✅    | 需要 blacklist          |
| 多设备     | 天然支持           | 需要管理                |
| 安全性     | 依赖 HTTPS         | 依赖 HTTPS + 密钥管理   |
| 适合场景   | CLI/服务间         | 短期 Web session        |

**结论**: 当前 API Key 方案适合 CLI 场景，保持不变。Web 前端可考虑叠加 JWT 用于 session 管理。

#### Token 存储规范

```json
// ~/.xbrowser/auth.json
{
  "token": "xbr_abc123def456...",
  "registry": "https://marketplace.xbrowser.dev",
  "username": "myname",
  "savedAt": "2025-01-01T00:00:00.000Z"
}
```

**安全考虑**:

- 文件权限: `0600` (仅当前用户可读写)
- 不记录 email 和 password
- `savedAt` 用于判断 token 是否需要刷新

#### 认证流程图

```
CLI 命令
    │
    ├── xbrowser plugin register
    │   ├── 收集 username/email/password
    │   ├── POST /api/auth/register
    │   ├── 返回 profile (不含 token)
    │   ├── 自动 POST /api/auth/login
    │   ├── 获取 apiKey
    │   └── 保存到 ~/.xbrowser/auth.json
    │
    ├── xbrowser plugin login
    │   ├── 交互式: 收集 email/password
    │   ├── POST /api/auth/login → 获取 apiKey
    │   └── 保存到 ~/.xbrowser/auth.json
    │
    ├── xbrowser plugin login --token <token>
    │   ├── GET /api/auth/verify (验证 token)
    │   └── 保存到 ~/.xbrowser/auth.json
    │
    ├── xbrowser plugin whoami
    │   ├── 读取 ~/.xbrowser/auth.json
    │   ├── GET /api/auth/verify
    │   └── 显示用户信息
    │
    └── xbrowser plugin logout
        └── 删除 ~/.xbrowser/auth.json
```

### 2.4 API Key 格式优化

当前 `apiKey` 是纯 UUID。建议改为带前缀的格式，便于识别和调试:

```
xbr_<随机字符串>
```

- 前缀 `xbr_` 标识这是 xbrowser token
- 长度 32 字符 (前缀 + 28 随机字符)
- 示例: `xbr_a1b2c3d4e5f6g7h8i9j0k1l2m3n4`

---

## 3. 插件发布完整流程

### 3.1 当前实现状态

| 步骤           | 状态 | 说明                                             |
| -------------- | ---- | ------------------------------------------------ |
| 接收 tarball   | ✅   | `POST /api/plugins/publish` 接收 multipart files |
| 解析 metadata  | ✅   | 从 form-data 中解析 JSON metadata                |
| 写入 D1 元数据 | ✅   | plugins + pluginVersions 表                      |
| 文件持久化     | ❌   | files 被解析但未保存，`packageUrl` 是占位符      |
| 文件下载       | ❌   | tarball 端点返回占位 URL                         |
| CLI publish    | ❌   | CLI 侧尚未实现 tarball 打包上传                  |

### 3.2 发布前准备

#### 插件目录结构

```
my-plugin/
├── index.ts              # 插件入口 (必须)
├── package.json          # 包配置 (必须)
├── README.md             # 文档 (推荐)
├── CHANGELOG.md          # 变更日志 (推荐)
└── screenshots/          # 截图 (可选)
    └── demo.png
```

#### package.json 规范

```json
{
  "name": "xbrowser-plugin-baidu",
  "version": "1.0.0",
  "description": "百度搜索自动化插件",
  "main": "index.ts",
  "author": "developer",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/user/xbrowser-plugin-baidu"
  },
  "xbrowser": {
    "slug": "baidu",
    "commands": ["search", "scrape"],
    "tags": ["search", "chinese", "automation"],
    "sites": ["baidu.com"],
    "category": "search"
  }
}
```

#### index.ts 入口规范

```typescript
import type { XCLIAPI } from 'xbrowser'

export default function (xcli: XCLIAPI): void {
  const site = xcli.createSite({
    name: 'baidu',
    url: 'https://www.baidu.com',
  })

  site.command('search', {
    description: 'Search Baidu',
    handler: async (params, ctx) => {
      return { data: [], tips: [] }
    },
  })
}
```

### 3.3 发布流程 (完整)

```
开发者执行: xbrowser plugin publish
    │
    ▼
┌─────────────────────────────┐
│ Step 1: 验证插件结构          │
│                               │
│ ✓ index.ts 存在且有默认导出    │
│ ✓ package.json 存在且合法     │
│ ✓ xbrowser 元数据完整         │
│   - slug: kebab-case          │
│   - version: semver           │
│   - description: 非空          │
│ ✗ node_modules/ 存在 → 排除   │
│ ✗ .git/ 存在 → 排除           │
│                               │
│ 文件限制:                     │
│   - 最大包体积: 5MB           │
│   - 单文件上限: 1MB           │
│   - 文件数量上限: 100         │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Step 2: 提取并补全元数据       │
│                               │
│ 从 package.json 提取:         │
│   name, version, description │
│   xbrowser.slug              │
│   xbrowser.commands          │
│   xbrowser.tags              │
│   xbrowser.sites             │
│                               │
│ 从代码分析提取 (可选):         │
│   site.command 调用 → commands│
│   createSite url → sites     │
│                               │
│ 交互式补全 (缺失时):           │
│   ? Description: ...          │
│   ? Tags: ...                 │
│   ? Category: ...             │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Step 3: 版本检查              │
│                               │
│ GET /api/plugins/{slug}       │
│                               │
│ 新插件:                       │
│   ✓ slug 不存在 → 创建       │
│                               │
│ 已有插件 (更新):              │
│   ✓ 当前用户是作者            │
│   ✓ 新版本 > 当前版本         │
│   ✗ 版本已存在 → 报错         │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Step 4: 创建 tarball         │
│                               │
│ 读取排除规则:                 │
│   node_modules/**            │
│   .git/**                    │
│   *.log                      │
│   .DS_Store                  │
│   dist/**                    │
│   tests/**                   │
│                               │
│ 打包:                         │
│   tar czf plugin.tar.gz      │
│   计算 SHA-256 checksum      │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Step 5: 上传到 Marketplace    │
│                               │
│ POST /api/plugins/publish    │
│ Content-Type: multipart/     │
│   form-data                  │
│                               │
│ Fields:                       │
│   metadata: JSON 文件         │
│   files: tarball 文件         │
│   checksum: SHA-256 字符串   │
│                               │
│ Headers:                      │
│   Authorization: Bearer <key> │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Step 6: 服务端处理            │
│                               │
│ a) 解析 metadata + files     │
│ b) 写入 plugins 表            │
│    - status: 'pending'       │
│ c) 写入 pluginVersions 表     │
│    - packageUrl: R2 URL      │ ← 需要实现
│ d) 上传 files 到 R2          │ ← 需要实现
│ e) 返回插件详情               │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Step 7: 审核                  │
│                               │
│ pending → 管理员审核          │
│   ├── approve → approved     │
│   │   → 插件上架，可搜索     │
│   └── reject → rejected      │
│       → 通知开发者修改        │
│                               │
│ 可信开发者 (未来):            │
│   自动批准，跳过审核          │
└─────────────────────────────┘
```

### 3.4 版本更新流程

```
开发者执行: xbrowser plugin publish
    │
    ▼
  CLI 检测到 slug 已存在
    │
    ▼
  版本检查
    ├── --bump patch   → 1.0.0 → 1.0.1
    ├── --bump minor   → 1.0.0 → 1.1.0
    ├── --bump major   → 1.0.0 → 2.0.0
    └── 手动指定        → package.json 中已更新
    │
    ▼
  Prompt: Changelog?
    ├── --changelog "修复了搜索 bug"
    └── 交互输入
    │
    ▼
  上传 (同发布流程 Step 4-6)
    │
    ▼
  审核策略 (未来)
    ├── 新开发者: 必须审核
    ├── 可信开发者: 自动批准
    └── Patch 版本: 自动批准 (可选)
```

### 3.5 CLI publish 命令设计

```bash
# 基本发布
xbrowser plugin publish

# 指定目录
xbrowser plugin publish ./my-plugin

# 试运行 (只验证，不上传)
xbrowser plugin publish --dry-run

# 自动 bump 版本
xbrowser plugin publish --bump patch

# 指定 changelog
xbrowser plugin publish --changelog "修复搜索功能"

# 指定 registry
xbrowser plugin publish --registry https://marketplace.xbrowser.dev
```

---

## 4. 插件安装完整流程

### 4.1 当前实现状态

| 安装方式             | 状态 | 说明                                      |
| -------------------- | ---- | ----------------------------------------- |
| Marketplace 搜索     | ✅   | `GET /api/plugins/search` 已实现          |
| Marketplace 元数据   | ✅   | `GET /api/plugins/{slug}` 已实现          |
| Marketplace 安装追踪 | ✅   | `POST /api/plugins/{slug}/install` 已实现 |
| Marketplace 文件下载 | ❌   | tarball 端点返回占位 URL，无实际下载      |
| npm 搜索             | ❌   | 需实现 npm registry API 调用              |
| npm 安装             | ❌   | 需实现 npm pack/download                  |
| Git 安装             | ❌   | 需实现 git clone                          |
| 本地安装             | ❌   | 需实现目录复制                            |
| CLI install 命令     | ❌   | CLI 侧未实现                              |

### 4.2 安装源优先级

```
xbrowser plugin install baidu
    │
    ▼
  检测安装源 (自动判断)
    │
    ├── slug 格式 (kebab-case, 无 /) → 先查 marketplace，再查 npm
    │
    ├── npm 包名 (含 @scope 或 xbrowser-plugin-) → 从 npm 安装
    │
    ├── URL (https://github.com/...) → 从 Git 安装
    │
    ├── 本地路径 (./ 或 ../) → 从本地安装
    │
    └── --from-marketplace / --from-npm → 强制指定源
```

### 4.3 从 Marketplace 安装 (需实现)

```
xbrowser plugin install baidu --from-marketplace
    │
    ▼
┌──────────────────────────────────────┐
│ Step 1: 获取插件元数据                │
│                                        │
│ GET /api/plugins/baidu                 │
│                                        │
│ 返回:                                  │
│   - name, version, description        │
│   - commands (展示给用户)              │
│   - status: 'approved'                │
│   - packageUrl → 下载地址             │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ Step 2: 下载插件文件                  │
│                                        │
│ GET /api/plugins/baidu/tarball         │
│                                        │
│ 当前: 返回占位 URL                     │
│ 需要实现:                              │
│   a) 从 R2 获取文件流                  │
│   b) 返回 redirect 到 R2 presigned URL│
│   c) 或直接返回文件内容               │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ Step 3: 解压到插件目录                │
│                                        │
│ 目标: ~/.xbrowser/plugins/baidu/       │
│                                        │
│ tar xzf tarball -C ~/.xbrowser/        │
│   plugins/baidu/                       │
│                                        │
│ 验证:                                  │
│   ✓ index.ts 存在                      │
│   ✓ package.json 存在                  │
│   ✓ checksum 匹配 (SHA-256)           │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ Step 4: 追踪安装                      │
│                                        │
│ POST /api/plugins/baidu/install        │
│ → downloadCount + 1                    │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ Step 5: 验证插件可加载                │
│                                        │
│ 尝试 require/import index.ts           │
│ 验证默认导出是函数                     │
│ 列出注册的 commands                    │
│                                        │
│ ✓ Plugin baidu@1.0.0 installed!        │
│   Commands: search, scrape             │
└──────────────────────────────────────┘
```

### 4.4 从 npm 安装 (需实现)

```
xbrowser plugin install xbrowser-plugin-baidu
    │
    ▼
┌──────────────────────────────────────┐
│ Step 1: 查询 npm registry             │
│                                        │
│ GET https://registry.npmjs.org/        │
│   xbrowser-plugin-baidu               │
│                                        │
│ 返回:                                  │
│   - name, version, description        │
│   - dist.tarball (下载 URL)           │
│   - xbrowser 字段 (如果存在)          │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ Step 2: 下载 tarball                  │
│                                        │
│ GET dist.tarball URL                   │
│   → 下载 .tgz 文件到临时目录          │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ Step 3: 解压并验证                    │
│                                        │
│ tar xzf package.tgz                    │
│   → 解压到临时目录 (内含 package/ 目录)│
│                                        │
│ 验证 xbrowser 元数据:                 │
│   ✓ package.json 包含 xbrowser 字段   │
│   ✓ index.ts 存在                      │
│   ✓ 默认导出是函数                     │
│                                        │
│ ✗ 缺少 xbrowser 元数据 → 报错         │
│   "Not a valid xbrowser plugin"        │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ Step 4: 安装到插件目录                │
│                                        │
│ 复制到 ~/.xbrowser/plugins/            │
│   {slug}/                              │
│                                        │
│ slug 来源:                             │
│   xbrowser.slug >                     │
│   package.json name (去前缀) >        │
│   目录名                               │
└──────────────────────────────────────┘
```

### 4.5 从 Git 安装 (需实现)

```
xbrowser plugin install https://github.com/user/xbrowser-plugin-baidu
    │
    ▼
┌──────────────────────────────────────┐
│ Step 1: 克隆仓库                      │
│                                        │
│ git clone --depth 1 <url> /tmp/xb-xxx │
│                                        │
│ 支持:                                  │
│   - GitHub: https://github.com/...     │
│   - GitLab: https://gitlab.com/...     │
│   - Gitee: https://gitee.com/...      │
│   - 任意 git URL                       │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ Step 2: 验证插件结构                  │
│                                        │
│ 同 npm 安装验证流程                    │
│ ✓ index.ts + package.json              │
│ ✓ xbrowser 元数据                      │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ Step 3: 安装到插件目录                │
│                                        │
│ cp -r /tmp/xb-xxx/                     │
│   ~/.xbrowser/plugins/{slug}/          │
│                                        │
│ 清理临时目录                           │
└──────────────────────────────────────┘
```

### 4.6 从本地安装 (需实现)

```
xbrowser plugin install ./my-plugin
    │
    ▼
┌──────────────────────────────────────┐
│ Step 1: 验证本地路径                  │
│                                        │
│ ✓ 路径存在                             │
│ ✓ index.ts 存在                        │
│ ✓ package.json 存在                    │
│ ✓ xbrowser 元数据完整                  │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ Step 2: 复制到插件目录                │
│                                        │
│ cp -r ./my-plugin/                     │
│   ~/.xbrowser/plugins/{slug}/          │
│                                        │
│ 排除: node_modules, .git, dist        │
└──────────────────────────────────────┘
```

### 4.7 插件目录布局

```
~/.xbrowser/
├── auth.json                    # 认证 token
├── plugins/                     # 已安装插件
│   ├── baidu/
│   │   ├── index.ts
│   │   └── package.json
│   ├── taobao/
│   │   ├── index.ts
│   │   └── package.json
│   └── ...
└── plugin-registry.json         # 安装记录 (未来)
    {
      "baidu": {
        "source": "marketplace",
        "version": "1.0.0",
        "installedAt": "2025-01-01T00:00:00Z"
      },
      "taobao": {
        "source": "npm",
        "package": "xbrowser-plugin-taobao",
        "version": "2.1.0",
        "installedAt": "2025-01-02T00:00:00Z"
      }
    }
```

### 4.8 CLI install 命令设计

```bash
# 基本安装 (自动检测来源)
xbrowser plugin install baidu

# 强制从 marketplace 安装
xbrowser plugin install baidu --from-marketplace

# 从 npm 安装
xbrowser plugin install xbrowser-plugin-baidu

# 从 Git 安装
xbrowser plugin install https://github.com/user/plugin

# 从本地安装
xbrowser plugin install ./my-plugin

# 安装指定版本
xbrowser plugin install baidu@1.2.0

# 卸载
xbrowser plugin uninstall baidu

# 更新
xbrowser plugin update baidu
xbrowser plugin update --all

# 列出已安装
xbrowser plugin list
```

---

## 5. 文件存储方案

### 5.1 问题分析

当前 `publish-service.ts` 中的核心问题:

```typescript
// publish-service.ts:82 — 文件被接收但未持久化
packageUrl: `tarball://${data.slug}/${data.version}`,  // ← 占位符

// publish-service.ts:72-84 — files 被解析但只用 totalSize/checksum
files.totalSize,    // ← 写入 DB
files.checksum,     // ← 写入 DB
// files.files 本身被丢弃
```

**文件数据流断裂**: CLI 上传 → 服务端接收 → 丢弃文件 → DB 记录占位 URL

### 5.2 方案对比

| 方案               | 优点                                       | 缺点                                  | 成本      | 复杂度 |
| ------------------ | ------------------------------------------ | ------------------------------------- | --------- | ------ |
| **Cloudflare R2**  | 边缘存储，低延迟，S3 兼容，与 Workers 集成 | 需配置 bucket                         | 免费 10GB | 中     |
| **npm registry**   | 现成基础设施，版本管理，社区熟悉           | 需开发者同时发 npm                    | 免费      | 低     |
| **GitHub Release** | 免费，版本管理好                           | 依赖 GitHub，不支持非 GitHub 项目     | 免费      | 中     |
| **D1 BLOB**        | 与现有 D1 集成                             | D1 不原生支持 BLOB，base64 存储效率低 | D1 存储   | 高     |
| **本地磁盘**       | 最简单                                     | 不适合 Cloudflare Workers 部署        | 免费      | 低     |

### 5.3 推荐方案: 混合模式

```
                    ┌─────────────────────────────┐
                    │     插件发布入口              │
                    │  POST /api/plugins/publish   │
                    └──────────┬──────────────────┘
                               │
                    ┌──────────▼──────────────────┐
                    │     检查发布来源              │
                    └───┬───────────────────┬─────┘
                        │                   │
            ┌───────────▼───────┐  ┌────────▼──────────┐
            │ 来源: npm         │  │ 来源: 直接上传     │
            │                   │  │                    │
            │ 不存储文件        │  │ 上传到 R2          │
            │ 只记录 npm 包名   │  │ 记录 R2 URL        │
            │                   │  │                    │
            │ 安装时:           │  │ 安装时:            │
            │ npm pack 下载     │  │ 从 R2 下载         │
            └───────────────────┘  └────────────────────┘
```

#### 主方案: npm 同步

- 开发者将插件发布到 npm (`npm publish`)
- marketplace 记录 `npmPackage` 字段 (已有)
- 安装时通过 npm registry 下载 tarball
- **优势**: 不需要自建存储，利用 npm 的 CDN 和版本管理

#### 备选方案: R2 直传

- 开发者通过 CLI 直接上传到 marketplace
- 服务端将文件存入 Cloudflare R2
- 安装时从 R2 下载
- **优势**: 不需要开发者发 npm，降低门槛

### 5.4 R2 存储实现方案

#### wrangler.toml 配置

```toml
[[r2_buckets]]
binding = "PLUGINS_BUCKET"
bucket_name = "xbrowser-plugins"
```

#### 存储路径规范

```
plugins/
  {slug}/
    {version}/
      package.tar.gz     # 插件 tarball
      metadata.json      # 元数据快照
```

#### 服务端代码改造点

```typescript
// publish-service.ts 改造
export async function publishPlugin(
  data: PublishData,
  files: PublishFiles,
  authorId: string,
  authorName: string,
  bucket?: R2Bucket // 新增: R2 bucket binding
) {
  // ... 现有逻辑 ...

  const r2Key = `plugins/${data.slug}/${data.version}/package.tar.gz`

  if (bucket && files.files.length > 0) {
    // 将文件打包上传到 R2
    const tarball = createTarball(files.files)
    await bucket.put(r2Key, tarball)
  }

  // packageUrl 改为实际 R2 URL
  await db.insert(pluginVersions).values({
    // ...
    packageUrl: bucket ? `r2://${r2Key}` : `npm://${data.npmPackage}`,
    // ...
  })
}
```

#### 下载端点改造

```typescript
// GET /api/plugins/{slug}/tarball
.openapi(downloadTarballRoute, async (c) => {
  const { slug } = c.req.valid('param');
  const db = await getDb();

  // 获取最新版本信息
  const plugin = await getPlugin(slug);
  const version = await getLatestVersion(plugin.id);

  if (version.npmPackage) {
    // npm 来源: 重定向到 npm tarball URL
    const npmInfo = await fetchNpmPackage(version.npmPackage);
    return c.redirect(npmInfo.dist.tarball);
  }

  // R2 来源: 从 R2 获取或生成 presigned URL
  const bucket = c.env.PLUGINS_BUCKET;
  const r2Object = await bucket.get(`plugins/${slug}/${version.version}/package.tar.gz`);

  if (!r2Object) {
    return c.json({ error: 'Tarball not found' }, 404);
  }

  return new Response(r2Object.body, {
    headers: {
      'Content-Type': 'application/gzip',
      'Content-Disposition': `attachment; filename="${slug}-${version.version}.tar.gz"`,
    },
  });
});
```

### 5.5 存储成本估算

| 场景               | 单个插件 | 1000 个插件 | R2 免费额度 |
| ------------------ | -------- | ----------- | ----------- |
| 平均大小           | 50KB     | 50MB        | 10GB ✅     |
| Class A 操作 (PUT) | 2 次     | 2000 次     | 1M/月 ✅    |
| Class B 操作 (GET) | 10 次    | 10000 次    | 10M/月 ✅   |

**结论**: R2 免费额度完全够用，初期无需担心成本。

---

## 6. 第三方集成评估

### 6.1 npm Registry 集成

#### API 能力

| API          | 端点                                        | 用途                        | 实现状态  |
| ------------ | ------------------------------------------- | --------------------------- | --------- |
| 搜索         | `GET registry.npmjs.org/-/v1/search?text=`  | 搜索 npm 上的 xbrowser 插件 | ❌ 需实现 |
| 包信息       | `GET registry.npmjs.org/{package}`          | 获取版本、tarball URL       | ❌ 需实现 |
| 下载 tarball | `GET {dist.tarball}`                        | 下载插件代码                | ❌ 需实现 |
| 包版本列表   | `GET registry.npmjs.org/{package}/versions` | 版本选择                    | ❌ 需实现 |

#### 搜索策略

```
xbrowser plugin search "关键词"
    │
    ├── 并行搜索
    │   ├── Marketplace: GET /api/plugins/search?q=关键词
    │   └── npm: GET registry.npmjs.org/-/v1/search
    │           ?text=关键词+xbrowser-plugin
    │
    └── 合并结果
        ├── 去重 (通过 npmPackage 字段关联)
        ├── 排序 (marketplace 优先，按评分/下载量)
        └── 统一格式展示
```

#### npm 插件识别规范

在 npm 上，xbrowser 插件通过以下方式标识:

1. `package.json` 中包含 `xbrowser` 字段
2. 可选: 包名以 `xbrowser-plugin-` 为前缀
3. 可选: keywords 中包含 `xbrowser`

#### 集成实现方案

```typescript
// src/server/services/npm-registry-service.ts (新增)

const NPM_REGISTRY = 'https://registry.npmjs.org'

export async function searchNpmPlugins(query: string) {
  const url = `${NPM_REGISTRY}/-/v1/search?text=${encodeURIComponent(query + ' xbrowser-plugin')}`
  const res = await fetch(url)
  const data = await res.json()

  return data.objects
    .filter((obj: any) => obj.package.keywords?.includes('xbrowser'))
    .map(formatNpmResult)
}

export async function getNpmPackageInfo(packageName: string) {
  const url = `${NPM_REGISTRY}/${encodeURIComponent(packageName)}`
  const res = await fetch(url)
  return res.json()
}

export async function getNpmTarballUrl(packageName: string, version: string) {
  const info = await getNpmPackageInfo(packageName)
  return info.versions[version]?.dist?.tarball
}
```

### 6.2 GitHub 集成

| 能力        | API                                            | 用途             | 优先级 |
| ----------- | ---------------------------------------------- | ---------------- | ------ |
| 仓库信息    | `api.github.com/repos/{owner}/{repo}`          | 显示仓库元数据   | P1     |
| README      | `api.github.com/repos/{owner}/{repo}/readme`   | 获取 README 内容 | P2     |
| Releases    | `api.github.com/repos/{owner}/{repo}/releases` | 版本管理         | P2     |
| Stars/Forks | 仓库信息中包含                                 | 质量指标         | P2     |

### 6.3 AI Skill 集成

当前已有的 AI Skill 文件: `public/skills/plugin-dev.md`

```
AI Coding Agent (Claude/Opencode)
    │
    ├── 加载 plugin-dev Skill
    │   ├── 了解插件结构和规范
    │   ├── 获取命令定义模板
    │   └── 学习最佳实践
    │
    ├── 引导开发
    │   ├── 创建插件目录结构
    │   ├── 生成 index.ts 骨架
    │   ├── 生成 package.json 元数据
    │   └── 实现 handler 逻辑
    │
    └── 配合 CLI
        ├── xbrowser plugin test (验证)
        └── xbrowser plugin publish (发布)
```

---

## 7. 需要补充的功能清单

### P0: 核心缺失 (必须实现)

#### 7.1 文件存储

```
当前: files 被接收后丢弃
目标: 持久化到 R2 (或通过 npm 同步)

改动:
  - wrangler.toml: 添加 R2 bucket 配置
  - bindings.ts: 添加 PLUGINS_BUCKET 类型
  - publish-service.ts: 上传 files 到 R2
  - publish-routes.ts: 传递 bucket binding
  - packageUrl: 占位符 → 实际 R2/npm URL
```

#### 7.2 从 Marketplace 安装

```
当前: 只追踪下载计数，不实际下载
目标: CLI 下载并安装插件文件

改动:
  - publish-routes.ts: tarball 端点返回实际文件
  - CLI 新增: install 命令
  - CLI 新增: 下载 + 解压 + 验证逻辑
  - CLI 新增: ~/.xbrowser/plugins/ 目录管理
```

#### 7.3 从 npm 安装

```
当前: 未实现
目标: 通过 npm registry 下载并安装

改动:
  - CLI 新增: npm registry API 调用
  - CLI 新增: npm tarball 下载
  - CLI 新增: xbrowser 元数据验证
```

#### 7.4 从 Git 安装

```
当前: 未实现
目标: 通过 git clone 安装

改动:
  - CLI 新增: git clone + 验证
```

#### 7.5 CLI register 命令

```
当前: 只能通过 Web 注册
目标: CLI 交互式注册

改动:
  - CLI 新增: register 命令 (inquirer/prompts)
  - 调用 POST /api/auth/register
  - 调用 POST /api/auth/login
  - 保存 token 到 ~/.xbrowser/auth.json
```

#### 7.6 CLI login/logout/whoami

```
当前: 未实现
目标: CLI 认证管理

改动:
  - CLI 新增: login 命令 (交互式 / --token)
  - CLI 新增: logout 命令
  - CLI 新增: whoami 命令
  - CLI 新增: auth.json 读写工具
```

### P1: 重要增强

#### 7.7 版本管理

```
改动:
  - CLI: --bump patch/minor/major 选项
  - CLI: --changelog 选项
  - publish-service.ts: semver 版本校验
```

#### 7.8 插件验证

```
改动:
  - CLI: 安装后验证 index.ts 可加载
  - CLI: 验证默认导出是函数
  - CLI: 列出注册的 commands
```

#### 7.9 搜索优化

```
改动:
  - plugin-service.ts: 更好的排序算法
  - 考虑: 评分加权 (下载量 + 评分 + 最近更新)
  - 考虑: 全文搜索优化 (SQLite FTS5)
```

#### 7.10 开发者 Dashboard

```
改动:
  - 前端: 新增 /dashboard 页面
  - API: GET /api/auth/plugins (我发布的插件)
  - 显示: 下载量趋势、评分、版本历史
```

### P2: 体验增强

#### 7.11 插件依赖

```
改动:
  - package.json: xbrowser.dependencies 字段
  - CLI: 安装时自动安装依赖插件
  - 循环依赖检测
```

#### 7.12 插件配置

```
改动:
  - 定义插件配置 schema
  - 安装后引导用户配置
  - 配置存储在 ~/.xbrowser/plugins/{slug}/config.json
```

#### 7.13 自动更新

```
改动:
  - CLI: xbrowser plugin update --check
  - 启动时检查新版本
  - 通知用户更新
```

#### 7.14 插件统计

```
改动:
  - 新增: plugin_stats 表 (每日下载量)
  - API: GET /api/plugins/{slug}/stats
  - 前端: 下载趋势图表
```

#### 7.15 举报/审核

```
改动:
  - 新增: plugin_reports 表
  - API: POST /api/plugins/{slug}/report
  - Admin: 举报管理界面
```

### 7.16 功能实现路线图

```
Phase 1 (MVP - 2 周)
├── CLI register/login/logout/whoami
├── CLI publish (tarball 打包 + 上传)
├── R2 文件存储
├── tarball 下载端点
└── CLI install (从 marketplace)

Phase 2 (增强 - 2 周)
├── CLI install (从 npm)
├── CLI install (从 git)
├── CLI install (从本地)
├── 并行搜索 (marketplace + npm)
└── 插件验证

Phase 3 (完善 - 2 周)
├── 开发者 Dashboard
├── 版本管理 (bump + changelog)
├── 搜索优化
└── 插件统计

Phase 4 (增强 - 按需)
├── 自动更新
├── 插件依赖
├── 插件配置
└── 举报/审核
```

---

## 8. 技术架构图

### 8.1 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                          用户层                                  │
│                                                                  │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐        │
│  │   普通用户    │   │  插件开发者   │   │  市场管理员   │        │
│  │              │   │              │   │              │        │
│  │ xbrowser CLI│   │ xbrowser CLI │   │  Web Admin   │        │
│  │ Web Browser │   │ AI Agent     │   │              │        │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘        │
│         │                  │                   │                 │
└─────────┼──────────────────┼───────────────────┼────────────────┘
          │                  │                   │
          │  HTTP/HTTPS      │  HTTP/HTTPS       │  HTTP/HTTPS
          │                  │                   │
┌─────────▼──────────────────▼───────────────────▼────────────────┐
│                      接入层 (Cloudflare)                         │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                  Cloudflare Workers                          ││
│  │                                                             ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        ││
│  │  │  Hono API    │  │ Static      │  │ WebSocket/  │        ││
│  │  │  Server      │  │ Assets      │  │ SSE         │        ││
│  │  │              │  │ (React SPA) │  │             │        ││
│  │  └──────┬───────┘  └─────────────┘  └─────────────┘        ││
│  └─────────┼───────────────────────────────────────────────────┘│
└────────────┼─────────────────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────────────────┐
│                       服务层                                      │
│                                                                   │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐    │
│  │   Auth     │ │  Plugin    │ │  Publish   │ │   Admin    │    │
│  │  Module    │ │  Module    │ │  Module    │ │  Module    │    │
│  │            │ │            │ │            │ │            │    │
│  │ register   │ │ CRUD       │ │ tarball    │ │ approve    │    │
│  │ login      │ │ search     │ │ validate   │ │ reject     │    │
│  │ verify     │ │ install    │ │ upload     │ │ manage     │    │
│  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └─────┬──────┘    │
│        │              │              │              │            │
│        └──────────────┴──────┬───────┴──────────────┘            │
│                              │                                    │
└──────────────────────────────┼────────────────────────────────────┘
                               │
┌──────────────────────────────▼────────────────────────────────────┐
│                       数据层                                      │
│                                                                    │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│  │  Cloudflare D1    │  │  Cloudflare R2    │  │ npm Registry   │  │
│  │                   │  │                   │  │                │  │
│  │  developers       │  │  plugins/         │  │ 包信息查询     │  │
│  │  plugins          │  │    {slug}/        │  │ tarball 下载   │  │
│  │  plugin_versions  │  │      {version}/   │  │ 搜索           │  │
│  │  plugin_reviews   │  │        package.gz │  │                │  │
│  │  plugin_categories│  │                   │  │                │  │
│  │  plugin_category_ │  │                   │  │                │  │
│  │    mappings       │  │                   │  │                │  │
│  └──────────────────┘  └──────────────────┘  └────────────────┘  │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### 8.2 CLI 架构

```
xbrowser CLI
│
├── plugin (命令组)
│   ├── register      → POST /api/auth/register
│   ├── login         → POST /api/auth/login
│   ├── logout        → 本地: 删除 auth.json
│   ├── whoami        → GET /api/auth/verify
│   │
│   ├── search <q>    → GET /api/plugins/search?q=
│   │                 → GET registry.npmjs.org/-/v1/search
│   │
│   ├── info <slug>   → GET /api/plugins/{slug}
│   │
│   ├── install <ref> → 多源安装
│   │   ├── marketplace → GET tarball → 解压
│   │   ├── npm        → npm registry → 下载
│   │   ├── git        → git clone
│   │   └── local      → 复制目录
│   │
│   ├── uninstall     → 删除 ~/.xbrowser/plugins/{slug}/
│   ├── list          → 读取 ~/.xbrowser/plugins/
│   ├── update        → 检查新版本 → 重新安装
│   │
│   ├── publish       → 打包 → POST /api/plugins/publish
│   │   ├── --dry-run
│   │   ├── --bump <level>
│   │   └── --changelog <text>
│   │
│   └── review <slug> → POST /api/plugins/{slug}/reviews
│
├── 工具模块
│   ├── auth.ts       → auth.json 读写
│   ├── tarball.ts    → 创建/解压 tarball
│   ├── registry.ts   → marketplace + npm API 调用
│   ├── validator.ts  → 插件结构验证
│   └── config.ts     → ~/.xbrowser/ 目录管理
│
└── 配置
    ├── ~/.xbrowser/auth.json         → 认证信息
    ├── ~/.xbrowser/plugins/          → 已安装插件
    └── ~/.xbrowser/plugin-registry.json → 安装记录
```

---

## 9. 数据流图

### 9.1 发布流程数据流

```
开发者                    CLI                      Marketplace API              存储层
  │                       │                            │                         │
  │  xbrowser publish     │                            │                         │
  │──────────────────────>│                            │                         │
  │                       │                            │                         │
  │                       │  1. 读取插件文件             │                         │
  │                       │  2. 验证结构                │                         │
  │                       │  3. 提取 metadata           │                         │
  │                       │  4. 计算 checksum           │                         │
  │                       │  5. 创建 tarball            │                         │
  │                       │                            │                         │
  │                       │  POST /plugins/publish      │                         │
  │                       │  (multipart: metadata+files)│                         │
  │                       │───────────────────────────>│                         │
  │                       │                            │                         │
  │                       │                            │  6. 解析 metadata        │
  │                       │                            │  7. 验证权限 (auth)      │
  │                       │                            │  8. 检查 slug 是否存在   │
  │                       │                            │                         │
  │                       │                            │  写入 D1                 │
  │                       │                            │────────────────────────>│
  │                       │                            │  plugins 表              │
  │                       │                            │  (name, slug, version,   │
  │                       │                            │   status='pending')      │
  │                       │                            │                         │
  │                       │                            │  写入 D1                 │
  │                       │                            │────────────────────────>│
  │                       │                            │  plugin_versions 表      │
  │                       │                            │  (version, packageUrl,   │
  │                       │                            │   checksum)              │
  │                       │                            │                         │
  │                       │                            │  上传文件到 R2           │
  │                       │                            │────────────────────────>│
  │                       │                            │  plugins/{slug}/         │
  │                       │                            │  {version}/package.gz    │
  │                       │                            │                         │
  │                       │  201 Created               │                         │
  │                       │<───────────────────────────│                         │
  │  ✓ Published!         │                            │                         │
  │<──────────────────────│                            │                         │
  │  Status: pending      │                            │                         │
  │                       │                            │                         │
  │                       │                            │  管理员审核              │
  │                       │                            │  PUT /admin/plugins/     │
  │                       │                            │  {slug}/approve          │
  │                       │                            │────────────────────────>│
  │                       │                            │  UPDATE status =         │
  │                       │                            │  'approved'              │
  │                       │                            │                         │
  │  (通知: 插件已上架)    │                            │                         │
```

### 9.2 安装流程数据流 (Marketplace)

```
用户                     CLI                      Marketplace API              存储层
  │                       │                            │                         │
  │  xbrowser install     │                            │                         │
  │  baidu                │                            │                         │
  │──────────────────────>│                            │                         │
  │                       │                            │                         │
  │                       │  1. 读取 auth.json         │                         │
  │                       │                            │                         │
  │                       │  GET /plugins/baidu         │                         │
  │                       │───────────────────────────>│                         │
  │                       │                            │                         │
  │                       │                            │  查询 D1                 │
  │                       │                            │────────────────────────>│
  │                       │                            │  plugin metadata         │
  │                       │                            │<────────────────────────│
  │                       │                            │                         │
  │                       │  200 OK                    │                         │
  │                       │  (name, version, status)   │                         │
  │                       │<───────────────────────────│                         │
  │                       │                            │                         │
  │                       │  GET /plugins/baidu/        │                         │
  │                       │  tarball                    │                         │
  │                       │───────────────────────────>│                         │
  │                       │                            │                         │
  │                       │                            │  从 R2 获取文件          │
  │                       │                            │────────────────────────>│
  │                       │                            │  tarball stream          │
  │                       │                            │<────────────────────────│
  │                       │                            │                         │
  │                       │  200 OK (tarball)          │                         │
  │                       │<───────────────────────────│                         │
  │                       │                            │                         │
  │                       │  2. 验证 checksum           │                         │
  │                       │  3. 解压到                   │                         │
  │                       │     ~/.xbrowser/plugins/    │                         │
  │                       │     baidu/                  │                         │
  │                       │  4. 验证 index.ts           │                         │
  │                       │  5. 验证默认导出             │                         │
  │                       │                            │                         │
  │                       │  POST /plugins/baidu/       │                         │
  │                       │  install                    │                         │
  │                       │───────────────────────────>│                         │
  │                       │                            │  UPDATE downloadCount+1  │
  │                       │                            │────────────────────────>│
  │                       │                            │                         │
  │  ✓ baidu@1.0.0        │                            │                         │
  │    installed!          │                            │                         │
  │<──────────────────────│                            │                         │
```

### 9.3 安装流程数据流 (npm)

```
用户                     CLI                      npm Registry              Marketplace API
  │                       │                            │                         │
  │  xbrowser install     │                            │                         │
  │  xbrowser-plugin-     │                            │                         │
  │  baidu                │                            │                         │
  │──────────────────────>│                            │                         │
  │                       │                            │                         │
  │                       │  GET /xbrowser-plugin-     │                         │
  │                       │  baidu                      │                         │
  │                       │───────────────────────────>│                         │
  │                       │                            │                         │
  │                       │  200 OK                    │                         │
  │                       │  (versions, dist.tarball)  │                         │
  │                       │<───────────────────────────│                         │
  │                       │                            │                         │
  │                       │  验证 xbrowser 元数据       │                         │
  │                       │  (package.json.xbrowser)    │                         │
  │                       │                            │                         │
  │                       │  GET {dist.tarball}         │                         │
  │                       │───────────────────────────>│                         │
  │                       │                            │                         │
  │                       │  200 OK (.tgz)             │                         │
  │                       │<───────────────────────────│                         │
  │                       │                            │                         │
  │                       │  解压 + 验证 + 安装         │                         │
  │                       │                            │                         │
  │  ✓ baidu@1.0.0        │                            │                         │
  │    installed (npm)     │                            │                         │
  │<──────────────────────│                            │                         │
```

### 9.4 搜索流程数据流

```
用户                     CLI                      Marketplace API          npm Registry
  │                       │                            │                         │
  │  xbrowser search      │                            │                         │
  │  "百度"               │                            │                         │
  │──────────────────────>│                            │                         │
  │                       │                            │                         │
  │                       │  GET /plugins/search        │                         │
  │                       │  ?q=百度                     │                         │
  │                       │───────────────────────────>│                         │
  │                       │                            │                         │
  │                       │  GET /-/v1/search           │                         │
  │                       │  ?text=百度+xbrowser-plugin │                         │
  │                       │────────────────────────────────────────────────────>│
  │                       │                            │                         │
  │                       │  200 (marketplace 结果)    │                         │
  │                       │<───────────────────────────│                         │
  │                       │                            │                         │
  │                       │  200 (npm 结果)            │                         │
  │                       │<────────────────────────────────────────────────────│
  │                       │                            │                         │
  │                       │  合并 + 去重 + 排序         │                         │
  │                       │                            │                         │
  │  ┌─────────────────────────────────────────────┐   │                         │
  │  │ Source     │ Name          │ Ver │ Downloads │   │                         │
  │  ├────────────┼───────────────┼─────┼───────────┤   │                         │
  │  │ marketplace│ baidu         │ 1.0 │ 1234      │   │                         │
  │  │ marketplace│ baidu-search  │ 2.1 │ 567       │   │                         │
  │  │ npm        │ xb-plugin-bd  │ 0.9 │ 89        │   │                         │
  │  └─────────────────────────────────────────────┘   │                         │
  │<──────────────────────│                            │                         │
```

---

## 附录 A: 现有数据库表结构

### developers 表

| 列           | 类型        | 说明                        |
| ------------ | ----------- | --------------------------- |
| id           | text PK     | UUID                        |
| username     | text UNIQUE | 用户名                      |
| email        | text UNIQUE | 邮箱                        |
| passwordHash | text        | bcrypt hash                 |
| role         | text        | 'developer' / 'super_admin' |
| apiKey       | text UNIQUE | 认证 token                  |
| createdAt    | timestamp   | 创建时间                    |
| updatedAt    | timestamp   | 更新时间                    |

### plugins 表

| 列            | 类型                    | 说明                              |
| ------------- | ----------------------- | --------------------------------- |
| id            | text PK                 | UUID                              |
| name          | text                    | 显示名                            |
| slug          | text UNIQUE             | URL 标识                          |
| description   | text                    | 描述                              |
| readme        | text                    | README 内容                       |
| authorId      | text FK → developers.id | 作者                              |
| authorName    | text                    | 作者名                            |
| repositoryUrl | text                    | 仓库地址                          |
| homepageUrl   | text                    | 主页地址                          |
| npmPackage    | text                    | npm 包名                          |
| license       | text                    | 许可证                            |
| version       | text                    | 当前版本                          |
| status        | text                    | pending/approved/rejected/removed |
| downloadCount | integer                 | 下载量                            |
| viewCount     | integer                 | 浏览量                            |
| featured      | boolean                 | 是否精选                          |
| screenshotUrl | text                    | 截图 URL                          |
| siteUrls      | text (JSON)             | 支持站点列表                      |
| tags          | text (JSON)             | 标签列表                          |
| commands      | text (JSON)             | 命令列表                          |
| createdAt     | timestamp               | 创建时间                          |
| updatedAt     | timestamp               | 更新时间                          |

### plugin_versions 表

| 列          | 类型                 | 说明                              |
| ----------- | -------------------- | --------------------------------- |
| id          | text PK              | UUID                              |
| pluginId    | text FK → plugins.id | 所属插件                          |
| version     | text                 | 版本号                            |
| changelog   | text                 | 变更日志                          |
| packageUrl  | text                 | 包下载地址 (当前为占位符)         |
| fileSize    | integer              | 文件大小                          |
| checksum    | text                 | SHA-256                           |
| status      | text                 | pending/approved/rejected/removed |
| publishedAt | timestamp            | 发布时间                          |

### plugin_reviews 表

| 列        | 类型                 | 说明       |
| --------- | -------------------- | ---------- |
| id        | text PK              | UUID       |
| pluginId  | text FK → plugins.id | 所属插件   |
| userId    | text                 | 评论用户   |
| userName  | text                 | 用户名     |
| rating    | integer              | 评分 (1-5) |
| title     | text                 | 评论标题   |
| content   | text                 | 评论内容   |
| createdAt | timestamp            | 创建时间   |

### plugin_categories 表

| 列          | 类型        | 说明     |
| ----------- | ----------- | -------- |
| id          | text PK     | UUID     |
| name        | text UNIQUE | 分类名   |
| slug        | text UNIQUE | URL 标识 |
| description | text        | 描述     |
| icon        | text        | 图标     |
| sortOrder   | integer     | 排序权重 |

### plugin_category_mappings 表

| 列         | 类型                           | 说明    |
| ---------- | ------------------------------ | ------- |
| pluginId   | text FK → plugins.id           | 插件 ID |
| categoryId | text FK → plugin_categories.id | 分类 ID |

_(pluginId + categoryId 联合唯一索引)_

---

## 附录 B: API 端点汇总

### 认证

| 方法 | 端点               | 认证   | 说明           | 状态 |
| ---- | ------------------ | ------ | -------------- | ---- |
| POST | /api/auth/register | 无     | 注册开发者     | ✅   |
| POST | /api/auth/login    | 无     | 登录获取 token | ✅   |
| GET  | /api/auth/verify   | Bearer | 验证 token     | ✅   |

### 插件 (公开)

| 方法 | 端点                           | 认证 | 说明         | 状态    |
| ---- | ------------------------------ | ---- | ------------ | ------- |
| GET  | /api/plugins                   | 无   | 插件列表     | ✅      |
| GET  | /api/plugins/search            | 无   | 搜索插件     | ✅      |
| GET  | /api/plugins/{slug}            | 无   | 插件详情     | ✅      |
| GET  | /api/plugins/{slug}/versions   | 无   | 版本列表     | ✅      |
| GET  | /api/plugins/{slug}/tarball    | 无   | 下载 tarball | ⚠️ 占位 |
| POST | /api/plugins/{slug}/install    | 无   | 追踪安装     | ✅      |
| GET  | /api/plugins/{slug}/reviews    | 无   | 获取评价     | ✅      |
| GET  | /api/categories                | 无   | 分类列表     | ✅      |
| GET  | /api/categories/{slug}/plugins | 无   | 分类下的插件 | ✅      |
| GET  | /api/stats                     | 无   | 市场统计     | ✅      |

### 插件 (需认证)

| 方法   | 端点                         | 认证   | 说明           | 状态            |
| ------ | ---------------------------- | ------ | -------------- | --------------- |
| POST   | /api/plugins                 | Bearer | 创建插件       | ✅              |
| PUT    | /api/plugins/{slug}          | Bearer | 更新插件       | ✅              |
| DELETE | /api/plugins/{slug}          | Bearer | 删除插件       | ✅              |
| POST   | /api/plugins/publish         | Bearer | 发布 (tarball) | ⚠️ 文件未持久化 |
| POST   | /api/plugins/{slug}/versions | Bearer | 发布新版本     | ⚠️ 无文件上传   |
| POST   | /api/plugins/{slug}/reviews  | Bearer | 提交评价       | ✅              |

### 管理员

| 方法   | 端点                              | 认证        | 说明     | 状态 |
| ------ | --------------------------------- | ----------- | -------- | ---- |
| GET    | /api/admin/stats/dashboard        | super_admin | 仪表盘   | ✅   |
| GET    | /api/admin/plugins/pending        | super_admin | 待审核   | ✅   |
| GET    | /api/admin/plugins                | super_admin | 所有插件 | ✅   |
| PUT    | /api/admin/plugins/{slug}/approve | super_admin | 批准     | ✅   |
| PUT    | /api/admin/plugins/{slug}/reject  | super_admin | 拒绝     | ✅   |
| PUT    | /api/admin/plugins/{slug}/feature | super_admin | 精选     | ✅   |
| DELETE | /api/admin/plugins/{slug}         | super_admin | 下架     | ✅   |
| POST   | /api/admin/plugins/bulk-approve   | super_admin | 批量批准 | ✅   |
| POST   | /api/admin/plugins/bulk-reject    | super_admin | 批量拒绝 | ✅   |
| GET    | /api/admin/categories             | super_admin | 分类列表 | ✅   |
| POST   | /api/admin/categories             | super_admin | 创建分类 | ✅   |
| PUT    | /api/admin/categories/{id}        | super_admin | 更新分类 | ✅   |
| DELETE | /api/admin/categories/{id}        | super_admin | 删除分类 | ✅   |
