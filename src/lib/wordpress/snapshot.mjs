import { createHash } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createContext, renderDocument } from "../blocks/index.mjs";
import { renderPasswordForm } from "../crypto-post.mjs";
import { applyReferences } from "../references.mjs";

function yamlValue(value) {
  if (Array.isArray(value) || (value !== null && typeof value === "object")) {
    return JSON.stringify(value);
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(String(value ?? ""));
}

function frontMatter(data) {
  const lines = ["---"];
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === "" || value === null) continue;
    lines.push(key + ": " + yamlValue(value));
  }
  lines.push("---", "");
  return lines.join("\n");
}

function isHttpUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value.trim());
}

function shouldMirrorUrl(value, origin) {
  const url = String(value || "").trim();
  if (!isHttpUrl(url)) return false;
  if (!origin) return true;
  try {
    return new URL(url).origin === origin;
  } catch {
    return false;
  }
}

function safeSlug(slug, fallback) {
  let raw = String(slug || "").trim();
  if (raw) {
    try {
      raw = decodeURIComponent(raw);
    } catch {
      // Keep raw slug if percent-encoding is malformed.
    }
  }
  const clean = raw
    .replace(/[\\/:"*?<>|\x00-\x1f]+/g, "-")
    .replace(/^\.+|\.+$/g, "")
    .trim();
  if (!clean) return String(fallback || "entry");
  if (Buffer.byteLength(clean, "utf8") > 180) {
    const hash = createHash("sha1").update(clean).digest("hex").slice(0, 8);
    return String(fallback || "entry") + "-" + hash;
  }
  return clean;
}

async function runWithConcurrency(items, concurrency, worker) {
  if (!items.length) return;
  let index = 0;
  const limit = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (index < items.length) {
        const current = items[index++];
        await worker(current);
      }
    }),
  );
}

