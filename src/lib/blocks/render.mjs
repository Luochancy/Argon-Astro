import { parseBlocks } from "./parse.mjs";
import { publicUrl } from "./urls.mjs";
import { renderCalendar } from "./calendar.mjs";
import { renderGithubCard } from "../github-card.mjs";
import { renderShortcodes } from "../shortcodes/render.mjs";

const CORE = new Set([
  "paragraph", "heading", "list", "list-item", "quote", "pullquote", "verse", "code", "preformatted",
  "html", "image", "gallery", "cover", "media-text", "video", "audio", "file", "table", "separator",
  "spacer", "buttons", "button", "columns", "column", "group", "row", "stack", "embed", "details",
  "more", "shortcode", "classic", "freeform", "latest-posts", "categories", "tag-cloud", "archives",
  "social-links", "social-link", "navigation", "navigation-link", "search", "query", "post-template", "calendar", "rss",
]);

const BADGE_COLORS = {
  green: "badge-success",
  red: "badge-danger",
  orange: "badge-warning",
  blue: "badge-info",
  indigo: "badge-primary",
};

export function createContext(extra = {}) {
  const unknown = [];
  return {
    rewriteUrl: extra.rewriteUrl || ((url) => url),
    posts: extra.posts || [],
    categories: extra.categories || [],
    tags: extra.tags || [],
    friendLinks: extra.friendLinks || [],
    date: extra.date || "",
    modifiedDate: extra.modifiedDate || "",
    hideReadingTime: false,
    headingIds: new Map(),
    unknown,
  };
}

export function renderDocument(raw, ctx) {
  const source = String(raw || "");
  if (!source.includes("<!-- wp:")) return rewriteHtml(renderShortcodes(source, ctx), ctx);
  return renderBlocks(parseBlocks(source), ctx);
}

export function renderBlocks(blocks, ctx) {
  return blocks.map((block) => renderBlock(block, ctx)).join("");
}

function hasNestedBlocks(block) {
  return Array.isArray(block.innerBlocks) && block.innerBlocks.some((child) => child.name !== "core/freeform");
}

function renderContainerInner(block, ctx) {
  if (Array.isArray(block.innerBlocks) && block.innerBlocks.length > 0) {
    return renderBlocks(block.innerBlocks, ctx);
  }
  return rewriteHtml(block.innerHtml, ctx);
}

