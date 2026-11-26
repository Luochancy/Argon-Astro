# 部署指南

执行 `pnpm build` 后，静态产物会输出到 `dist/` 目录。

## Cloudflare Workers（推荐）

仓库根目录已包含 `wrangler.toml`、`platform/cloudflare/worker.mjs` 与 `public/_headers`，直接支持 **Cloudflare Workers with Static Assets**：

- 静态资源（`/_astro/*`、`/argon/*`、`/media/*`、`feed.xml`、`sitemap.xml` 等）由 Static Assets 直接返回，不消耗 Worker 请求次数；
- 页面路由支持原版 `.html` 固定链接、旧分类/标签路径映射、`/feed` `/rss` 转发，以及 `Accept: text/markdown` 内容协商；
- `/api/comments`、`/api/comment-upvote`、`/api/shuoshuo-upvote`、`/api/post-unlock`、`/api/views`、`/api/github`、`/api/bing`、`/api/deploy` 由 Worker 私有代理处理。

### 配置步骤

1. 打开 Cloudflare Dashboard → **Workers & Pages → Create Worker → Connect to Git**，选择本仓库：
   - **Build command**：`pnpm build`
   - **Deploy command**：`npx wrangler deploy`
2. 在 **Settings → Build → Variables and secrets** 添加构建环境变量：
   - `NODE_VERSION`：`22`
   - `ARGON_SOURCE`：`wordpress`（纯本地 Markdown 模式填 `local` 或留空）
   - `SITE_URL`：对外公开访问的完整地址，例如 `https://blog.example.com`（决定 Canonical、Sitemap、RSS、JSON-LD 和默认分享地址）
   - `WP_URL`：WordPress 站根地址，例如 `https://cms.example.com`
   - `WP_USER`：具备 `edit_posts` 权限的 WordPress 用户名
   - `WP_APP_PASSWORD`：该用户在「用户 → 个人资料」生成的应用程序密码
3. 在 **Settings → Variables and Secrets** 添加运行时密钥（用于评论、点赞、阅读量、加密文章解锁）：
   - `WP_URL`、`WP_USER`、`WP_APP_PASSWORD`
   - `ARGON_CAPTCHA_SECRET`：任意随机字符串，用于签发评论算术验证码
   - `ARGON_DEPLOY_SECRET`（可选）：使用自定义 Webhook 调 `/api/deploy` 时的 HMAC 密钥
4. 配置自动重建（可选）：在 Worker 的 **Builds → Deploy Hooks** 新建一个 Deploy Hook，将生成的 URL 填入 WordPress 后台 **Argon → 无头桥接与部署 → CI / 构建部署钩子 → Cloudflare (Workers / Pages)**。之后在 WordPress 发文章、改设置都会自动触发重新构建。

### 绑定正式域名

在 Worker 的 **Settings → Domains & Routes** 添加你的正式域名后，记得把构建环境变量中的 `SITE_URL`（或 WordPress 后台 **Argon → 内容与侧栏 → 站点信息与 SEO → 前端站点地址**）改成正式域名，再触发一次构建。

### 如果 WordPress 也套了 Cloudflare

Cloudflare 免费版的 **Bot Fight Mode** 可能会拦截 Worker 发往 WordPress `/wp-json/argon-astro/v1/*` 的子请求，导致前台评论、点赞或阅读量返回 502。如果遇到这种情况，在 WordPress 所在域名的 **Security → Bots** 关闭 Bot Fight Mode，或把 WordPress 放到独立子域名（如 `cms.example.com`）单独管理安全策略。

---

## 其他平台（Cloudflare Pages / Vercel / Netlify）

仓库同样提供了对应的 Serverless 函数入口，包含全部 8 个接口（`comments`、`comment-upvote`、`shuoshuo-upvote`、`post-unlock`、`views`、`github`、`bing`、`deploy`）：

