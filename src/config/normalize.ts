import { defaultConfig } from "./defaults";
import type { MenuItem, ThemeConfig } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function merge<T>(base: T, extra: unknown): T {
  if (!isRecord(extra)) return base;
  const out = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(extra)) {
    const current = out[key];
    if (Array.isArray(value)) {
      out[key] = value;
    } else if (isRecord(value) && isRecord(current)) {
      out[key] = merge(current, value);
    } else if (value !== undefined) {
      out[key] = value;
    }
  }
  return out as T;
}

function menus(value: unknown, fallback: MenuItem[]): MenuItem[] {
  if (!Array.isArray(value)) return fallback;
  return value.map((item) => {
    const row = isRecord(item) ? item : {};
    const icon = typeof row.icon === "string" && row.icon.trim() ? row.icon.trim() : undefined;
    return {
      label: String(row.label ?? ""),
      href: String(row.href ?? "#"),
      ...(icon ? { icon } : {}),
      children: menus(row.children, []),
    };
  });
}

const layouts = new Set(["single", "double", "double-reverse", "triple"]);
const sources = new Set(["local", "wordpress"]);
const providers = new Set(["none", "giscus", "waline", "twikoo", "artalk", "wordpress"]);

export function normalizeConfig(raw: unknown): ThemeConfig {
  const merged = merge(defaultConfig, raw);
  if (!sources.has(merged.source)) {
    throw new Error("argon.config.yml: source must be local or wordpress");
  }
  if (!layouts.has(merged.appearance.layout)) {
    throw new Error("argon.config.yml: appearance.layout is invalid");
  }
  if (!providers.has(merged.comments.provider)) {
    throw new Error("argon.config.yml: comments.provider is invalid");
  }
  const rawRecord = isRecord(raw) ? raw : {};
  const toolbar = isRecord(rawRecord.toolbar) ? rawRecord.toolbar : {};
  const sidebar = isRecord(rawRecord.sidebar) ? rawRecord.sidebar : {};
  merged.toolbar.menu = menus(toolbar.menu, defaultConfig.toolbar.menu);
  merged.sidebar.menu = menus(sidebar.menu, defaultConfig.sidebar.menu);
  if (Array.isArray(sidebar.authorLinks)) {
    merged.sidebar.authorLinks = sidebar.authorLinks.map((item) => {
      const row = isRecord(item) ? item : {};
      return { label: String(row.label ?? ""), href: String(row.href ?? "") };
    });
  }
  if (Array.isArray(rawRecord.friendLinks)) {
    merged.friendLinks = rawRecord.friendLinks.map((item) => {
      const row = isRecord(item) ? item : {};
      return {
        name: String(row.name ?? ""),
        url: String(row.url ?? ""),
        description: String(row.description ?? ""),
        avatar: String(row.avatar ?? ""),
      };
    });
  }
  merged.comments.wordpress.endpoint = "/api/comments";
  return merged;
}

/** Headless CMS may override appearance. The comment provider stays a build choice. */
export function mergeRemoteTheme(local: ThemeConfig, remote: unknown): ThemeConfig {
  if (!isRecord(remote)) return local;
  const rest = { ...remote };
  delete rest.comments;
  delete rest.source;
  const merged = normalizeConfig(merge(local, rest));
  merged.source = "wordpress";
  merged.comments = local.comments;
  return merged;
}
