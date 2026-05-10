# 插件发布指南

完整的 XBrowser Marketplace 插件开发与发布指南。

## 快速开始（5 分钟发布你的第一个插件）

### 1. 安装 CLI

```bash
npm install -g xbrowser-marketplace
```

### 2. 注册账号并登录

```bash
# 访问注册页面创建账号
# https://xbrowser-marketplace.dyyz1993.workers.dev/register

# 登录
xbrowser-marketplace auth login -e your@email.com -p yourpassword
```

### 3. 创建插件项目

```bash
mkdir my-awesome-plugin
cd my-awesome-plugin
```

创建 `package.json`：

```json
{
  "name": "my-awesome-plugin",
  "version": "1.0.0",
  "description": "An awesome browser automation plugin",
  "main": "index.ts",
  "xbrowser": {
    "slug": "my-awesome-plugin",
    "commands": ["scrape", "click"],
    "sites": ["example.com"],
    "tags": ["automation", "scraping"],
    "category": "automation"
  }
}
```

创建入口文件 `index.ts`：

```typescript
export default {
  name: 'my-awesome-plugin',
  version: '1.0.0',
  commands: {
    scrape: async ctx => {
      // your scraping logic
    },
    click: async ctx => {
      // your clicking logic
    },
  },
}
```

### 4. 发布到市场

```bash
# 智能发布（从当前目录读取 package.json，自动创建 tarball）
xbrowser-marketplace publish create .
```

### 5. 等待审核

发布后插件状态为 `pending`（待审核），管理员审核通过后自动上架。

### 6. 发布新版本

```bash
# 更新 package.json 中的 version 字段
xbrowser-marketplace publish create .
```

或指定版本发布：

```bash
xbrowser-marketplace publish version \
  --slug my-awesome-plugin \
  --version 2.0.0 \
  --changelog "Added new features" \
  --file ./dist/plugin-2.0.0.tar.gz
```

## 完整 CLI 参考

### 认证命令

| 命令                                                              | 说明                       |
| ----------------------------------------------------------------- | -------------------------- |
| `xbrowser-marketplace auth login`                                 | 登录（交互式输入邮箱密码） |
| `xbrowser-marketplace auth login -e user@example.com -p password` | 非交互式登录               |
| `xbrowser-marketplace auth logout`                                | 退出登录，清除本地 token   |
| `xbrowser-marketplace auth whoami`                                | 查看当前登录用户信息       |

### 发布命令

| 命令                                                                                            | 说明                                                    |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `xbrowser-marketplace publish create ./dir`                                                     | **智能发布**：从目录读取 package.json，自动创建 tarball |
| `xbrowser-marketplace publish create --name "X" --slug "y" --version "1.0.0" --description "D"` | 手动指定参数发布                                        |
| `xbrowser-marketplace publish version --slug X --version Y`                                     | 发布新版本（无文件）                                    |
| `xbrowser-marketplace publish version --slug X --version Y --file ./dist.tar.gz`                | 发布新版本（含文件上传）                                |

### 发布可选参数

| 参数                  | 说明                            |
| --------------------- | ------------------------------- |
| `--file <path>`       | 指定 tarball 文件路径           |
| `--author <name>`     | 作者名称                        |
| `--tags <tags>`       | 逗号分隔的标签                  |
| `--sites <sites>`     | 逗号分隔的支持站点              |
| `--npm-package <pkg>` | NPM 包名                        |
| `--changelog <text>`  | 版本更新日志（仅 version 命令） |

### 插件命令

| 命令                                                     | 说明                                         |
| -------------------------------------------------------- | -------------------------------------------- |
| `xbrowser-marketplace plugin list`                       | 列出所有已审核插件                           |
| `xbrowser-marketplace plugin list --category automation` | 按分类筛选                                   |
| `xbrowser-marketplace plugin list --sort popular`        | 排序：newest, popular, most_downloaded, name |
| `xbrowser-marketplace plugin search <query>`             | 搜索插件                                     |
| `xbrowser-marketplace plugin info <slug>`                | 查看插件详情                                 |
| `xbrowser-marketplace plugin categories`                 | 列出所有分类                                 |

### 配置命令

| 命令                                          | 说明               |
| --------------------------------------------- | ------------------ |
| `xbrowser-marketplace config get`             | 查看当前配置       |
| `xbrowser-marketplace config url`             | 查看当前服务器地址 |
| `xbrowser-marketplace config url https://...` | 设置服务器地址     |
| `xbrowser-marketplace config status`          | 检查服务状态       |
| `xbrowser-marketplace config path`            | 查看配置文件路径   |
| `xbrowser-marketplace config reset`           | 重置为默认配置     |

### 全局选项

| 选项                    | 说明                       |
| ----------------------- | -------------------------- |
| `-v, --verbose`         | 显示详细日志               |
| `-u, --url <url>`       | 指定服务器 URL（覆盖配置） |
| `XBROWSER_API_URL`      | 环境变量设置服务器 URL     |
| `XBROWSER_VERBOSE=true` | 环境变量启用详细日志       |
| `XBROWSER_DEBUG=true`   | 环境变量启用调试日志       |

