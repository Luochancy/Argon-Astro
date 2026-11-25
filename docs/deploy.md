# 部署指南

静态产物输出在 `dist/`：

```bash
pnpm build
```

## Cloudflare Workers（推荐）

仓库已包含 `wrangler.toml`、`platform/cloudflare/worker.mjs` 与 `public/_headers`，直接支持 **Cloudflare Workers with Static Assets**：

- 静态资源（`/_astro/*`、`/argon/*`、`/media/*` 等）由 Static Assets 直接分发；
- 页面路由支持 `Accept: text/markdown` 内容协商（普通浏览器返回 HTML，AI 智能体协商返回预构建 Markdown）；
- `/api/comments`、`/api/comment-upvote`、`/api/shuoshuo-upvote`、`/api/deploy` 由 Worker 处理。

在 Cloudflare Dashboard → **Workers & Pages → Create Worker → Connect to Git** 配置：

- **Build command**：`pnpm build`
- **Deploy command**：`npx wrangler deploy`
- **Build variables**：`ARGON_SOURCE=wordpress`、`WP_URL`、`WP_USER`、`WP_APP_PASSWORD`
- **Runtime Secrets**：`WP_URL`、`WP_USER`、`WP_APP_PASSWORD`、`ARGON_CAPTCHA_SECRET`、`ARGON_DEPLOY_SECRET`

在 Worker 的 **Builds → Deploy Hooks** 创建部署钩子，填入 WordPress 后台 **Argon → 无头桥接与部署 → CI / 构建部署钩子 → Cloudflare (Workers / Pages)** 即可自动触发重建。

## Cloudflare Pages / Vercel / Netlify

其他平台可使用对应函数入口：

| 平台 | 入口目录 |
| --- | --- |
| Cloudflare Pages | `platform/cloudflare/functions/api/` |
| Vercel | `platform/vercel/api/` |
| Netlify | `platform/netlify/functions/` |

各平台同样需要配置 `WP_URL`、`WP_USER`、`WP_APP_PASSWORD`、`ARGON_CAPTCHA_SECRET`（以及可选的 `ARGON_DEPLOY_SECRET`）。

## GitHub Actions

`.github/workflows/deploy.yml` 监听 `push`、`workflow_dispatch` 与 `repository_dispatch`（事件名 `argon-config`）。

在仓库 Secrets / Variables 中配置：

- Variables：`ARGON_SOURCE=wordpress`
- Secrets：`WP_URL`、`WP_USER`、`WP_APP_PASSWORD`

在 WordPress 后台选择 **GitHub Actions** 并填写 `owner/repo` 与 Personal Access Token 即可触发。

## 环境变量说明

| 变量 | 用途 |
| --- | --- |
| `ARGON_SOURCE` | `local` 或 `wordpress`，优先级高于 `argon.config.yml` |
| `WP_URL` | WordPress 站点根地址（例如 `https://cms.example.com`） |
| `WP_USER` | 具备 `edit_posts` 权限的 WordPress 用户名 |
| `WP_APP_PASSWORD` | WordPress 应用程序密码 |
| `ARGON_CAPTCHA_SECRET` | 评论算术验证码 HMAC 签名密钥 |
| `ARGON_DEPLOY_SECRET` | 自定义 `/api/deploy` Webhook HMAC-SHA256 验签密钥 |
| `ARGON_ROBOTS_TXT` | 可选，Serverless 运行时注入/覆写 `/robots.txt` 内容 |
| `ARGON_LLMS_TXT` | 可选，Serverless 运行时注入/覆写 `/llms.txt` 内容 |
| `ARGON_LLMS_FULL_TXT` | 可选，Serverless 运行时注入/覆写 `/llms-full.txt` 内容 |
