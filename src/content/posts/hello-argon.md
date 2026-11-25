---
title: 你好，Argon
date: 2026-11-01
description: 这是本地模式下的第一篇文章，不需要 WordPress 也能完整浏览。
tags: [Argon, Astro]
categories: [笔记]
sticky: true
---

这是从 WordPress Argon 移植到 Astro 的本地文章。主题色、侧栏、Banner 打字和夜间模式都由 `argon.config.yml` 控制。

行内公式 $E=mc^2$ 在构建期由本地 KaTeX 渲染。

## 本地内容

文章、说说和页面都放在 `src/content`。构建之后，浏览器不会请求无头 CMS。

## 一段代码

```ts
export const source = "local";
```
