# 从 WordPress 迁移与本地写作指南

## 一、从原版 WordPress Argon 迁移（无头模式）

适合保留 WordPress 写文章和管评论，把前台换成静态站点加速与防打。

### 1. 安装并导入设置

1. 下载或打包 `argon-bridge.zip`（见 [Argon-Bridge](https://github.com/Luochancy/Argon-Bridge)），在 WordPress 后台「插件 → 安装插件 → 上传插件」安装并启用。
2. 进入左侧菜单 **Argon → 备份与导入**，点击 **从现有 Argon 主题选项一键导入**（或者粘贴原版 Argon 导出的配置 JSON）。
3. 进入 **Argon → 内容与侧栏**：
   - 在 **站点信息与 SEO** 填写 **前端站点地址 (Site URL)**（如果已在 Cloudflare 构建变量设置 `SITE_URL`，会以环境变量优先）；
   - 在 **文章 Meta 信息** 确认需要显示的项（如发布时间、编辑时间、浏览量、评论数、分类）。
4. 在 WordPress **用户 → 个人资料** 最下方创建一个 **应用程序密码**（账号需具备 `edit_posts` 权限），保存好用户名和密码。

### 2. 自动同步的内容（无需重复配置）

`Argon-Bridge` 会在构建时自动导出 WordPress 里的现有数据，不用手动搬运：

- **文章、独立页面与说说**：自动保留原版固定链接（包括 `/archives/123.html`、`/aboutme.html`、`/links.html` 等 `.html` 路径）和页面模板（`timeline.php` 归档页、`msgboard.php` 留言板、`shuoshuo.php` 说说页）。
- **导航菜单与作者链接**：自动读取 WordPress「外观 → 菜单」中绑定到 `toolbar_menu`、`leftbar_menu`、`leftbar_author_links`、`leftbar_friend_links` 位置的菜单与图标。
- **友情链接**：优先使用 Argon 设置中的友链；若留空则自动读取 WordPress 原生链接管理器（`wp_links` / Link Manager）里的全部友链。
- **侧栏小工具**：自动同步「外观 → 小工具」里的 `leftbar-tools`（左侧栏「功能」页签）、`leftbar-siteinfo-extra-tools`（概览卡片底部）和 `rightbar-tools`（三栏布局右侧栏）。
- **阅读量与时区**：阅读量自动兼容原版 Argon `views` meta 与 Post Views Counter 插件，前台支持实时自增；文章/说说时间按 WordPress「设置 → 常规 → 时区」渲染。
- **同源媒体图片**：WordPress 媒体库里的图片会自动同步到 `public/media/wp/` 并转成多尺寸 WebP；第三方图床链接保持原样直连。

### 3. 旧链接与原版功能兼容

迁移后原站外链和常用入口可直接沿用：

- 分类与标签旧链接：`/archives/tag/<slug>`、`/archive/tag/<slug>`、`/tag/<slug>`、`/archives/category/<slug>` 等自动映射到对应页面；
- 年月归档：自动生成 `/archives/date/YYYY/` 与 `/archives/date/YYYY/MM/`；
- RSS 订阅：`/feed`、`/feed/`、`/rss`、`/rss/` 自动返回 `/feed.xml`；
- 密码保护文章：静态产物与搜索索引绝不包含正文，前台输入密码后通过 `/api/post-unlock` 在线向 WordPress 校验解锁；
- 古登堡区块与原版 Argon 短代码（`[collapse]`、`[alert]`、`[friendlinks]`、`[github]`、`[timeline]`、`[tabs]`、`[progressbar]` 等）均在构建期自动渲染。

---

## 二、纯本地 Markdown 模式

不依赖 WordPress，直接在仓库里写 Markdown 即可。

1. 确保 `argon.config.yml` 中 `source: local`（默认值），按需修改站点标题、配色、菜单和 `comments.provider`。
2. 在对应目录新建 `.md` 文件：
   - 文章：`src/content/posts/`
   - 说说：`src/content/shuoshuo/`
   - 独立页面：`src/content/pages/`

### Frontmatter 字段说明

```yaml
---
title: 文章标题
date: 2026-11-26 12:00:00+08:00
modifiedDate: 2026-11-26 15:30:00+08:00 # 可选，最后编辑时间
description: 文章摘要                    # 可选
tags: [Argon, Astro]                     # 可选
categories: [随笔]                       # 可选
cover: /media/cover.webp                 # 可选，头图
sticky: false                            # 可选，置顶
draft: false                             # 可选，草稿不会发布
permalink: /archives/101.html            # 可选，自定义固定链接
password: ""                             # 可选，设置后本地构建期 AES-256-GCM 加密，正文不进入静态产物
passwordHint: "密码提示"                 # 可选
---
```

说说（`src/content/shuoshuo/`）额外支持：

```yaml
---
title: 可选标题
date: 2026-11-26 18:00:00+08:00
mood: 开心
sticky: false
images:
  - /media/photo1.webp
---
```

独立页面（`src/content/pages/`）可通过 `template` 指定特殊模板：`page`（默认）、`timeline`（归档时间轴）、`message`（留言板，默认开启评论）、`shuoshuo`（说说聚合页）。