| 平台 | 函数入口目录 |
| --- | --- |
| Cloudflare Pages | `platform/cloudflare/functions/api/` |
| Vercel | `platform/vercel/api/` |
| Netlify | `platform/netlify/functions/` |

部署时按同样规则配置构建环境变量与运行时密钥即可。

## GitHub Actions

仓库自带 `.github/workflows/deploy.yml`，支持 `push`、手动触发，以及 WordPress 端通过 `repository_dispatch`（事件名 `argon-config`）触发构建。

在 GitHub 仓库的 **Settings → Secrets and variables → Actions** 配置：

- **Variables**：`ARGON_SOURCE=wordpress`、`SITE_URL`
- **Secrets**：`WP_URL`、`WP_USER`、`WP_APP_PASSWORD`

在 WordPress 后台 **Argon → 无头桥接与部署 → CI / 构建部署钩子** 选择 **GitHub Actions**，填入 `owner/repo` 和具备 `repo` 权限的 Personal Access Token 即可。

---

## 构建期多尺寸 WebP 图片优化

无头同步 WordPress 同源媒体库图片时，构建脚本默认会自动用 `sharp` 处理 PNG / JPG / JPEG / BMP / TIFF：

- 保留一份**原尺寸高画质 WebP 主图**（`public/media/wp/<id>-<name>.webp`）；
- 自动生成小于原图宽度的响应式尺寸（默认 `480w`、`960w`、`1440w`）；
- 页面正常浏览时通过 `srcset` / `sizes` 只加载适配当前设备的尺寸；只有点击图片打开灯箱或 Zoomify 放大时，才在后台按需加载原尺寸高清 WebP；
- GIF 动图、SVG、ICO、已是 WebP/AVIF 的图片以及外链图床图片保持原样；站点图标 `site.icon` 保留原格式以兼容 `apple-touch-icon`。

---

## 环境变量速查表

| 变量名 | 生效阶段 | 说明 |
| --- | --- | --- |
| `ARGON_SOURCE` | 构建期 | `local` 或 `wordpress`，优先级高于 `argon.config.yml` |
| `SITE_URL` | 构建期 | 公开访问域名（如 `https://blog.example.com`），也可写 `ARGON_SITE_URL` |
| `WP_URL` | 构建期 + 运行时 | WordPress 站点根地址（末尾无需斜杠） |
| `WP_USER` | 构建期 + 运行时 | 具备 `edit_posts` 权限的 WordPress 用户名 |
| `WP_APP_PASSWORD` | 构建期 + 运行时 | WordPress 应用程序密码 |
| `ARGON_IMAGE_WEBP` | 构建期 | 默认开启；设为 `false` 关闭自动 WebP 与多尺寸变体生成 |
| `ARGON_IMAGE_WEBP_QUALITY` | 构建期 | 可选，响应式 WebP 压缩质量，默认 `82` |
| `ARGON_IMAGE_WIDTHS` | 构建期 | 可选，响应式宽度列表，默认 `480,960,1440` |
| `ARGON_CAPTCHA_SECRET` | 运行时 | 评论算术验证码签名密钥（任意随机字符串） |
| `ARGON_CAPTCHA` | 运行时 | 可选；设 `false` 可强制关闭服务端验证码校验 |
| `ARGON_DEPLOY_SECRET` | 运行时 | 可选，`/api/deploy` 的 HMAC-SHA256 验签密钥 |
| `DEPLOY_HOOK_URL` | 运行时 | 可选，`/api/deploy` 验签通过后转发的下游构建钩子 URL |
| `ARGON_ROBOTS_TXT` | 运行时 | 可选，直接覆盖 `/robots.txt` 返回内容 |
| `ARGON_LLMS_TXT` | 运行时 | 可选，直接覆盖 `/llms.txt` 返回内容 |
| `ARGON_LLMS_FULL_TXT` | 运行时 | 可选，直接覆盖 `/llms-full.txt` 返回内容 |
