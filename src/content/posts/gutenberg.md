---
title: 古登堡示例
date: 2026-11-11
description: 用古登堡区块注释保存的文章，在构建期渲染，不在浏览器里请求 WordPress。
tags: [Argon]
categories: [笔记]
---

<!-- wp:paragraph -->
<p>这段文字来自古登堡段落区块。[ref id=local]本地参考，不含 CMS 地址[/ref] [ref id=local]本地参考，不含 CMS 地址[/ref]</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":2} -->
<h2 class="wp-block-heading">折叠</h2>
<!-- /wp:heading -->

<!-- wp:shortcode -->
[collapse title="构建期折叠" collapsed="true"]这里的短代码在构建时展开。[/collapse]
<!-- /wp:shortcode -->

<!-- wp:image {"url":"/argon/donate.svg","alt":"打赏"} /-->

<!-- wp:rss {"feedURL":"https://cms.example/wp-json/feed"} /-->
<!-- wp:calendar /-->
<!-- wp:query {"postsToShow":2} /-->
<!-- wp:latest-posts {"postsToShow":2} /-->

<!-- wp:heading {"level":2} -->
<h2 class="wp-block-heading">无头构建与静态渲染流程</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>在 WordPress 无头模式下，所有古登堡区块、Argon 短代码、文章分类、标签、说说与同源媒体资源都会在构建阶段同步到 Astro 并编译为纯静态 HTML，部署到 Serverless 平台后浏览器不再向 WordPress 后台发起任何请求。</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">代码块与多主题高亮</h3>
<!-- /wp:heading -->

<!-- wp:code -->
<pre class="wp-block-code"><code class="language-ts">export async function buildSite(source: "local" | "wordpress") {
  const entries = await loadContent(source);
  return renderStaticRoutes(entries);
}
</code></pre>
<!-- /wp:code -->

<!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">提示框与引用排版</h3>
<!-- /wp:heading -->

<!-- wp:quote -->
<blockquote class="wp-block-quote"><p>静态站点同样保留完整的 Argon 动效、侧栏文章目录、右下角阅读进度指示器与深浅色主题无缝切换。</p></blockquote>
<!-- /wp:quote -->

<!-- wp:paragraph -->
<p>当文章正文高度超过一屏时，向下滚动阅读即可在右下角浮动按钮底部看到原版「阅读进度」百分比按钮与内部填充条，同时左侧栏文章目录也会随滚动自动高亮当前章节。</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":2} -->
<h2 class="wp-block-heading">评论与扩展能力</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>评论系统支持在构建配置中自由切换第三方评论（Giscus / Waline / Twikoo / Artalk）或通过私有签名接口对接 WordPress 原生评论，并完整支持表情键盘、Markdown、悄悄话与评论点赞。</p>
<!-- /wp:paragraph -->
