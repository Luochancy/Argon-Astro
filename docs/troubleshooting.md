# 常见问题排查

## 1. 评论、验证码或阅读量接口返回 502

最常见原因是 WordPress 所在域名开启了 Cloudflare 免费版 **Bot Fight Mode**，Cloudflare 会拦截 Worker 发往 WordPress `/wp-json/argon-astro/v1/*` 的服务端请求。

排查顺序：
1. 检查 WordPress 所在域名的 Cloudflare **Security → Bots**，尝试关闭 Bot Fight Mode（或将 WordPress 源站放到不开启 Bot Fight Mode 的独立子域名）。
2. 检查 Cloudflare Worker 运行时密钥 `WP_URL`、`WP_USER`、`WP_APP_PASSWORD` 是否填写正确，账号是否有 `edit_posts` 权限。
3. 确认 WordPress 端 `Argon-Bridge` 插件已升级到最新并处于启用状态。

## 2. 评论区验证码显示不出来，或提交提示验证码错误

- 验证码接口 `/api/comments?captcha=1` 依赖 Worker 运行时密钥 `ARGON_CAPTCHA_SECRET`。在 Cloudflare Worker **Settings → Variables and Secrets** 添加 `ARGON_CAPTCHA_SECRET`（任意随机字符串）后刷新页面即可。
- 验证码题目可点击直接刷新。

## 3. 评论接口返回 503 / 409 / 429

- `503`：Worker 运行时缺少 `WP_URL`、`WP_USER` 或 `WP_APP_PASSWORD`。
- `409`：WordPress 检测到重复评论，修改评论内容后再发。
- `429`：短时间内发送评论过于频繁，稍等片刻再试。

## 4. 文章浏览量不显示或一直为 0

1. 确认 WordPress 已安装 `Argon-Bridge` `0.2.1` 及以上版本。
2. 在 WordPress 后台 **Argon → 内容与侧栏 → 文章 Meta 信息** 勾选「浏览量」并保存。
3. 到 **无头桥接与部署** 点击一次「立即触发一次构建部署」，构建完成后首页列表卡片和文章页均会自动显示并实时更新阅读量。

## 5. 文章、说说或新评论时间差 8 小时

- **文章 / 说说**：检查 WordPress **设置 → 常规 → 时区**（如「上海」或 `UTC+8`），构建时会自动同步该时区；纯本地模式在 `argon.config.yml` 的 `site.timezone` 设置 `Asia/Shanghai`。
- **评论时间**：升级 `Argon-Bridge` 到 `0.2.1+` 即可输出标准带 `Z` 的 UTC 时间戳（新版前端也会自动兼容旧插件格式）。

## 6. 分享链接、Canonical 或 Sitemap 指向 `example.com`

这是因为没有配置公开站点地址，沿用了 `argon.config.yml` 中的默认占位域名。

解决方式（任选其一）：
- 在 Cloudflare Workers 构建变量中添加 `SITE_URL=https://你的域名`（推荐，优先级最高）；
- 或在 WordPress 后台 **Argon → 内容与侧栏 → 站点信息与 SEO → 前端站点地址** 填写你的公开域名，然后重新触发构建。

## 7. 构建报 `Media download failed: 403`

通常是文章或设置里引用了开启防盗链的第三方图床（如对象存储 R2 / OSS）。新版同步脚本仅会镜像与 `WP_URL` 同源的媒体库图片，外链图床图片会保持原始 URL 不再尝试下载。

## 8. `prepare-build.mjs` 报错退出，或提示缺少 `theme-config.json`

- 提示缺少 `theme-config.json`：直接运行 `pnpm build`（或先执行 `node scripts/compile-config.mjs`）。
- 无头构建在 `prepare-build.mjs` 退出：说明 `ARGON_SOURCE=wordpress` 模式下 WordPress 快照拉取失败。请查看前一步 `sync-wordpress.mjs` 的报错，检查 `WP_URL`、`WP_USER`、`WP_APP_PASSWORD` 与 `argon-bridge` 插件状态。

## 9. `/api/deploy` 返回 401 或 409

- `401`：签名不匹配、未配置 `ARGON_DEPLOY_SECRET` 或请求时间戳与当前时间相差超过 5 分钟。
- `409`：重复提交了已使用过的 `X-Argon-Nonce`。

## 10. `pnpm check:no-cms` 报包含 CMS 域名

说明有同源链接或媒体地址未被改写为相对路径或 `/media/wp/`。注意若你在正式切换阶段将 `SITE_URL` 设为了与 `WP_URL` 相同的域名，校验脚本会自动放行公开域名本身，但仍会严格拦截 `wp-json`、`wp-admin` 和 `admin-ajax.php`。