export function localMediaPath(id, sourceUrl) {
  const clean = String(sourceUrl || "").split("?")[0];
  const name = clean.split("/").pop() || "file";
  const safe = name.replace(/[^\w.\-]+/g, "-");
  const prefix = id ? String(id) : createHash("sha1").update(String(sourceUrl || "")).digest("hex").slice(0, 8);
  return "/media/wp/" + prefix + "-" + safe;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function rewriteMediaUrls(text, map) {
  let output = String(text || "");
  const entries = [...map.entries()].sort((a, b) => b[0].length - a[0].length);
  for (const [from, to] of entries) {
    output = output.split(from).join(to);
    const clean = from.split("?")[0];
    const match = clean.match(/^(.*?)(?:-\d+x\d+)?(\.[a-z0-9]+)$/i);
    if (match) {
      const pattern = new RegExp(
        escapeRegExp(match[1]) + "(?:-\\d+x\\d+)?" + escapeRegExp(match[2]) + "(?:\\?[^\"'\\s<>)]*)?",
        "gi",
      );
      output = output.replace(pattern, to);
    }
  }
  return output;
}

export async function writeSnapshot(client, root) {
  const marker = join(root, ".cache", "snapshot-complete.json");
  rmSync(marker, { force: true });
  const config = await client.getJson("/config");
  const posts = await client.list("posts");
  const pages = await client.list("pages");
  const moments = await client.list("shuoshuo");
  const map = new Map();
  const downloads = [];
  const origin = typeof client.origin === "string" && client.origin.trim() ? client.origin.trim() : "";

  const registerMedia = (id, sourceUrl) => {
    const url = String(sourceUrl || "").trim();
    if (!shouldMirrorUrl(url, origin)) return url;
    if (map.has(url)) return map.get(url);
    const local = localMediaPath(id, url);
    map.set(url, local);
    if (client.download) {
      downloads.push({ url, target: join(root, "public" + local) });
    }
    return local;
  };

  for (const media of (config && Array.isArray(config.media) ? config.media : [])) {
    registerMedia(media.id, media.sourceUrl);
  }

  for (const item of [...posts, ...pages, ...moments]) {
    for (const media of item.media || []) {
      registerMedia(media.id, media.sourceUrl);
    }
    if (item.featuredMediaUrl) {
      registerMedia(item.featuredMediaId || 0, item.featuredMediaUrl);
    }
    for (const img of item.images || []) {
      registerMedia(0, img);
    }
  }

  const remote = structuredClone(config || {});
  delete remote.comments;
  delete remote.source;
  delete remote.media;

  if (remote.banner && shouldMirrorUrl(remote.banner.backgroundUrl, origin)) {
    remote.banner.backgroundUrl = registerMedia(0, remote.banner.backgroundUrl);
  }
  if (remote.background && shouldMirrorUrl(remote.background.url, origin)) {
    remote.background.url = registerMedia(0, remote.background.url);
  }
  if (remote.background && shouldMirrorUrl(remote.background.darkUrl, origin)) {
    remote.background.darkUrl = registerMedia(0, remote.background.darkUrl);
  }
  if (remote.toolbar && shouldMirrorUrl(remote.toolbar.icon, origin)) {
    remote.toolbar.icon = registerMedia(0, remote.toolbar.icon);
  }
  if (remote.sidebar && shouldMirrorUrl(remote.sidebar.authorImage, origin)) {
    remote.sidebar.authorImage = registerMedia(0, remote.sidebar.authorImage);
  }
  if (remote.article && shouldMirrorUrl(remote.article.donateQr, origin)) {
    remote.article.donateQr = registerMedia(0, remote.article.donateQr);
  }
  if (Array.isArray(remote.friendLinks)) {
    for (const link of remote.friendLinks) {
      if (link && shouldMirrorUrl(link.avatar, origin)) {
        link.avatar = registerMedia(0, link.avatar);
      }
    }
  }

  if (client.download && downloads.length > 0) {
    const concurrency = Number(client.concurrency) > 0 ? Number(client.concurrency) : 6;
    await runWithConcurrency(downloads, concurrency, ({ url, target }) => client.download(url, target));
  }

  const rewriteUrl = (url) => {
    if (!url) return url;
    if (map.has(url)) return map.get(url);
    return rewriteMediaUrls(url, map);
  };

  const ctx = createContext({
    rewriteUrl,
    posts: posts.map((item) => ({ id: safeSlug(item.slug, item.id), title: item.title })),
    categories: [...new Set(posts.flatMap((item) => item.categories || []))],
    tags: [...new Set(posts.flatMap((item) => item.tags || []))],
  });

  const resolveCover = (item) => {
    if (item.featuredMediaUrl) return rewriteUrl(item.featuredMediaUrl);
    if (item.featuredMediaId && Array.isArray(item.media)) {
      const found = item.media.find((m) => Number(m.id) === Number(item.featuredMediaId));
      if (found && found.sourceUrl) return rewriteUrl(found.sourceUrl);
    }
    return "";
  };

  const writeGroup = (kind, items, folder) => {
    const dir = join(root, ".cache", "content", folder);
    mkdirSync(dir, { recursive: true });
    for (const item of items) {
      const locked = Boolean(item.protected || item.password || item.passwordProtected);
      const source = locked ? "" : (item.raw || item.rendered || item.content || "");
      const referenced = locked ? { html: "", list: "" } : applyReferences(source, config.article && config.article.referenceTitle);
      const html = locked
        ? renderPasswordForm({ id: String(item.id || item.slug || "post"), hint: item.passwordHint || "", payload: null, mode: "wordpress" })
        : renderDocument(referenced.html, ctx) + referenced.list;
      const rewritten = rewriteMediaUrls(html, map);
      const matter = {
        title: item.title,
        date: item.date,
        modifiedDate: item.modifiedDate || item.modified || "",
        description: item.excerpt || "",
        cover: resolveCover(item),
        tags: item.tags || [],
        categories: item.categories || [],
        sticky: Boolean(item.sticky),
        wpId: item.id,
        upvotes: Number(item.upvotes || 0),
        commentCount: item.commentCount || 0,
        comments: Array.isArray(item.comments) ? item.comments : [],
        mood: item.mood || "",
        images: (item.images || [])
          .map((src) => rewriteUrl(src))
          .filter((src) => src && !String(src).includes("wp-json")),
        template: kind === "pages" ? (item.template || "page") : (item.template || ""),
        locked,
      };
      writeFileSync(join(dir, safeSlug(item.slug, item.id) + ".md"), frontMatter(matter) + rewritten);
    }
  };

  writeGroup("posts", posts, "posts");
  writeGroup("pages", pages, "pages");
  writeGroup("shuoshuo", moments, "shuoshuo");
  mkdirSync(join(root, ".cache"), { recursive: true });
  writeFileSync(join(root, ".cache", "wp-theme.json"), JSON.stringify(remote, null, 2));
  writeFileSync(join(root, ".cache", "content", "taxonomies.json"), JSON.stringify({
    categories: ctx.categories,
    tags: ctx.tags,
  }, null, 2));
  writeFileSync(join(root, ".cache", "content", "media-manifest.json"), JSON.stringify([...map.entries()], null, 2));
  writeFileSync(marker, JSON.stringify({ writtenAt: new Date().toISOString(), posts: posts.length, pages: pages.length, shuoshuo: moments.length, media: downloads.length }));
  return { posts: posts.length, pages: pages.length, shuoshuo: moments.length, media: downloads.length };
}

export function snapshotFailed(root) {
  rmSync(join(root, ".cache", "snapshot-complete.json"), { force: true });
}
