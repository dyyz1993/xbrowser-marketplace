# xbrowser-marketplace 项目大纲

## 会话信息
- **创建时间**: 2026-05-06
- **最后更新**: 2026-05-06

## 项目定位
xbrowser 插件市场 — 浏览、搜索、发布、安装 xbrowser 插件的 Web 平台。
- GitHub: https://github.com/dyyz1993/xbrowser-marketplace
- 线上地址: https://xbrowser-marketplace.dyyz1993.workers.dev
- 技术栈: Hono + Cloudflare Workers + D1 + R2 + React 18 + Ant Design + Zustand + Tailwind + Drizzle ORM
- 脚手架来源: create-biomimic-app

## 架构
```
src/
├── server/                    # 后端
│   ├── module-plugin/         # 插件模块（核心）
│   │   ├── routes/            # plugin-routes, publish-routes, plugin-admin-routes, review-routes
│   │   └── services/          # plugin-service, publish-service, storage-service, admin-service
│   ├── module-auth/           # 认证模块（注册/登录/API Key）
│   ├── module-admin/          # 管理后台模块
│   ├── module-file/           # 文件上传模块
│   ├── module-permission/     # 权限系统（RBAC）
│   ├── module-captcha/        # 验证码
│   ├── module-notifications/  # SSE 通知
│   ├── db/                    # Drizzle ORM + D1
│   │   ├── schema/            # plugins, developers, categories, versions, reviews
│   │   └── seeds/             # 种子数据（4 插件 + 6 分类）
│   ├── middleware/            # auth, cors, rate-limit, error-handler
│   └── entries/               # cloudflare.ts, node.ts 入口
├── client/                    # React 前端
│   ├── pages/                 # Home, Search, PluginDetail, Categories, CLI
│   ├── components/            # PluginCard, SearchBar, InstallModal, Navbar, StatsBar
│   ├── stores/                # Zustand store
│   └── services/              # plugin-api
├── admin/                     # React 管理后台
│   └── pages/                 # Dashboard, PluginReview, PluginManagement, CategoryManagement
├── shared/                    # 共享模块 + Zod schemas
└── public/skills/             # AI Skill 文件（plugin-dev.md）
```

## 数据库（D1）
- 5 张插件相关表: plugins, plugin_versions, plugin_reviews, plugin_categories, plugin_category_mappings
- developers 表: 开发者账户
- 种子数据: 4 个插件（baidu, douyin, github, web-automation）+ 6 个分类

## 文件存储
- **R2**（主）: xbrowser-plugins bucket，key 格式 plugins/{slug}/{version}.tar.gz
- **npm**（备）: 开发者发布到 npm，市场同步元数据
- packageUrl 格式: r2://... 或 npm://...

## API 端点（40+）
### 公开
- GET /api/plugins, /api/plugins/search, /api/plugins/:slug
- GET /api/categories, /api/stats
- GET /api/plugins/:slug/tarball, /api/plugins/:slug/reviews

### 认证
- POST /api/auth/register, /api/auth/login, GET /api/auth/verify

### 开发者（需登录）
- POST /api/plugins/publish, POST /api/plugins/:slug/versions
- POST /api/plugins/:slug/reviews, DELETE /api/plugins/:slug/reviews/:id

### 管理员
- GET /api/admin/plugins/pending, PUT approve/reject/feature
- POST bulk-approve/reject, DELETE
- GET/POST/PUT/DELETE /api/admin/categories
- GET /api/admin/stats/dashboard

## Cloudflare 部署
- Workers: xbrowser-marketplace
- D1: xbrowser-marketplace-db (ID: c18edb9b-4747-41f0-b31a-9f705421fbef)
- R2: xbrowser-plugins
- 域名: xbrowser-marketplace.dyyz1993.workers.dev
- 自动部署: GitHub Actions push master → wrangler deploy

## 测试
- 框架: Vitest
- 测试数: 742（全部通过）
- 62 个测试文件
- 场景覆盖率: 97/97 = 100%
- 关键测试文件:
  - marketplace-flow.test.ts（E2E 全流程 26 测试）
  - plugin-api.test.ts（API 层 15 测试）
  - plugin-service.test.ts（服务层 20 测试）
  - publish-routes.test.ts（发布流程 11 测试）
  - plugin-admin-routes.test.ts（管理员 21 测试）
  - plugin-routes-extended.test.ts（扩展 16 测试）

## 关键决策
1. 用 create-biomimic-app 脚手架生成，保留认证/权限/文件上传等基础设施
2. 删除了 todos/orders/disputes/tickets/chat 等无关业务模块
3. 保留的模块: plugin（核心）、auth、permission、file、captcha、notifications
4. 认证模型: API Key 作为 Bearer token（非 JWT）
5. 文件存储: R2（直接上传）+ npm（元数据同步）双模式

## 业务流程文档
- docs/business-flow.md — 完整业务流程设计
- docs/test-coverage-audit.md — 测试覆盖审计
- docs/api.md — API 文档
- docs/deployment.md — 部署指南
- docs/plugin-development.md — 插件开发指南

## 用户偏好
- 代理: http://127.0.0.1:7890
- Cloudflare 账户: dyyz1993@qq.com
- Account ID: 89d33e8baa4ff32eb2def95cff00e91b
