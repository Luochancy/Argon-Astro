import { renderGithubCard } from "../github-card.mjs";
import { publicUrl } from "../blocks/urls.mjs";

const KNOWN_TAGS = new Set([
  "br", "label", "progressbar", "checkbox", "alert", "admonition",
  "collapse", "fold", "hidden", "spoiler", "github", "video", "ref",
  "friendlinks", "sfriendlinks", "timeline", "post_time",
  "post_modified_time", "hide_reading_time",
]);

const SELF_CLOSING_ONLY = new Set(["br", "hide_reading_time", "post_time", "post_modified_time"]);

const badge = { green: "badge-success", red: "badge-danger", orange: "badge-warning", blue: "badge-info", indigo: "badge-primary" };
const alert = { indigo: "alert-primary", green: "alert-success", red: "alert-danger", orange: "alert-warning", blue: "alert-info", black: "alert-default" };
const admonition = { indigo: "admonition-primary", green: "admonition-success", red: "admonition-danger", orange: "admonition-warning", blue: "admonition-info", black: "admonition-default", grey: "admonition-grey" };
const bar = { indigo: "bg-primary", green: "bg-success", red: "bg-danger", orange: "bg-warning", blue: "bg-info" };
const collapseColor = { indigo: "collapse-block-primary", green: "collapse-block-success", red: "collapse-block-danger", orange: "collapse-block-warning", blue: "collapse-block-info", black: "collapse-block-default", grey: "collapse-block-grey" };

