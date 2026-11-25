# 常见问题

## 缺少 `theme-config.json`

运行 `pnpm build` 或先执行 `node scripts/compile-config.mjs` 生成 `src/generated/theme-config.json`。

## 无头构建报错退出（`prepare-build.mjs`）

`ARGON_SOURCE=wordpress`（或 `source: wordpress`）需要完整的 WordPress 快照。请检查 `WP_URL`、`WP_USER`、`WP_APP_PASSWORD` 是否正确，以及 WordPress 端是否已启用 `argon-bridge` 插件，然后重新执行 `pnpm build`。

## 评论或点赞接口返回 503

边缘函数未配置完整的运行时环境变量。请在 Cloudflare Workers / Vercel / Netlify 的 Runtime Secrets 中补充 `WP_URL`、`WP_USER`、`WP_APP_PASSWORD`（以及 `ARGON_CAPTCHA_SECRET`）。

## `/api/deploy` 返回 401 或 409

- `401`：签名不匹配、缺少 `ARGON_DEPLOY_SECRET` 或时间戳超出 5 分钟有效期。
- `409`：重复提交了已使用过的 `X-Argon-Nonce`。

## `pnpm check:no-cms` 报含 CMS 域名

说明文章或配置中存在未被改写为 `/media/wp/` 的 CMS 链接。检查 `scripts/sync-wordpress.mjs` 的 URL 改写规则并补充用例到 `tests/snapshot.test.mjs`。
