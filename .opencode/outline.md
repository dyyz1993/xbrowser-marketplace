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
- 测试数: 950（全部通过）
- 77 个测试文件
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

## 会话优化记录 (2026-05-06)

### 一、代码质量优化（15 项完成）

#### 🔴 关键问题修复 (6/6)
1. **Rate Limit 环境变量 bug**: `NODE_ENV === 'Test'` → `'test'` (rate-limit.ts)
2. **硬编码密码哈希**: 迁移到 `MOCK_PASSWORD_HASH` 环境变量 + .env.example
3. **Auth Secret Key 硬编码**: 生产环境强制要求环境变量，否则抛错
4. **app.ts as any 类型逃逸**: 拆分 OpenAPIHono 实例变量，消除 cast
5. **原生 SQL → Drizzle ORM**: admin-service.ts 中 COUNT 查询改用 ORM
6. **Auth 模块测试**: 新增 39 个测试用例 (auth-service.test.ts + auth-routes.test.ts)

#### 🟡 警告修复 (6/6)
1. **N+1 查询 → 批量查询**: 新增 getReviewStatsBatch()，5 处 N+1 消除
2. **plugin-service.ts 拆分**: 693 行 → 4 个文件 (plugin-utils/plugin-query-service/plugin-review-service/plugin-service)
3. **类型统一到 shared 层**: PluginListItem/PluginDetail 统一到 @shared/modules/plugins/schemas.ts
4. **无界缓存 → LRU Cache**: 新增 LRUCache 工具类 (TTL + maxSize)，替换 avatarCache/iconCache
5. **测试页面生产隔离**: MediaTestPage/TestCaptchaPage 加 process.env 守卫 + React.lazy
6. **内存通知合并**: 删除 admin-service.ts 内存数组，合并到 DB 持久化通知系统

#### 🟢 建议实施 (2/5，3 项延期)
1. ✅ 重复工具函数 → utils/json.ts (parseJsonField/serializeJsonField)
2. ✅ React.lazy 路由级代码分割 (client/App.tsx)
3. ⏸️ plugin-api.ts → Hono RPC（大型重构，后续单独处理）
4. ⏸️ process.env 集中到 config.ts（大型重构，后续单独处理）
5. ⏸️ bundle 分析工具（后续单独处理）

### 二、CI/CD 全面改造（12 项完成）

#### 重写前的问题
- lint/typecheck `|| true` 导致质量门永远通过
- ci.yml + deploy.yml 双重部署冲突
- deploy.yml 无 CI 关卡，失败代码可直接上线
- 3 种不同 npm install 策略导致依赖树不一致
- 无 E2E 测试、无格式检查、无安全扫描、无并发控制

#### 改造后的 CI 管道
```
push/PR → quality (format+lint+typecheck+audit)
         → test (vitest --coverage)  ┐ (并行)
         → build                     ┘
         → e2e (playwright)
         → deploy (仅 main, CI 通过后触发)
```

#### 具体修复
1. 移除 `|| true`，lint/typecheck 真正拦截错误
2. ci.yml 移除 deploy job，避免双重部署
3. deploy.yml 改用 workflow_run 触发，CI 通过才部署
4. 统一 `npm ci --legacy-peer-deps` 安装策略
5. 新增 E2E 测试 job (playwright)
6. 新增 prettier --check 格式检查
7. 新增 npm audit 安全扫描
8. 新增 concurrency 并发控制
9. 新增 .github/dependabot.yml（npm + github-actions）
10. 覆盖率用 vitest run --coverage 强制执行阈值
11. 部署预留 db:migrate 步骤
12. deploy.yml 加 environment: production

### 三、验证结果（最终）
- **TypeScript**: 52 个预存错误，0 新增错误
- **测试**: 950 通过，0 失败（77 个测试文件）
- **覆盖率**: Lines 68.94% / Functions 57.11% / Branches 66.69% / Statements 70.24%
- **测试增量**: 742 → 950（+208 新测试），62 → 77 文件（+15 新测试文件）

### 四、新增文件清单
| 文件 | 用途 |
|------|------|
| src/server/utils/lru-cache.ts | LRU 缓存工具类 |
| src/server/utils/json.ts | JSON 序列化共享工具 |
| src/server/module-auth/__tests__/auth-service.test.ts | Auth 服务测试 (15 cases) |
| src/server/module-auth/__tests__/auth-routes.test.ts | Auth 路由测试 (24 cases) |
| src/shared/modules/plugins/schemas.ts | 插件类型统一定义 |
| src/server/module-plugin/services/plugin-utils.ts | 插件工具函数 |
| src/server/module-plugin/services/plugin-query-service.ts | 插件查询服务 |
| src/server/module-plugin/services/plugin-review-service.ts | 插件评论服务 |
| .github/dependabot.yml | Dependabot 配置 |

### 五、剩余待办
- [x] 补全客户端页面测试 (5 个页面) ✅ 61 个用例
- [x] 补全 Admin hooks 测试 (4 个) ✅ 35 个用例
- [x] 补全 Admin 页面测试 (4 个重点页面) ✅ 46 个用例
- [x] 拆分 MediaTestPage.tsx (524行) ✅ → 目录结构
- [x] 拆分 file-storage.ts (456行) ✅ → 3 文件
- [x] 拆分 RolesPage.tsx (330行) ✅ → 目录结构
- [x] 拆分 PluginReviewPage.tsx (392行) ✅ → 目录结构
- [ ] plugin-api.ts → Hono RPC 重构
- [ ] process.env 集中到 config.ts
- [ ] 添加 bundle 分析工具
- [ ] 修复 52 个预存 TypeScript 类型错误

### 六、第二轮优化完成（测试补全 + 文件拆分）

#### 新增测试 (208 个用例)
| 模块 | 文件 | 测试数 |
|------|------|--------|
| 客户端 | Home.test.tsx | 10 |
| 客户端 | Search.test.tsx | 10 |
| 客户端 | PluginDetail.test.tsx | 18 |
| 客户端 | Categories.test.tsx | 7 |
| 客户端 | CLI.test.tsx | 16 |
| Admin hooks | useAdminNotifications.test.tsx | 8 |
| Admin hooks | useAuditLogs.test.ts | 7 |
| Admin hooks | useConfig.test.tsx | 8 |
| Admin hooks | useRoles.test.ts | 12 |
| Admin pages | PluginReviewPage.test.tsx | 13 |
| Admin pages | RolesPage.test.tsx | 11 |
| Admin pages | UsersPage.test.tsx | 10 |
| Admin pages | PluginManagementPage.test.tsx | 12 |

#### 文件拆分
| 原文件 | 拆分后 |
|--------|--------|
| file-storage.ts (456行) | file-storage-core.ts + file-storage-signing.ts + file-storage.ts(桶导出) |
| PluginReviewPage.tsx (392行) | PluginReviewPage/ 目录 (index + Columns + DetailModal + RejectModal + ExpandedRow) |
| RolesPage.tsx (330行) | RolesPage/ 目录 (index + Columns + RoleFormModal + PermissionModal) |
| MediaTestPage.tsx (524行) | MediaTestPage/ 目录 (index + AvatarCard + SvgCard + DownloadCard) |

#### Bug 修复
- 测试 DB 缺少 `reject_reason` 列导致 131 个预存测试失败 → 已修复