function esc(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function attr(source, name, fallback = "") {
  const quoted = new RegExp("(?:^|\\s)" + name + "\\s*=\\s*([\"'])(.*?)\\1", "i").exec(source);
  if (quoted) return quoted[2];
  const bare = new RegExp("(?:^|\\s)" + name + "\\s*=\\s*([^\\s\\]]+)", "i").exec(source);
  if (bare) return bare[1];
  return fallback;
}

function colorClass(color, map) {
  return map[color] || map.indigo;
}

function rewriteUrl(ctx, url) {
  const fn = typeof ctx?.rewriteUrl === "function" ? ctx.rewriteUrl : (u) => u;
  return publicUrl(fn(url));
}

function formatDate(raw) {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return String(raw);
  return date.toISOString().slice(0, 10);
}

function parseInlineSimpleFriendLinks(inner) {
  const raw = String(inner || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .trim();
  if (!raw) return [];
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split("|").map((p) => p.trim()))
    .filter((parts) => parts.length >= 2);
}

function renderFriendLinks(tag, inner, ctx) {
  if (tag === "sfriendlinks" && inner && inner.includes("|")) {
    const entries = parseInlineSimpleFriendLinks(inner);
    if (entries.length > 0) {
      let out = "<div class=\"friend-links friend-links-style1 friend-links-simple shortcode-friend-links\">";
      let rowOpen = false;
      for (const parts of entries) {
        if (parts[0].toLowerCase() === "category") {
          if (rowOpen) {
            out += "</div>";
            rowOpen = false;
          }
          out += "<h3 class=\"friend-links-category-title\">" + esc(parts[1] || "") + "</h3>";
          continue;
        }
        if (!rowOpen) {
          out += "<div class=\"row\">";
          rowOpen = true;
        }
        const name = esc(parts[0] || "");
        const url = esc(rewriteUrl(ctx, parts[1] || "#"));
        const desc = esc(parts[2] || "");
        const avatarUrl = parts[3] ? rewriteUrl(ctx, parts[3]) : "";
        const avatar = avatarUrl
          ? "<img class=\"friend-link-avatar bg-gradient-secondary\" src=\"" + esc(avatarUrl) + "\" alt=\"" + name + "\">"
          : "";
        const containerClass = "card shadow-sm friend-link-container" + (avatarUrl ? "" : " no-avatar");
        out += "<div class=\"link mb-2 col-lg-6 col-md-6\"><div class=\"" + containerClass + "\">"
          + avatar
          + "<div class=\"friend-link-content\"><div class=\"friend-link-title title text-primary\"><a href=\"" + url + "\" target=\"_blank\" rel=\"noopener\">" + name + "</a></div>"
          + "<div class=\"friend-link-description\">" + desc + "</div>"
          + "<div class=\"friend-link-links\"><a href=\"" + url + "\" target=\"_blank\" rel=\"noopener\" style=\"float:right;margin-right:10px;\"><i class=\"fa fa-angle-right\" style=\"font-weight:bold;\"></i></a></div>"
          + "</div></div></div>";
      }
      if (rowOpen) out += "</div>";
      return out + "</div>";
    }
  }
  const links = Array.isArray(ctx?.friendLinks) ? ctx.friendLinks : [];
  const extraClass = tag === "sfriendlinks" ? " friend-links-simple" : "";
  if (links.length > 0) {
    const cards = links.map((link) => {
      const url = esc(rewriteUrl(ctx, link.url || "#"));
      const name = esc(link.name || link.title || "");
      const desc = esc(link.description || "");
      const hasAvatar = Boolean(link.avatar);
      const avatar = hasAvatar
        ? "<img class=\"friend-link-avatar bg-gradient-secondary\" src=\"" + esc(rewriteUrl(ctx, link.avatar)) + "\" alt=\"" + name + "\">"
        : "";
      const containerClass = "card shadow-sm friend-link-container" + (hasAvatar ? "" : " no-avatar");
      return "<div class=\"link mb-2 col-lg-6 col-md-6\"><div class=\"" + containerClass + "\">"
        + avatar
        + "<div class=\"friend-link-content\"><div class=\"friend-link-title title text-primary\"><a href=\"" + url + "\" target=\"_blank\" rel=\"noopener\">" + name + "</a></div>"
        + "<div class=\"friend-link-description\">" + desc + "</div>"
        + "<div class=\"friend-link-links\"><a href=\"" + url + "\" target=\"_blank\" rel=\"noopener\" style=\"float:right;margin-right:10px;\"><i class=\"fa fa-angle-right\" style=\"font-weight:bold;\"></i></a></div>"
        + "</div></div></div>";
    }).join("");
    return "<div class=\"friend-links friend-links-style1 shortcode-friend-links" + extraClass + "\"><div class=\"row\">" + cards + "</div></div>";
  }
  const content = inner ? expandShortcodes(inner, ctx).trim() : "";
  return "<div class=\"friend-links friend-links-style1 shortcode-friend-links" + extraClass + "\">" + content + "</div>";
}

function renderTimeline(inner, ctx) {
  const raw = String(inner || "").trim();
  if (!raw) return "<div class=\"argon-timeline\"></div>";
  if (raw.includes("argon-timeline-node")) {
    return "<div class=\"argon-timeline\">" + expandShortcodes(raw, ctx) + "</div>";
  }
  const lines = raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n")
    .replace(/^<p[^>]*>|<\/p>$/gi, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const nodes = lines.map((line) => {
    const parts = line.split("|").map((part) => part.trim());
    let time = "";
    let title = "";
    let body = "";
    if (parts.length >= 3) {
      time = parts[0];
      title = parts[1];
      body = parts.slice(2).join(" | ");
    } else if (parts.length === 2) {
      time = parts[0];
      body = parts[1];
    } else {
      body = parts[0];
    }
    const titleHtml = title ? "<div class=\"argon-timeline-title\">" + expandShortcodes(title, ctx) + "</div>" : "";
    const bodyHtml = expandShortcodes(body, ctx);
    return "<div class=\"argon-timeline-node\">"
      + "<div class=\"argon-timeline-time\">" + esc(time) + "</div>"
      + "<div class=\"argon-timeline-card card bg-gradient-secondary shadow-sm\">" + titleHtml + "<div class=\"argon-timeline-content\">" + bodyHtml + "</div></div>"
      + "</div>";
  }).join("");
  return "<div class=\"argon-timeline\">" + nodes + "</div>";
}

function renderTag(tag, rawAttrs, inner, ctx) {
  if (tag === "br") return "<br>";
  if (tag === "hide_reading_time") {
    if (ctx && typeof ctx === "object") ctx.hideReadingTime = true;
    return "";
  }
  if (tag === "post_time") {
    if (!ctx?.date) return "";
    return "<time class=\"post-time\" datetime=\"" + esc(ctx.date) + "\">" + esc(formatDate(ctx.date)) + "</time>";
  }
  if (tag === "post_modified_time") {
    if (!ctx?.modifiedDate) return "";
    return "<time class=\"post-modified-time\" datetime=\"" + esc(ctx.modifiedDate) + "\">" + esc(formatDate(ctx.modifiedDate)) + "</time>";
  }
  if (tag === "friendlinks" || tag === "sfriendlinks") {
    return renderFriendLinks(tag, inner, ctx);
  }
  if (tag === "timeline") {
    return renderTimeline(inner, ctx);
  }

  const content = inner ? expandShortcodes(inner, ctx) : "";

  if (tag === "label") {
    const color = colorClass(attr(rawAttrs, "color", "indigo"), badge);
    const pill = attr(rawAttrs, "shape") === "round" ? " badge-pill" : "";
    return "<span class=\"badge " + color + pill + "\">" + content + "</span>";
  }
  if (tag === "progressbar") {
    const progress = esc(attr(rawAttrs, "progress", "100"));
    return "<div class=\"progress-wrapper\"><div class=\"progress-info\">"
      + (content ? "<div class=\"progress-label\"><span>" + content + "</span></div>" : "")
      + "<div class=\"progress-percentage\"><span>" + progress + "%</span></div></div>"
      + "<div class=\"progress\"><div class=\"progress-bar " + colorClass(attr(rawAttrs, "color", "indigo"), bar) + "\" style=\"width:" + progress + "%\"></div></div></div>";
  }
  if (tag === "checkbox") {
    const checked = attr(rawAttrs, "checked") === "true" ? " checked" : "";
    const disabled = attr(rawAttrs, "disabled") === "true" ? " disabled" : "";
    return "<div class=\"shortcode-todo custom-control custom-checkbox\"><input class=\"custom-control-input\" type=\"checkbox\"" + checked + disabled + "><label class=\"custom-control-label\"><span>" + content + "</span></label></div>";
  }
  if (tag === "alert") {
    const icon = attr(rawAttrs, "icon");
    const title = attr(rawAttrs, "title");
    return "<div class=\"alert " + colorClass(attr(rawAttrs, "color", "indigo"), alert) + "\">"
      + (icon ? "<span class=\"alert-inner--icon\"><i class=\"fa fa-" + esc(icon) + "\"></i></span>" : "")
      + "<span class=\"alert-inner--text\">" + (title ? "<strong>" + esc(title) + "</strong> " : "") + content + "</span></div>";
  }
  if (tag === "admonition") {
    const title = attr(rawAttrs, "title");
    const icon = attr(rawAttrs, "icon");
    return "<div class=\"admonition shadow-sm " + colorClass(attr(rawAttrs, "color", "indigo"), admonition) + "\">"
      + (title ? "<div class=\"admonition-title\">" + (icon ? "<i class=\"fa fa-" + esc(icon) + "\"></i> " : "") + esc(title) + "</div>" : "")
      + (content ? "<div class=\"admonition-body\">" + content + "</div>" : "")
      + "</div>";
  }
  if (tag === "collapse" || tag === "fold") {
    const collapsed = attr(rawAttrs, "collapsed", "true") !== "false";
    const title = esc(attr(rawAttrs, "title") || "Fold");
    const icon = attr(rawAttrs, "icon");
    const color = attr(rawAttrs, "color");
    const showBorder = attr(rawAttrs, "showborder", "true") !== "false";
    const classes = ["collapse-block", "collapse-block-transparent"];
    if (showBorder) classes.push("shadow-sm");
    else classes.push("collapse-block-noborder");
    if (color && collapseColor[color]) classes.push(collapseColor[color]);
    if (collapsed) classes.push("collapsed");
    const iconHtml = icon ? "<i class=\"fa fa-" + esc(icon) + "\"></i> " : "";
    return "<div class=\"" + classes.join(" ") + "\"><button type=\"button\" class=\"collapse-block-title\" aria-expanded=\"" + (collapsed ? "false" : "true") + "\">" + iconHtml + "<span class=\"collapse-block-title-inner\">" + title + "</span><i class=\"collapse-icon fa fa-angle-down\"></i></button><div class=\"collapse-block-body\"" + (collapsed ? " hidden" : "") + ">" + content + "</div></div>";
  }
  if (tag === "hidden" || tag === "spoiler") {
    const tip = attr(rawAttrs, "tip");
    const mode = attr(rawAttrs, "type", "blur") === "background"
      ? "argon-hidden-text-background"
      : "argon-hidden-text-blur";
    return "<span class=\"argon-hidden-text " + mode + "\" tabindex=\"0\"" + (tip ? " title=\"" + esc(tip) + "\"" : "") + ">" + content + "</span>";
  }
  if (tag === "github") {
    return renderGithubCard({
      author: attr(rawAttrs, "author"),
      project: attr(rawAttrs, "project"),
      size: attr(rawAttrs, "size", "full"),
    });
  }
  if (tag === "video") {
    const src = esc(rewriteUrl(ctx, attr(rawAttrs, "src") || content.trim()));
    const width = attr(rawAttrs, "width");
    const height = attr(rawAttrs, "height");
    const poster = attr(rawAttrs, "poster");
    const autoplay = attr(rawAttrs, "autoplay") === "true" ? " autoplay" : "";
    const loop = attr(rawAttrs, "loop") === "true" ? " loop" : "";
    return "<video controls"
      + (width ? " width=\"" + esc(width) + "\"" : "")
      + (height ? " height=\"" + esc(height) + "\"" : "")
      + (poster ? " poster=\"" + esc(rewriteUrl(ctx, poster)) + "\"" : "")
      + autoplay + loop
      + " src=\"" + src + "\"></video>";
  }
  if (tag === "ref") {
    return "<sup class=\"reference-link\">[" + esc(attr(rawAttrs, "id") || content || "?") + "]</sup>";
  }
  return "";
}

function findMatchingClose(source, tag, fromIndex) {
  const tokenRe = new RegExp("\\[(\\/)?" + tag + "(?:\\s[^\\]]*|\\/)?\\]", "gi");
  tokenRe.lastIndex = fromIndex;
  let depth = 1;
  let match;
  while ((match = tokenRe.exec(source)) !== null) {
    if (match[1]) {
      depth -= 1;
      if (depth === 0) {
        return { start: match.index, end: match.index + match[0].length };
      }
    } else if (!match[0].endsWith("/]")) {
      depth += 1;
    }
  }
  return null;
}

function expandShortcodes(source, ctx) {
  let out = "";
  let cursor = 0;
  const openRe = /\[(\/)?([a-z0-9_]+)([^\]]*)\]/gi;

  while (cursor < source.length) {
    openRe.lastIndex = cursor;
    const match = openRe.exec(source);
    if (!match) {
      out += source.slice(cursor);
      break;
    }
    const [full, closeSlash, rawName, rawAttrs] = match;
    const tag = rawName.toLowerCase();

    if (closeSlash || !KNOWN_TAGS.has(tag)) {
      out += source.slice(cursor, match.index + full.length);
      cursor = match.index + full.length;
      continue;
    }

    out += source.slice(cursor, match.index);
    const afterOpen = match.index + full.length;
    const selfClosed = rawAttrs.trim().endsWith("/") || SELF_CLOSING_ONLY.has(tag);

    if (selfClosed) {
      const cleanAttrs = rawAttrs.replace(/\/\s*$/, "");
      out += renderTag(tag, cleanAttrs, "", ctx);
      cursor = afterOpen;
      continue;
    }

    const closing = findMatchingClose(source, tag, afterOpen);
    if (closing) {
      const inner = source.slice(afterOpen, closing.start);
      out += renderTag(tag, rawAttrs, inner, ctx);
      cursor = closing.end;
    } else {
      out += renderTag(tag, rawAttrs, "", ctx);
      cursor = afterOpen;
    }
  }

  return out;
}

export function renderShortcodes(input, ctx = {}) {
  const preserved = [];
  const masked = String(input || "").replace(/\[noshortcode\]([\s\S]*?)\[\/noshortcode\]/gi, (_, inner) => {
    const token = "\u0000ARGON_NOSHORTCODE_" + preserved.length + "\u0000";
    preserved.push(inner);
    return token;
  });
  const rendered = expandShortcodes(masked, ctx);
  return rendered.replace(/\u0000ARGON_NOSHORTCODE_(\d+)\u0000/g, (_, idx) => preserved[Number(idx)]);
}
