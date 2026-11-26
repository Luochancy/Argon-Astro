// Build content entries from local src/content/ or headless .cache/content/
// into src/generated/entries.json and src/generated/unknown-blocks.json.
import { createRequire } from "node:module";
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { createContext, renderDocument } from "../src/lib/blocks/index.mjs";
import { entryUrl } from "../src/lib/content/urls.mjs";
import { encryptPostHtml, renderPasswordForm } from "../src/lib/crypto-post.mjs";
import { renderMarkdown } from "../src/lib/markdown.mjs";
import { protectMath, restoreMath } from "../src/lib/math.mjs";
import { pangu } from "../src/lib/pangu.mjs";
import { applyReferences } from "../src/lib/references.mjs";

const require = createRequire(import.meta.url);
const { parse } = require("yaml");
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function statSafe(path) {
  try { return statSync(path).isDirectory(); } catch { return false; }
}

function walk(dir) {
  if (!statSafe(dir)) return [];
  const files = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) files.push(...walk(path));
    else if (name.endsWith(".md")) files.push(path);
  }
  return files;
}

function readEntry(file, kind, base) {
  const raw = readFileSync(file, "utf8");
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  const data = match ? parse(match[1]) || {} : {};
  const body = match ? match[2] : raw;
  const id = relative(base, file).replace(/\\/g, "/").replace(/\.md$/, "");
  return {
    id,
    kind,
    title: String(data.title ?? ""),
    date: data.date ? new Date(data.date).toISOString() : new Date(0).toISOString(),
    modifiedDate: data.modifiedDate ? new Date(data.modifiedDate).toISOString() : "",
    description: String(data.description ?? ""),
    permalink: data.permalink ? String(data.permalink) : "",
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    categories: Array.isArray(data.categories) ? data.categories.map(String) : [],
    cover: data.cover ? String(data.cover) : "",
    sticky: Boolean(data.sticky),
    draft: Boolean(data.draft),
    wpId: typeof data.wpId === "number" ? data.wpId : null,
    commentCount: Number(data.commentCount ?? 0),
    commentsOpen: data.commentsOpen !== undefined
      ? Boolean(data.commentsOpen)
      : (kind !== "page" || String(data.template || "page") === "message"),
    upvotes: Number(data.upvotes ?? 0),
    mood: data.mood ? String(data.mood) : "",
    images: Array.isArray(data.images) ? data.images.map(String) : [],
    template: data.template ? String(data.template) : "page",
    locked: Boolean(data.password || data.locked),
    passwordHint: data.passwordHint ? String(data.passwordHint) : "",
    _password: data.password ? String(data.password) : "",
    hideReadingTime: Boolean(data.hideReadingTime),
    comments: Array.isArray(data.comments) ? data.comments : [],
    body,
  };
}

const outDir = join(root, "src/generated");
mkdirSync(outDir, { recursive: true });
const theme = JSON.parse(readFileSync(join(root, "src/generated/theme-config.json"), "utf8"));
const source = process.env.ARGON_SOURCE || theme.source || "local";
const contentRoot = source === "wordpress" ? join(root, ".cache/content") : join(root, "src/content");

const groups = [
  ["post", "posts"],
  ["page", "pages"],
  ["shuoshuo", "shuoshuo"],
];
const entries = [];
for (const [kind, folder] of groups) {
  const base = join(contentRoot, folder);
  for (const file of walk(base)) entries.push(readEntry(file, kind, base));
}
const published = entries.filter((entry) => !entry.draft);

const baseCtx = createContext({
  posts: published.filter((entry) => entry.kind === "post").map((entry) => ({
    id: entry.id,
    title: entry.title,
    href: entryUrl(entry),
  })),
  categories: [...new Set(published.flatMap((entry) => entry.categories))],
  tags: [...new Set(published.flatMap((entry) => entry.tags))],
  friendLinks: Array.isArray(theme.friendLinks) ? theme.friendLinks : [],
});

const useKatex = theme.motion && theme.motion.math === "katex";
const usePangu = theme.motion && String(theme.motion.pangu || "").includes("article");
const foldComments = Boolean(theme.motion && theme.motion.foldLongComments);

for (const entry of published) {
  if (Array.isArray(entry.comments)) {
    entry.comments = entry.comments.map((comment) => ({ ...comment, fold: foldComments }));
  }
}

for (const entry of published) {
  const rawPassword = entry._password || "";
  delete entry._password;

  if (entry.locked && !rawPassword) {
    // Headless WP protected post: body was withheld by WordPress; render native password form.
    entry.html = renderPasswordForm({
      id: entry.wpId ? String(entry.wpId) : entry.id,
      hint: entry.passwordHint,
      payload: null,
      mode: "wordpress",
    });
    delete entry.body;
    continue;
  }

  if (usePangu) entry.body = pangu(entry.body);
  const protectedMath = useKatex ? protectMath(entry.body) : { source: entry.body, slots: [] };
  let renderedHtml = "";
  if (source === "wordpress") {
    // Headless snapshots are pre-rendered HTML from snapshot.mjs; do not re-escape as Markdown.
    renderedHtml = restoreMath(protectedMath.source, protectedMath.slots);
  } else {
    const rich = protectedMath.source.includes("<!-- wp:") || /\[[a-z]+/.test(protectedMath.source);
    const referenced = applyReferences(protectedMath.source, theme.article && theme.article.referenceTitle);
    const entryCtx = {
      ...baseCtx,
      date: entry.date,
      modifiedDate: entry.modifiedDate || entry.date,
      hideReadingTime: false,
      unknown: baseCtx.unknown,
    };
    const html = rich ? renderDocument(referenced.html, entryCtx) : renderMarkdown(referenced.html);
    if (entryCtx.hideReadingTime) entry.hideReadingTime = true;
    renderedHtml = restoreMath(html, protectedMath.slots) + referenced.list;
  }

  if (entry.locked && rawPassword) {
    // Encrypt rendered HTML with AES-256-GCM so plaintext never enters entries.json or dist/.
    const payload = encryptPostHtml(renderedHtml, rawPassword);
    entry.html = renderPasswordForm({
      id: entry.id,
      hint: entry.passwordHint,
      payload,
      mode: "local",
    });
  } else {
    entry.html = renderedHtml;
  }
  delete entry.body;
}

writeFileSync(join(outDir, "unknown-blocks.json"), JSON.stringify(baseCtx.unknown, null, 2));
writeFileSync(join(outDir, "entries.json"), JSON.stringify(published, null, 2));
console.log("content entries", published.length, "(source=" + source + ")");
