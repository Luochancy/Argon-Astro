# 从 WordPress Argon 迁移

## 无头 WordPress 模式

1. 在 WordPress 后台安装并启用 [Argon-Bridge](https://github.com/Luochancy/Argon-Bridge)（上传打包的 `argon-bridge.zip` 或放置到 `wp-content/plugins/argon-bridge`）。
2. 打开左侧菜单 **Argon → 导入与导出**，点击 **从现有 Argon 主题选项一键导入**（或粘贴原版 Argon 导出的 JSON）。
3. 在 **用户 → 个人资料** 为具备 `edit_posts` 权限的账号创建应用程序密码。
4. 在构建环境中设置 `ARGON_SOURCE=wordpress`、`WP_URL`、`WP_USER`、`WP_APP_PASSWORD`。
5. 运行 `pnpm build`（或推送到 Cloudflare Workers / GitHub Actions 自动构建）。

构建期会自动拉取文章、页面、说说、已发布评论和同源媒体图片到 `public/media/wp/`，并在静态构建时渲染古登堡区块与短代码。

## 纯本地模式

1. 保持 `argon.config.yml` 中 `source: local`。
2. 将文章放入 `src/content/posts/`，说说放入 `src/content/shuoshuo/`，页面放入 `src/content/pages/`。
3. 在 `argon.config.yml` 中配置外观与 `comments.provider`。
