# XBrowser 插件市场 — 开发者完整指南

> 从注册到发布、从审核到管理，一篇文档搞定所有。

---

## 目录

1. [快速开始（5 分钟上手）](#1-快速开始5-分钟上手)
2. [账号注册与认证](#2-账号注册与认证)
3. [创建你的第一个插件](#3-创建你的第一个插件)
4. [package.json 配置详解](#4-packagejson-配置详解)
5. [发布插件](#5-发布插件)
6. [发布新版本](#6-发布新版本)
7. [插件审核流程](#7-插件审核流程)
8. [管理你的插件](#8-管理你的插件)
9. [CLI 完整命令参考](#9-cli-完整命令参考)
10. [CI/CD 集成](#10-cicd-集成)
11. [插件 Skill 配置](#11-插件-skill-配置)
12. [常见问题 FAQ](#12-常见问题-faq)

---

## 1. 快速开始（5 分钟上手）

### 安装 CLI

```bash
npm install -g xbrowser-marketplace
```

### 一键发布

```bash
# 1. 登录
xbrowser-marketplace auth login

# 2. 进入你的插件目录
cd my-awesome-plugin

# 3. 发布（自动读取 package.json）
xbrowser-marketplace publish create .
```

完成！你的插件现在处于 `pending` 状态，等待管理员审核。

---

## 2. 账号注册与认证

### 方式 A：网页注册

访问 https://xbrowser-marketplace.dyyz1993.workers.dev/register

填写邮箱、用户名、密码，注册成功后自动登录。

### 方式 B：CLI 登录

```bash
# 交互式登录（输入邮箱密码）
xbrowser-marketplace auth login

# 非交互式（适合 CI）
xbrowser-marketplace auth login -e user@example.com -p yourpassword
```

### 查看登录状态

```bash
xbrowser-marketplace auth whoami
# 输出：Logged in as user@example.com (username)
```

### 退出登录

```bash
xbrowser-marketplace auth logout
# 输出：Logged out successfully
```

### 认证机制

- 登录成功后，服务器返回 Bearer token
- Token 存储在 `~/.xbrowser-marketplace/config.json`
- 所有 API 请求自动携带 `Authorization: Bearer <token>`
- Token 过期后需要重新登录

---

## 3. 创建你的第一个插件

### 最小项目结构

```
my-plugin/
├── package.json    # 插件元数据（必填）
├── index.ts        # 插件入口（必填）
└── README.md       # 插件说明（推荐）
```

### package.json 示例

```json
{
  "name": "my-awesome-plugin",
  "version": "1.0.0",
  "description": "一个超棒的浏览器自动化插件",
  "author": "Your Name",
  "main": "index.ts",
  "xbrowser": {
    "slug": "my-awesome-plugin",
    "commands": ["scrape", "click", "screenshot"],
    "sites": ["example.com", "github.com"],
    "tags": ["automation", "scraping", "testing"],
    "category": "automation",
    "license": "MIT",
    "homepageUrl": "https://github.com/you/my-plugin",
    "repositoryUrl": "https://github.com/you/my-plugin"
  }
}
```

### 插件入口文件 (index.ts)

```typescript
export default {
  name: 'my-awesome-plugin',
  version: '1.0.0',

  // 插件支持的命令
  commands: {
    scrape: async (ctx) => {
      const { page, args } = ctx
      // 实现抓取逻辑
      return { data: await page.content() }
    },

    click: async (ctx) => {
      const { page, args } = ctx
      await page.click(args.selector)
      return { success: true }
    },

    screenshot: async (ctx) => {
      const { page, args } = ctx
      const buffer = await page.screenshot({ path: args.output })
      return { path: args.output }
    }
  },

  // 插件生命周期
  onInit: async () => {
    console.log('Plugin initialized')
  },

  onDestroy: async () => {
    console.log('Plugin destroyed')
  }
}
```

---

## 4. package.json 配置详解

### xbrowser 字段参考

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `slug` | string | 是* | 从 name 生成 | 插件唯一标识（小写+连字符） |
| `commands` | string[] | 否 | [] | 插件支持的命令列表 |
| `sites` | string[] | 否 | [] | 兼容的目标网站 |
| `tags` | string[] | 否 | [] | 搜索标签 |
| `category` | string | 否 | - | 分类（见下方分类列表） |
| `license` | string | 否 | "MIT" | 开源协议 |
| `homepageUrl` | string | 否 | null | 项目主页 |
| `repositoryUrl` | string | 否 | null | 代码仓库 |
| `npmPackage` | string | 否 | null | npm 包名 |

> *`slug` 如果不指定，会自动从 `package.json` 的 `name` 字段生成（去除特殊字符，转小写）。

### 支持的分类

| 分类 slug | 显示名称 |
|-----------|---------|
| `search-engines` | 搜索引擎 |
| `social-media` | 社交媒体 |
| `developer-tools` | 开发者工具 |
| `web-automation` | 网页自动化 |
| `e-commerce` | 电子商务 |
| `data-extraction` | 数据提取 |

### slug 规则

- 只允许小写字母、数字、连字符（`-`）
- 正则：`^[a-z0-9-]+$`
- 全局唯一（已被占用的 slug 无法使用）
- 建议：使用英文短名，如 `github-seo`、`douyin-scraper`

---

## 5. 发布插件

### 方式 A：智能发布（推荐）

```bash
# 从当前目录发布（自动读取 package.json + 打包）
xbrowser-marketplace publish create .

# 从指定目录发布
xbrowser-marketplace publish create ./path/to/plugin
```

智能发布会自动：
1. 读取 `package.json` 中的 name、version、description、author
2. 读取 `xbrowser` 字段中的 slug、commands、sites、tags 等
3. 自动创建 tar.gz 压缩包
4. 上传到服务器

### 方式 B：手动发布

```bash
xbrowser-marketplace publish create \
  --name "My Plugin" \
  --slug "my-plugin" \
  --version "1.0.0" \
  --description "A great plugin" \
  --author "Your Name" \
  --tags "automation,scraping" \
  --sites "example.com" \
  --file ./my-plugin.tar.gz
```

### 方式 C：API 直接调用

```bash
# 获取 Token
TOKEN=$(cat ~/.xbrowser-marketplace/config.json | jq -r '.token')

# 通过 API 发布
curl -X POST https://xbrowser-marketplace.dyyz1993.workers.dev/api/plugins/publish \
  -H "Authorization: Bearer $TOKEN" \
  -F "metadata={\"name\":\"My Plugin\",\"slug\":\"my-plugin\",\"version\":\"1.0.0\",\"description\":\"A great plugin\"};type=application/json" \
  -F "file=@./my-plugin.tar.gz"
```

### 必填字段

| 字段 | 验证规则 |
|------|---------|
| name | 1-100 字符 |
| slug | 小写+连字符，全局唯一 |
| version | semver 格式（x.y.z） |
| description | 至少 1 字符 |

---

## 6. 发布新版本

```bash
# 方式 1：指定文件
xbrowser-marketplace publish version \
  --slug my-plugin \
  --version 2.0.0 \
  --changelog "添加了新功能 X" \
  --file ./my-plugin-2.0.0.tar.gz

# 方式 2：不带文件（仅更新元数据）
xbrowser-marketplace publish version \
  --slug my-plugin \
  --version 2.0.0 \
  --changelog "Bug 修复"
```

### 版本号规则

遵循 [Semantic Versioning](https://semver.org/):

- `1.0.0 → 1.0.1`：Bug 修复（PATCH）
- `1.0.0 → 1.1.0`：新增功能（MINOR）
- `1.0.0 → 2.0.0`：破坏性变更（MAJOR）

---

## 7. 插件审核流程

### 审核状态

```
[提交] → pending（待审核）
              │
              ├──→ approved（已通过）← 在市场中可见
              │
              └──→ rejected（已驳回）← 附带驳回原因
                       │
                       └──→ 修改后重新提交
```

### 状态说明

| 状态 | 说明 | 是否在市场可见 |
|------|------|--------------|
| `pending` | 刚提交，等待管理员审核 | ❌ 不可见 |
| `approved` | 审核通过 | ✅ 可见 |
| `rejected` | 审核驳回（附原因） | ❌ 不可见 |
| `removed` | 已下架 | ❌ 不可见 |

### 查看审核状态

```bash
# 在线查看
# 登录后访问：https://xbrowser-marketplace.dyyz1993.workers.dev/developer

# CLI 查看
xbrowser-marketplace plugin info my-plugin
```

### 被驳回怎么办？

1. 查看驳回原因（`rejectReason` 字段）
2. 修改插件代码/描述
3. 重新发布新版本：`xbrowser-marketplace publish version --slug my-plugin --version 1.0.1 ...`

---

## 8. 管理你的插件

### 开发者仪表盘

访问 https://xbrowser-marketplace.dyyz1993.workers.dev/developer

功能：
- 查看已发布的所有插件
- 查看审核状态
- 查看下载量、浏览量
- 快速发布新版本

### 常用管理操作

```bash
# 查看插件详情
xbrowser-marketplace plugin info my-plugin

# 搜索插件（检查 slug 是否被占用）
xbrowser-marketplace plugin search "my keyword"

# 查看所有分类
xbrowser-marketplace plugin categories
```

---

## 9. CLI 完整命令参考

### 全局选项

| 选项 | 说明 |
|------|------|
| `-v, --verbose` | 显示详细日志 |
| `-u, --url <url>` | 覆盖服务器地址 |
| `-h, --help` | 显示帮助 |

### auth — 认证管理

| 命令 | 说明 |
|------|------|
| `auth login` | 交互式登录 |
| `auth login -e <email> -p <password>` | 非交互式登录 |
| `auth logout` | 退出登录 |
| `auth whoami` | 查看当前用户 |

### publish — 发布管理

| 命令 | 说明 |
|------|------|
| `publish create [directory]` | 智能发布（读 package.json） |
| `publish create --name X --slug Y ...` | 手动发布 |
| `publish version --slug X --version Y` | 发布新版本 |

**publish create 选项**:

| 选项 | 必填 | 说明 |
|------|------|------|
| `[directory]` | 否* | 插件目录路径（启用智能发布） |
| `--name <name>` | 是* | 插件名称 |
| `--slug <slug>` | 是* | 唯一标识 |
| `--version <ver>` | 是* | 版本号（semver） |
| `--description <desc>` | 是* | 描述 |
| `--file <path>` | 否 | 压缩包路径 |
| `--author <name>` | 否 | 作者 |
| `--tags <tags>` | 否 | 标签（逗号分隔） |
| `--sites <sites>` | 否 | 兼容网站（逗号分隔） |
| `--npm-package <pkg>` | 否 | npm 包名 |

> *智能模式下自动从 package.json 读取，无需手动指定。

**publish version 选项**:

| 选项 | 必填 | 说明 |
|------|------|------|
| `--slug <slug>` | 是 | 插件 slug |
| `--version <ver>` | 是 | 新版本号 |
| `--changelog <text>` | 否 | 更新日志 |
| `--file <path>` | 否 | 压缩包路径 |

### plugin — 插件浏览

| 命令 | 说明 |
|------|------|
| `plugin list` | 列出所有插件 |
| `plugin list --category automation` | 按分类筛选 |
| `plugin list --sort downloads` | 按下载量排序 |
| `plugin search <query>` | 搜索插件 |
| `plugin info <slug>` | 查看插件详情 |
| `plugin categories` | 列出所有分类 |

### config — 配置管理

| 命令 | 说明 |
|------|------|
| `config url` | 查看服务器地址 |
| `config url <url>` | 设置服务器地址 |
| `config status` | 检查服务器连接 |
| `config path` | 查看配置文件路径 |
| `config reset` | 重置为默认配置 |

### notification — 通知管理

| 命令 | 说明 |
|------|------|
| `notification list` | 列出通知 |
| `notification list --unread-only` | 只看未读 |
| `notification create -t "标题" -m "内容"` | 创建通知 |
| `notification mark-read <id>` | 标记已读 |
| `notification delete <id>` | 删除通知 |

---

## 10. CI/CD 集成

### GitHub Actions 自动发布

在你的插件仓库中创建 `.github/workflows/publish.yml`:

```yaml
name: Publish Plugin

on:
  push:
    tags:
      - 'v*'  # 匹配 v1.0.0, v2.1.3 等标签

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install CLI
        run: npm install -g xbrowser-marketplace

      - name: Login
        env:
          XBROWSER_TOKEN: ${{ secrets.XBROWSER_TOKEN }}
        run: |
          # 写入 token 到配置文件
          mkdir -p ~/.xbrowser-marketplace
          echo '{"token":"'$XBROWSER_TOKEN'","baseUrl":"https://xbrowser-marketplace.dyyz1993.workers.dev"}' > ~/.xbrowser-marketplace/config.json

      - name: Extract version from tag
        id: version
        run: echo "VERSION=${GITHUB_REF#refs/tags/v}" >> $GITHUB_OUTPUT

      - name: Publish Plugin
        run: |
          xbrowser-marketplace publish create . --version ${{ steps.version.outputs.VERSION }}
```

### 配置 GitHub Secrets

在你的 GitHub 仓库中：

1. 进入 **Settings → Secrets and variables → Actions**
2. 添加 **Repository Secret**：
   - Name: `XBROWSER_TOKEN`
   - Value: 你的 Bearer token（通过 `xbrowser-marketplace auth login` 获取）

> **安全提示**: 不要将 token 硬编码在代码中。使用 GitHub Secrets 存储敏感信息。

### GitLab CI 示例

```yaml
# .gitlab-ci.yml
stages:
  - publish

publish:
  stage: publish
  only:
    - tags
  script:
    - npm install -g xbrowser-marketplace
    - mkdir -p ~/.xbrowser-marketplace
    - echo "{\"token\":\"$XBROWSER_TOKEN\",\"baseUrl\":\"https://xbrowser-marketplace.dyyz1993.workers.dev\"}" > ~/.xbrowser-marketplace/config.json
    - xbrowser-marketplace publish create .
  variables:
    XBROWSER_TOKEN: $CI_XBROWSER_TOKEN
```

### 自动版本号管理

结合 `standard-version` 自动管理版本号：

```bash
# 安装
npm install -D standard-version

# 发布流程
npm run release -- --release-as minor  # 自动 bump 版本 + 生成 changelog
git push --follow-tags origin main     # 推送代码和标签
# GitHub Actions 自动触发发布
```

在 `package.json` 中添加：
```json
{
  "scripts": {
    "release": "standard-version"
  }
}
```

---

## 11. 插件 Skill 配置

### 什么是 Skill？

Skill 是插件的能力声明，告诉 XBrowser 平台你的插件能做什么。通过 `package.json` 中的 `xbrowser` 字段定义。

### commands — 支持的命令

```json
{
  "xbrowser": {
    "commands": ["scrape", "click", "type", "screenshot", "wait"]
  }
}
```

每个命令对应插件入口文件中的一个异步函数：

```typescript
export default {
  commands: {
    scrape: async (ctx) => { /* ... */ },
    click: async (ctx) => { /* ... */ },
    type: async (ctx) => { /* ... */ },
    screenshot: async (ctx) => { /* ... */ },
    wait: async (ctx) => { /* ... */ },
  }
}
```

### sites — 兼容的目标网站

```json
{
  "xbrowser": {
    "sites": ["baidu.com", "google.com", "github.com"]
  }
}
```

声明你的插件可以在哪些网站上使用。用户可以按网站搜索插件。

### tags — 搜索标签

```json
{
  "xbrowser": {
    "tags": ["SEO", "scraping", "automation", "testing", "monitoring"]
  }
}
```

标签用于搜索和推荐。建议 3-5 个标签。

### category — 分类

```json
{
  "xbrowser": {
    "category": "web-automation"
  }
}
```

可选分类：`search-engines`、`social-media`、`developer-tools`、`web-automation`、`e-commerce`、`data-extraction`

### 完整 Skill 配置示例

```json
{
  "name": "xbrowser-plugin-github",
  "version": "1.2.0",
  "description": "GitHub 仓库数据自动提取和 SEO 分析插件",
  "author": "Developer Name",
  "main": "index.ts",
  "xbrowser": {
    "slug": "github-seo",
    "commands": ["scrape-repo", "analyze-seo", "extract-readme"],
    "sites": ["github.com"],
    "tags": ["github", "SEO", "scraping", "developer-tools"],
    "category": "developer-tools",
    "license": "MIT",
    "homepageUrl": "https://github.com/dev/xbrowser-github-plugin",
    "repositoryUrl": "https://github.com/dev/xbrowser-github-plugin",
    "npmPackage": "@dev/xbrowser-plugin-github"
  }
}
```

---

## 12. 常见问题 FAQ

### Q: 发布失败 401 Unauthorized
**A**: 先执行 `xbrowser-marketplace auth login` 登录，用 `xbrowser-marketplace auth whoami` 确认登录状态。

### Q: slug 已存在
**A**: slug 全局唯一。换一个名字，或检查是否你已经发布过同名插件。

### Q: 版本号格式错误
**A**: 必须使用 semver 格式：`x.y.z`（如 `1.0.0`、`2.1.3`、`0.1.0`）。

### Q: 如何查看审核状态？
**A**: 登录后访问 https://xbrowser-marketplace.dyyz1993.workers.dev/developer 查看你的所有插件和审核状态。

### Q: 审核要多久？
**A**: 通常 1-2 个工作日。被驳回时会附带原因，修改后可重新提交。

### Q: 如何删除已发布的插件？
**A**: 目前需要联系管理员。后续会支持开发者自行下架。

### Q: 可以更新已发布版本的描述吗？
**A**: 可以通过发布新版本更新。暂不支持修改已发布版本的内容。

### Q: 文件大小限制？
**A**: 单个插件包建议不超过 10MB。

### Q: 支持私有插件吗？
**A**: 当前版本仅支持公开发布。私有插件功能规划中。

### Q: CI/CD 中 token 过期怎么办？
**A**: 重新登录获取新 token，更新 GitHub Secrets 中的 `XBROWSER_TOKEN`。

---

## 附录：环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `XBROWSER_API_URL` | 服务器地址 | `https://xbrowser-marketplace.dyyz1993.workers.dev` |
| `XBROWSER_VERBOSE` | 详细日志 | `false` |
| `XBROWSER_DEBUG` | 调试日志 | `false` |

## 附录：配置文件

路径: `~/.xbrowser-marketplace/config.json`

```json
{
  "baseUrl": "https://xbrowser-marketplace.dyyz1993.workers.dev",
  "token": "your-bearer-token-here",
  "stats": {
    "totalCalls": 42,
    "lastCallAt": "2024-01-15T10:30:00Z"
  }
}
```