function renderBlock(block, ctx) {
  const name = block.name.replace(/^core\//, "");
  const namespaced = block.name;
  if (namespaced.startsWith("argon/")) return renderArgon(block, ctx);
  if (!CORE.has(name)) {
    ctx.unknown.push(namespaced);
    const fallback = renderContainerInner(block, ctx);
    if (fallback.trim()) return fallback;
    return "<div class=\"wp-block-unknown\" data-block=\"" + escapeHtml(namespaced) + "\"></div>";
  }
  if (name === "shortcode" || name === "classic" || name === "freeform") {
    return rewriteHtml(renderShortcodes(block.innerHtml, ctx), ctx);
  }
  if (name === "paragraph") return renderParagraph(block, ctx);
  if (name === "latest-posts" || name === "query" || name === "post-template") return renderLatest(block, ctx);
  if (name === "categories") return renderTerms(ctx.categories, "/categories/");
  if (name === "tag-cloud") return renderTerms(ctx.tags, "/tags/");
  if (name === "archives") return "<div class=\"wp-block-archives\"><a href=\"/archives/\">Archives</a></div>";
  if (name === "calendar") return renderCalendar(ctx.posts);
  if (name === "rss") return "<p class=\"wp-block-rss\"><a href=\"/feed.xml\">RSS</a></p>";
  if (name === "embed") return renderEmbed(block, ctx);
  if (name === "code") return renderCode(block);
  if (name === "details") return renderDetails(block, ctx);
  if (name === "separator") return "<hr class=\"wp-block-separator\" />";
  if (name === "spacer") return "<div class=\"wp-block-spacer\" style=\"height:" + Number(block.attrs.height || 24) + "px\" aria-hidden=\"true\"></div>";
  if (name === "quote" || name === "pullquote") return renderQuote(block, ctx);
  if (name === "buttons" || name === "button") return renderButtons(block, ctx);
  if (name === "columns" || name === "column" || name === "group" || name === "row" || name === "stack") {
    return "<div class=\"wp-block-" + name + "\">" + renderContainerInner(block, ctx) + "</div>";
  }
  if (name === "gallery") return renderGallery(block, ctx);
  if (name === "cover") return renderCover(block, ctx);
  if (name === "heading") return renderHeading(block, ctx);
  if (name === "image") return renderImage(block, ctx);
  if (name === "social-links" || name === "social-link") return renderSocial(block, ctx);
  if (name === "media-text") return renderMediaText(block, ctx);
  if (name === "table") return renderTable(block, ctx);
  if (name === "file" || name === "video" || name === "audio") return renderMedia(name, block, ctx);
  if (name === "list") return renderList(block, ctx);
  if (name === "list-item") return renderListItem(block, ctx);
  if (name === "preformatted" || name === "verse") return "<pre class=\"wp-block-" + name + "\">" + escapeHtml(block.attrs.content || block.innerHtml.replace(/<[^>]+>/g, "")) + "</pre>";
  if (name === "html") return "<div class=\"wp-block-html\">" + rewriteHtml(block.attrs.content || block.innerHtml, ctx) + "</div>";
  if (name === "more") return "<span class=\"wp-block-more\" id=\"more-" + escapeHtml(block.attrs.customText || "") + "\"></span>";
  if (name === "navigation") return "<nav class=\"wp-block-navigation\">" + renderBlocks(block.innerBlocks, ctx) + "</nav>";
  if (name === "navigation-link") {
    const url = escapeHtml(publicUrl(ctx.rewriteUrl(block.attrs.url || "#")));
    return "<a class=\"wp-block-navigation-item__content\" href=\"" + url + "\">" + escapeHtml(block.attrs.label || "") + "</a>";
  }
  if (name === "search") return "<form class=\"wp-block-search\" action=\"/search/\" method=\"get\"><input class=\"wp-block-search__input\" name=\"q\" type=\"search\"></form>";
  if (block.innerHtml.trim()) return rewriteHtml(block.innerHtml, ctx);
  return renderBlocks(block.innerBlocks, ctx);
}

function renderParagraph(block, ctx) {
  if (block.innerHtml.trim()) return rewriteHtml(block.innerHtml, ctx);
  if (block.attrs.content) return "<p>" + escapeHtml(block.attrs.content) + "</p>";
  return "";
}

function renderList(block, ctx) {
  if (hasNestedBlocks(block)) {
    const rendered = renderBlocks(block.innerBlocks, ctx);
    if (/^\s*<(?:ul|ol)\b/i.test(rendered)) return rendered;
    return "<ul class=\"wp-block-list\">" + rendered + "</ul>";
  }
  if (block.innerHtml.trim()) return rewriteHtml(block.innerHtml, ctx);
  return "<ul class=\"wp-block-list\">" + renderBlocks(block.innerBlocks, ctx) + "</ul>";
}

function renderListItem(block, ctx) {
  const inner = block.innerBlocks.length > 0
    ? renderBlocks(block.innerBlocks, ctx)
    : (block.innerHtml.trim() ? rewriteHtml(block.innerHtml, ctx) : escapeHtml(block.attrs.content || ""));
  if (/^\s*<li\b/i.test(inner) && /<\/li>\s*$/i.test(inner)) {
    return inner;
  }
  return "<li>" + inner + "</li>";
}

function renderArgon(block, ctx) {
  if (block.innerHtml.trim() && !hasNestedBlocks(block)) return rewriteHtml(block.innerHtml, ctx);
  const attrs = block.attrs || {};
  const bodyHtml = hasNestedBlocks(block) ? renderBlocks(block.innerBlocks, ctx) : escapeHtml(attrs.content || "");

  if (block.name === "argon/alert") {
    const color = escapeHtml(attrs.color || "#5e72e4");
    const icon = attrs.icon ? "<span class=\"alert-inner--icon\"><i class=\"fa fa-" + escapeHtml(attrs.icon) + "\"></i></span>" : "";
    const title = attrs.title ? "<strong>" + escapeHtml(attrs.title) + "</strong> " : "";
    return "<div class=\"alert\" style=\"background-color:" + color + "\">" + icon + "<span class=\"alert-inner--text\">" + title + bodyHtml + "</span></div>";
  }
  if (block.name === "argon/admonition") {
    const color = escapeHtml(attrs.color || "#5e72e4");
    const title = escapeHtml(attrs.title || "");
    return "<div class=\"admonition shadow-sm\" style=\"border-left-color:" + color + "\"><div class=\"admonition-title\">" + title + "</div><div class=\"admonition-body\">" + bodyHtml + "</div></div>";
  }
  if (block.name === "argon/collapse") {
    const collapsed = attrs.collapsed !== false;
    const title = escapeHtml(attrs.title || "");
    return "<div class=\"collapse-block shadow-sm" + (collapsed ? " collapsed" : "") + "\"><button type=\"button\" class=\"collapse-block-title\" aria-expanded=\"" + (!collapsed) + "\"><span class=\"collapse-block-title-inner\">" + title + "</span><i class=\"collapse-icon fa fa-angle-down\"></i></button><div class=\"collapse-block-body\"" + (collapsed ? " hidden" : "") + ">" + bodyHtml + "</div></div>";
  }
  if (block.name === "argon/github") {
    return renderGithubCard({
      author: attrs.author || "",
      project: attrs.project || "",
      description: escapeHtml(attrs.description || ""),
      stars: attrs.stars ?? "",
      forks: attrs.forks ?? "",
      size: attrs.size || "full",
    });
  }
  if (block.name === "argon/progressbar") {
    const progress = Math.min(100, Math.max(0, Number(attrs.progress ?? 0) || 0));
    const labelText = attrs.label || attrs.content || "";
    const label = labelText ? "<div class=\"progress-label\"><span>" + escapeHtml(labelText) + "</span></div>" : "";
    return "<div class=\"progress-wrapper\"><div class=\"progress-info\">" + label + "<div class=\"progress-percentage\"><span>" + progress + "%</span></div></div><div class=\"progress\"><div class=\"progress-bar\" style=\"width:" + progress + "%\"></div></div></div>";
  }
  if (block.name === "argon/timeline") {
    const items = Array.isArray(attrs.items) ? attrs.items : [];
    const nodes = items.length > 0
      ? items.map((item) => {
          const title = item.title ? "<div class=\"argon-timeline-title\">" + escapeHtml(item.title) + "</div>" : "";
          return "<div class=\"argon-timeline-node\"><div class=\"argon-timeline-time\">" + escapeHtml(item.time || "") + "</div><div class=\"argon-timeline-card card bg-gradient-secondary shadow-sm\">" + title + "<div class=\"argon-timeline-content\">" + escapeHtml(item.content || "") + "</div></div></div>";
        }).join("")
      : renderBlocks(block.innerBlocks, ctx);
    return "<div class=\"argon-timeline\">" + nodes + "</div>";
  }
  if (block.name === "argon/label") {
    const badgeClass = BADGE_COLORS[attrs.color] || BADGE_COLORS.indigo;
    const pill = attrs.shape === "round" ? " badge-pill" : "";
    return "<span class=\"badge " + badgeClass + pill + "\">" + escapeHtml(attrs.content || attrs.text || "") + "</span>";
  }
  if (block.name === "argon/checkbox") {
    const checked = attrs.checked ? " checked" : "";
    const disabled = attrs.disabled ? " disabled" : "";
    const label = escapeHtml(attrs.content || attrs.label || "");
    return "<div class=\"shortcode-todo custom-control custom-checkbox\"><input class=\"custom-control-input\" type=\"checkbox\"" + checked + disabled + "><label class=\"custom-control-label\"><span>" + label + "</span></label></div>";
  }
  if (block.name === "argon/hidden" || block.name === "argon/spoiler") {
    const tip = attrs.tip ? " title=\"" + escapeHtml(attrs.tip) + "\"" : "";
    const mode = attrs.type === "background" ? "argon-hidden-text-background" : "argon-hidden-text-blur";
    return "<span class=\"argon-hidden-text " + mode + "\" tabindex=\"0\"" + tip + ">" + bodyHtml + "</span>";
  }
  if (block.name === "argon/friendlinks") {
    const links = Array.isArray(attrs.links) ? attrs.links : (ctx.friendLinks || []);
    const cards = links.map((link) => {
      const url = escapeHtml(publicUrl(ctx.rewriteUrl(link.url || "#")));
      const name = escapeHtml(link.name || link.title || "");
      const desc = escapeHtml(link.description || "");
      const hasAvatar = Boolean(link.avatar);
      const avatar = hasAvatar ? "<img class=\"friend-link-avatar bg-gradient-secondary\" src=\"" + escapeHtml(publicUrl(ctx.rewriteUrl(link.avatar))) + "\" alt=\"" + name + "\">" : "";
      const containerClass = "card shadow-sm friend-link-container" + (hasAvatar ? "" : " no-avatar");
      return "<div class=\"link mb-2 col-lg-6 col-md-6\"><div class=\"" + containerClass + "\">" + avatar + "<div class=\"friend-link-content\"><div class=\"friend-link-title title text-primary\"><a href=\"" + url + "\" target=\"_blank\" rel=\"noopener\">" + name + "</a></div><div class=\"friend-link-description\">" + desc + "</div><div class=\"friend-link-links\"><a href=\"" + url + "\" target=\"_blank\" rel=\"noopener\" style=\"float:right;margin-right:10px;\"><i class=\"fa fa-angle-right\" style=\"font-weight:bold;\"></i></a></div></div></div></div>";
    }).join("");
    return "<div class=\"friend-links friend-links-style1 shortcode-friend-links\"><div class=\"row\">" + cards + "</div></div>";
  }
  if (block.name === "argon/video") {
    const src = escapeHtml(publicUrl(ctx.rewriteUrl(attrs.src || attrs.url || "")));
    const width = attrs.width ? " width=\"" + escapeHtml(attrs.width) + "\"" : "";
    const height = attrs.height ? " height=\"" + escapeHtml(attrs.height) + "\"" : "";
    const poster = attrs.poster ? " poster=\"" + escapeHtml(publicUrl(ctx.rewriteUrl(attrs.poster))) + "\"" : "";
    const autoplay = attrs.autoplay ? " autoplay" : "";
    const loop = attrs.loop ? " loop" : "";
    return "<video class=\"argon-video\" controls" + width + height + poster + autoplay + loop + " src=\"" + src + "\"></video>";
  }
  return renderBlocks(block.innerBlocks, ctx);
}

function renderLatest(block, ctx) {
  const limit = Number(block.attrs.postsToShow || 5);
  const items = ctx.posts.slice(0, limit).map((post) => "<li><a href=\"/posts/" + post.id + "/\">" + escapeHtml(post.title) + "</a></li>").join("");
  return "<ul class=\"wp-block-latest-posts\">" + items + "</ul>";
}

function renderTerms(terms, prefix) {
  return "<ul class=\"wp-block-terms\">" + terms.map((term) => "<li><a href=\"" + prefix + encodeURIComponent(term) + "/\">" + escapeHtml(term) + "</a></li>").join("") + "</ul>";
}

function renderEmbed(block, ctx) {
  const url = publicUrl(ctx.rewriteUrl(block.attrs.url || ""));
  if (block.innerHtml.trim()) {
    const inner = rewriteHtml(block.innerHtml, ctx);
    if (/wp-json|wp-admin|admin-ajax\.php/i.test(inner)) return "<div class=\"wp-block-embed\"></div>";
    return "<div class=\"wp-block-embed\">" + inner + "</div>";
  }
  if (!url) return "<div class=\"wp-block-embed\"></div>";
  return "<div class=\"wp-block-embed\"><a href=\"" + escapeHtml(url) + "\">" + escapeHtml(url) + "</a></div>";
}

function renderCode(block) {
  const language = escapeHtml(block.attrs.language || "");
  let content = "";
  if (block.innerHtml.trim()) {
    const codeMatch = /<code(?:\s[^>]*)?>([\s\S]*?)<\/code>/i.exec(block.innerHtml);
    const preMatch = codeMatch ? null : /<pre(?:\s[^>]*)?>([\s\S]*?)<\/pre>/i.exec(block.innerHtml);
    if (codeMatch) {
      content = codeMatch[1];
    } else if (preMatch) {
      content = preMatch[1];
    } else {
      content = escapeHtml(block.innerHtml.trim());
    }
  } else if (block.attrs.content) {
    content = escapeHtml(block.attrs.content);
  }
  return "<pre class=\"wp-block-code line-numbers\"><code class=\"language-" + language + "\">" + content + "</code></pre>";
}

function renderQuote(block, ctx) {
  if (block.innerHtml.trim()) return rewriteHtml(block.innerHtml, ctx);
  const cite = block.attrs.citation ? "<cite>" + escapeHtml(block.attrs.citation) + "</cite>" : "";
  return "<blockquote class=\"wp-block-quote\"><p>" + escapeHtml(block.attrs.value || "") + "</p>" + cite + "</blockquote>";
}

function renderButtons(block, ctx) {
  if (block.innerHtml.trim()) return rewriteHtml(block.innerHtml, ctx);
  const text = escapeHtml(block.attrs.text || "Button");
  const url = escapeHtml(publicUrl(ctx.rewriteUrl(block.attrs.url || "#")));
  return "<div class=\"wp-block-buttons\"><a class=\"wp-block-button__link\" href=\"" + url + "\">" + text + "</a></div>";
}

function renderGallery(block, ctx) {
  const nested = block.innerBlocks.filter((child) => child.name !== "core/freeform");
  if (nested.length > 0) {
    return "<div class=\"wp-block-gallery\">" + renderBlocks(nested, ctx) + "</div>";
  }
  if (block.innerHtml.trim()) return rewriteHtml(block.innerHtml, ctx);
  const images = Array.isArray(block.attrs.images) ? block.attrs.images : [];
  const html = images.map((image) => "<figure class=\"wp-block-image\"><img src=\"" + escapeHtml(publicUrl(ctx.rewriteUrl(image.url || ""))) + "\" alt=\"" + escapeHtml(image.alt || "") + "\"></figure>").join("");
  return "<div class=\"wp-block-gallery\">" + html + "</div>";
}

function renderTableRows(rows, defaultTag) {
  return rows.map((row) => {
    const cells = (row.cells || []).map((cell) => {
      const tag = cell.tag === "th" || cell.tag === "td" ? cell.tag : defaultTag;
      return "<" + tag + ">" + escapeHtml(cell.content || "") + "</" + tag + ">";
    }).join("");
    return "<tr>" + cells + "</tr>";
  }).join("");
}

function renderTable(block, ctx) {
  if (block.innerHtml.trim()) return rewriteHtml(block.innerHtml, ctx);
  const head = Array.isArray(block.attrs.head) && block.attrs.head.length > 0
    ? "<thead>" + renderTableRows(block.attrs.head, "th") + "</thead>"
    : "";
  const body = Array.isArray(block.attrs.body) ? renderTableRows(block.attrs.body, "td") : "";
  const foot = Array.isArray(block.attrs.foot) && block.attrs.foot.length > 0
    ? "<tfoot>" + renderTableRows(block.attrs.foot, "td") + "</tfoot>"
    : "";
  return "<figure class=\"wp-block-table\"><table>" + head + "<tbody>" + body + "</tbody>" + foot + "</table></figure>";
}

function renderMedia(name, block, ctx) {
  if (block.innerHtml.trim()) return rewriteHtml(block.innerHtml, ctx);
  const src = escapeHtml(publicUrl(ctx.rewriteUrl(block.attrs.href || block.attrs.src || "")));
  if (name === "video") return "<video class=\"wp-block-video\" controls src=\"" + src + "\"></video>";
  if (name === "audio") return "<audio class=\"wp-block-audio\" controls src=\"" + src + "\"></audio>";
  return "<div class=\"wp-block-file\"><a href=\"" + src + "\">" + escapeHtml(block.attrs.fileName || "file") + "</a></div>";
}

export function slugify(text) {
  return String(text || "").trim().toLowerCase().replace(/\s+/g, "-").replace(/[^\w\u4e00-\u9fff-]/g, "").slice(0, 60);
}

function renderImage(block, ctx) {
  if (block.innerHtml.trim()) return rewriteHtml(block.innerHtml, ctx);
  const src = escapeHtml(publicUrl(ctx.rewriteUrl(block.attrs.url || block.attrs.href || "")));
  const alt = escapeHtml(block.attrs.alt || "");
  return "<figure class=\"wp-block-image\"><img src=\"" + src + "\" alt=\"" + alt + "\"></figure>";
}

function allocateHeadingId(base, ctx) {
  const seen = ctx.headingIds || (ctx.headingIds = new Map());
  if (!seen.has(base)) {
    seen.set(base, 1);
    return base;
  }
  let suffix = seen.get(base);
  while (seen.has(base + "-" + suffix)) {
    suffix += 1;
  }
  const unique = base + "-" + suffix;
  seen.set(base, suffix + 1);
  seen.set(unique, 1);
  return unique;
}

function renderHeading(block, ctx) {
  const level = Math.min(6, Math.max(1, Number(block.attrs.level || 2)));
  const inner = block.innerHtml.trim() ? rewriteHtml(block.innerHtml, ctx) : "<h" + level + ">" + escapeHtml(block.attrs.content || "") + "</h" + level + ">";
  const openTag = /<h[1-6]\b[^>]*>/i.exec(inner);
  if (openTag && /\bid\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.test(openTag[0])) {
    const existing = /\bid\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(openTag[0]);
    const existingId = existing[1] ?? existing[2] ?? existing[3] ?? "";
    if (existingId) {
      const seen = ctx.headingIds || (ctx.headingIds = new Map());
      if (!seen.has(existingId)) seen.set(existingId, 1);
    }
    return inner;
  }
  const text = inner.replace(/<[^>]+>/g, "");
  const base = slugify(text) || "heading";
  const id = allocateHeadingId(base, ctx);
  return inner.replace(/<h([1-6])(\b)/i, "<h$1 id=\"" + id + "\"$2");
}

function renderSocial(block, ctx) {
  if (block.name.endsWith("social-link")) {
    const url = escapeHtml(publicUrl(ctx.rewriteUrl(block.attrs.url || "#")));
    const service = escapeHtml(block.attrs.service || "link");
    return "<li class=\"wp-social-link wp-social-link-" + service + "\"><a href=\"" + url + "\" target=\"_blank\" rel=\"noopener\">" + service + "</a></li>";
  }
  return "<ul class=\"wp-block-social-links\">" + renderBlocks(block.innerBlocks, ctx) + "</ul>";
}

function renderCover(block, ctx) {
  const image = escapeHtml(publicUrl(ctx.rewriteUrl(block.attrs.url || block.attrs.mediaUrl || "")));
  const dim = Number(block.attrs.dimRatio || 0);
  return "<div class=\"wp-block-cover\"><span class=\"wp-block-cover__background\" style=\"opacity:" + (dim / 100) + "\"></span>"
    + (image ? "<img class=\"wp-block-cover__image-background\" src=\"" + image + "\" alt=\"\">" : "")
    + "<div class=\"wp-block-cover__inner-container\">" + renderContainerInner(block, ctx) + "</div></div>";
}

function renderMediaText(block, ctx) {
  const image = escapeHtml(publicUrl(ctx.rewriteUrl(block.attrs.mediaUrl || "")));
  const media = image ? "<figure class=\"wp-block-media-text__media\"><img src=\"" + image + "\" alt=\"\"></figure>" : "";
  return "<div class=\"wp-block-media-text\">" + media + "<div class=\"wp-block-media-text__content\">" + renderContainerInner(block, ctx) + "</div></div>";
}

function renderDetails(block, ctx) {
  if (block.innerHtml.trim()) return rewriteHtml(block.innerHtml, ctx);
  return "<details class=\"wp-block-details\"><summary>" + escapeHtml(block.attrs.summary || "") + "</summary>" + renderBlocks(block.innerBlocks, ctx) + "</details>";
}

export function rewriteHtml(html, ctx) {
  return String(html || "").replace(/(\s(?:src|href)=["'])([^"']+)(["'])/gi, (full, before, url, after) => before + publicUrl(ctx.rewriteUrl(url)) + after);
}

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
