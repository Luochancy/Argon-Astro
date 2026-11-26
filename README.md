# Argon Astro

基于 Astro 移植的 [Argon](https://github.com/solstice23/argon-theme) 静态博客主题，支持**纯本地 Markdown** 和**无头 WordPress** 两种内容源。配套 WordPress 控制端插件见 [Argon-Bridge](https://github.com/Luochancy/Argon-Bridge)。

## 主要功能

- 保留原版 Argon 视觉样式、配色器、夜间/暗黑模式、PJAX 过渡、目录折叠、代码高亮、数学公式、灯箱、友链、归档时间轴与说说。
- 兼容 WordPress 固定链接（含 `.html` 结尾）、古登堡区块与原版 Argon 短代码，自动兼容旧标签/分类链接、年月归档与 `/feed` `/rss`。
- 无头模式下通过私有边缘代理桥接实时评论（含回复、表情、Markdown、悄悄话、编辑历史、算术验证码与回复邮件通知）、评论/说说点赞、文章阅读量与密码保护文章在线解锁；静态产物不暴露 WordPress 后台地址。
- 构建期自动将同步的 WordPress 图片转为多尺寸 WebP（`480w / 960w / 1440w`），日常按设备宽度加载小图，点击灯箱放大时再按需加载原尺寸高清 WebP。
- 内置 `robots.txt`、`sitemap.xml`、`feed.xml`、`llms.txt`、`agent-index.json` 以及 `Accept: text/markdown` 内容协商。

## 快速开始

### 1. 纯本地 Markdown 模式

修改 [argon.config.yml](argon.config.yml)（默认 `source: local`），文章放在 `src/content/posts/`，说说放在 `src/content/shuoshuo/`，独立页面放在 `src/content/pages/`：

```bash
pnpm install
pnpm dev
```

### 2. 无头 WordPress + Cloudflare Workers 模式

1. 在 WordPress 后台安装并启用 [Argon-Bridge](https://github.com/Luochancy/Argon-Bridge)，在 **Argon → 备份与导入** 导入原版设置，并在 **用户 → 个人资料** 创建应用程序密码。
2. 在 Cloudflare Dashboard → **Workers & Pages → Create Worker → Connect to Git** 连接本仓库：

| 配置项 | 值 |
| --- | --- |
| Build command | `pnpm build` |
| Deploy command | `npx wrangler deploy` |

3. 配置环境变量：
   - **Build variables**：`NODE_VERSION=22`、`ARGON_SOURCE=wordpress`、`SITE_URL`（公开访问地址，如 `https://blog.example.com`）、`WP_URL`、`WP_USER`、`WP_APP_PASSWORD`
   - **Runtime Secrets**：`WP_URL`、`WP_USER`、`WP_APP_PASSWORD`、`ARGON_CAPTCHA_SECRET`（任意随机字符串，用于评论验证码）
4. 如需发文自动重建，在 Worker 的 **Builds → Deploy Hooks** 创建钩子，填入 WordPress 后台 **Argon → 无头桥接与部署 → CI / 构建部署钩子**。

详细步骤、其他托管平台（Cloudflare Pages / Vercel / Netlify / GitHub Actions）与常见踩坑请看下方文档。

## 常用命令

```bash
pnpm dev           # 本地开发预览
pnpm build         # 编译配置、同步 WordPress（若启用）并构建 dist/
pnpm preview       # 本地预览构建产物
pnpm test          # 运行全部单元与无头 E2E 测试
pnpm check:no-cms  # 检查 dist/ 不含 CMS 地址与后台路径
```

## 评论系统

在 [argon.config.yml](argon.config.yml) 的 `comments.provider` 中选择：`wordpress`（配合 Argon-Bridge）、`giscus`、`waline`、`twikoo`、`artalk` 或 `none`。

## 文档

- [完整部署指南](docs/deploy.md)（Cloudflare Workers / Pages / Vercel / Netlify / GitHub Actions 与环境变量说明）
- [从 WordPress 迁移与本地写作指南](docs/migration.md)
- [常见问题排查](docs/troubleshooting.md)
- [许可证](docs/license.md)

## 许可证

GPL-3.0-or-later，基于 [solstice23/argon-theme](https://github.com/solstice23/argon-theme)。