## package.json 中的 xbrowser 字段

`xbrowser` 字段是插件元数据的声明方式，`publish create ./dir` 会自动读取：

```json
{
  "name": "plugin-name",
  "version": "1.0.0",
  "description": "Plugin description",
  "author": "Your Name",
  "license": "MIT",
  "xbrowser": {
    "slug": "plugin-name",
    "commands": ["command1", "command2"],
    "sites": ["example.com", "test.com"],
    "tags": ["automation", "scraping"],
    "category": "automation",
    "license": "MIT",
    "homepageUrl": "https://github.com/user/plugin",
    "repositoryUrl": "https://github.com/user/plugin",
    "npmPackage": "@user/plugin-name"
  }
}
```

### xbrowser 字段说明

| 字段            | 类型     | 说明                                   |
| --------------- | -------- | -------------------------------------- |
| `slug`          | string   | 插件唯一标识（小写字母、数字、连字符） |
| `commands`      | string[] | 插件提供的命令列表                     |
| `sites`         | string[] | 支持的网站列表                         |
| `tags`          | string[] | 标签（用于搜索和分类）                 |
| `category`      | string   | 主分类                                 |
| `license`       | string   | 开源协议（默认 MIT）                   |
| `homepageUrl`   | string   | 主页 URL                               |
| `repositoryUrl` | string   | 代码仓库 URL                           |
| `npmPackage`    | string   | NPM 包名                               |

## 智能发布流程详解

当执行 `xbrowser-marketplace publish create ./my-plugin` 时：

1. **读取 package.json** — 提取 name, version, description, author
2. **读取 xbrowser 字段** — 提取 slug, commands, sites, tags 等
3. **生成 slug** — 如未指定，从 `name` 字段派生（去除 `@scope/`）
4. **创建 tarball** — 自动打包目录内容（排除 node_modules, .git）
5. **提交审核** — 包含元数据和 tarball

## 审核流程

```
开发者提交 → status: pending（待审核）
                    ↓
管理员审核 → approved（通过）或 rejected（驳回 + 原因）
                    ↓
自动上架 → 出现在首页和搜索结果中
```

## 认证机制

CLI 将认证 token 保存在 `~/.xbrowser-marketplace/config.json`：

```json
{
  "baseUrl": "http://localhost:3000",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user-123",
    "username": "developer",
    "email": "dev@example.com",
    "role": "user"
  }
}
```

所有需要认证的 API 请求会自动附加 `Authorization: Bearer <token>` 头。

## 常见问题

### Q: 发布失败 401 Unauthorized

**A:** 先执行 `auth login` 登录，用 `auth whoami` 确认登录状态。Token 可能已过期，重新登录即可。

### Q: slug 已存在

**A:** slug 必须全局唯一。如果已被占用，换一个名字。检查现有 slug：

```bash
xbrowser-marketplace plugin info your-slug
```

### Q: version 格式错误

**A:** 必须使用 semver 格式：`x.y.z`（如 `1.0.0`、`2.1.3`），不支持 `v1.0.0` 前缀。

### Q: 如何查看我的插件？

**A:** 访问开发者面板：

```
https://xbrowser-marketplace.dyyz1993.workers.dev/developer
```

### Q: 如何更新插件文件而不改版本？

**A:** 不支持。每次更新必须使用新版本号，遵循 semver 递增规则。

### Q: tarball 创建失败

**A:** 确保系统已安装 `tar` 命令（macOS/Linux 默认包含）。或手动创建 tarball 后使用 `--file` 参数。

### Q: 支持哪些文件上传方式？

**A:** 两种：

- R2 存储：通过 `--file` 或智能发布的自动 tarball
- NPM：设置 `--npm-package` 指向已发布的 NPM 包

## 完整工作流示例

### 新插件发布

```bash
# 1. 登录
xbrowser-marketplace auth login -e dev@example.com -p secret

# 2. 确认登录状态
xbrowser-marketplace auth whoami

# 3. 进入插件目录
cd ~/projects/my-plugin

# 4. 发布（自动读取 package.json）
xbrowser-marketplace publish create .

# 5. 查看插件状态
xbrowser-marketplace plugin info my-plugin
```

### 更新插件版本

```bash
# 方式 A：更新 package.json version 后重新发布
# 编辑 package.json: "version": "2.0.0"
xbrowser-marketplace publish create .

# 方式 B：使用 version 命令
xbrowser-marketplace publish version \
  --slug my-plugin \
  --version 2.0.0 \
  --changelog "Breaking: new API" \
  --file ./dist/my-plugin-2.0.0.tar.gz
```

### 搜索和浏览

```bash
# 搜索插件
xbrowser-marketplace plugin search "web scraping"

# 按分类浏览
xbrowser-marketplace plugin list --category automation --sort popular

# 查看插件详情
xbrowser-marketplace plugin info web-scraper

# 查看所有分类
xbrowser-marketplace plugin categories
```
