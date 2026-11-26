# Argon Astro

基于 Astro 的 [Argon](https://github.com/solstice23/argon-theme) 静态博客主题，支持纯本地 Markdown 与无头 WordPress 双模式。配套 WordPress 插件见 [Argon-Bridge](https://github.com/Luochancy/Argon-Bridge)。

## 本地开发

编辑 [argon.config.yml](argon.config.yml)，在 `src/content/` 下编写 `posts/`、`shuoshuo/`、`pages/`：

```bash
pnpm install
pnpm dev
```

常用命令：

```bash
pnpm build         # 编译配置、同步内容（若为 wordpress 模式）并构建 dist/
pnpm preview       # 预览 dist/
pnpm test          # 运行测试
pnpm check:no-cms  # 检查静态产物不含 CMS 直连
```

## 无头 WordPress + Cloudflare Workers 部署

1. 在 WordPress 安装并启用 [Argon-Bridge](https://github.com/Luochancy/Argon-Bridge)，在「用户 → 个人资料」创建应用程序密码。
2. 在 Cloudflare Dashboard → **Workers & Pages → Create Worker → Connect to Git** 连接本仓库：

| 配置项 | 值 |
| --- | --- |
| Build command | `pnpm build` |
| Deploy command | `npx wrangler deploy` |

- **Build variables**：`ARGON_SOURCE=wordpress`、`WP_URL`、`WP_USER`、`WP_APP_PASSWORD`、`SITE_URL`（可选：`ARGON_IMAGE_WEBP`、`ARGON_IMAGE_WEBP_QUALITY`、`ARGON_IMAGE_WIDTHS`）
- **Runtime Secrets**：`WP_URL`、`WP_USER`、`WP_APP_PASSWORD`、`ARGON_CAPTCHA_SECRET`（可选：`ARGON_DEPLOY_SECRET`、`ARGON_ROBOTS_TXT`、`ARGON_LLMS_TXT`、`ARGON_LLMS_FULL_TXT`）
- **构建期响应式 WebP**：默认自动将同步的 WordPress 图片转为多尺寸 WebP（`480w / 960w / 1440w`），日常浏览按设备加载合适尺寸，点击灯箱放大时再无感加载最高清晰度原尺寸 WebP。
- **自动重建**：在 Worker 的 **Builds → Deploy Hooks** 创建钩子 URL，填入 WordPress 后台 **Argon → 无头桥接与部署 → CI / 构建部署钩子 → Cloudflare (Workers / Pages)**。

## 评论系统

在 [argon.config.yml](argon.config.yml) 的 `comments.provider` 中配置：`wordpress`、`giscus`、`waline`、`twikoo`、`artalk` 或 `none`。

## 更多文档

- [部署指南](docs/deploy.md)
- [从 WordPress 迁移](docs/migration.md)
- [常见问题](docs/troubleshooting.md)
- [许可证](docs/license.md)

## 许可证

GPL-3.0-or-later，基于 [solstice23/argon-theme](https://github.com/solstice23/argon-theme)。
