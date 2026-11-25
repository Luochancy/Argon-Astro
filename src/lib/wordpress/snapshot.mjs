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

  const registerMedia = async (id, sourceUrl) => {
    const url = String(sourceUrl || "").trim();
    if (!url || !isHttpUrl(url)) return url;
    if (map.has(url)) return map.get(url);
    const local = localMediaPath(id, url);
    map.set(url, local);
    if (client.download) await client.download(url, join(root, "public" + local));
    return local;
  };

  for (const item of [...posts, ...pages, ...moments]) {
    for (const media of item.media || []) {
      await registerMedia(media.id, media.sourceUrl);
    }
    if (item.featuredMediaUrl) {
      await registerMedia(item.featuredMediaId || 0, item.featuredMediaUrl);
    }
    for (const img of item.images || []) {
      await registerMedia(0, img);
    }
  }

  const remote = structuredClone(config || {});
  delete remote.comments;
  delete remote.source;

  if (remote.banner && isHttpUrl(remote.banner.backgroundUrl)) {
    remote.banner.backgroundUrl = await registerMedia(0, remote.banner.backgroundUrl);
  }
  if (remote.background && isHttpUrl(remote.background.url)) {
    remote.background.url = await registerMedia(0, remote.background.url);
  }
  if (remote.background && isHttpUrl(remote.background.darkUrl)) {
    remote.background.darkUrl = await registerMedia(0, remote.background.darkUrl);
  }
  if (remote.sidebar && isHttpUrl(remote.sidebar.authorImage)) {
    remote.sidebar.authorImage = await registerMedia(0, remote.sidebar.authorImage);
  }
  if (Array.isArray(remote.friendLinks)) {
    for (const link of remote.friendLinks) {
      if (link && isHttpUrl(link.avatar)) {
        link.avatar = await registerMedia(0, link.avatar);
      }
    }
  }

  const rewriteUrl = (url) => {
    if (!url) return url;
    if (map.has(url)) return map.get(url);
    return rewriteMediaUrls(url, map);
  };

  const ctx = createContext({
    rewriteUrl,
    posts: posts.map((item) => ({ id: item.slug || String(item.id), title: item.title })),
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
      writeFileSync(join(dir, (item.slug || item.id) + ".md"), frontMatter(matter) + rewritten);
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
  writeFileSync(marker, JSON.stringify({ writtenAt: new Date().toISOString(), posts: posts.length, pages: pages.length, shuoshuo: moments.length }));
  return { posts: posts.length, pages: pages.length, shuoshuo: moments.length };
}

export function snapshotFailed(root) {
  rmSync(join(root, ".cache", "snapshot-complete.json"), { force: true });
}
