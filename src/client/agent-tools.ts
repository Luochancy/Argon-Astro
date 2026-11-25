/** Invisible browser-side AI Agent runtime: window.__ARGON_AGENT__ read-only API and WebMCP registration. */
import type { ClientConfig } from "./types";

interface AgentIndexEntry {
  id: string;
  kind: string;
  title: string;
  date: string;
  description: string;
  excerpt: string;
  categories: string[];
  tags: string[];
  locked: boolean;
  url: string;
  markdownUrl: string | null;
}

interface AgentIndexDoc {
  schemaVersion: string;
  site: Record<string, string>;
  endpoints: Record<string, string>;
  entries: AgentIndexEntry[];
}

interface WebMcpModelContext {
  registerTool?: (tool: {
    name: string;
    description: string;
    inputSchema?: Record<string, unknown>;
    execute: (input: Record<string, unknown>) => Promise<unknown> | unknown;
  }) => void;
}

let cachedIndex: Promise<AgentIndexDoc | null> | null = null;
let webMcpRegistered = false;

async function fetchAgentIndex(): Promise<AgentIndexDoc | null> {
  if (!cachedIndex) {
    cachedIndex = fetch("/agent-index.json", { headers: { accept: "application/json" } })
      .then((res) => (res.ok ? (res.json() as Promise<AgentIndexDoc>) : null))
      .catch(() => null);
  }
  return cachedIndex;
}

function deriveFallbackMarkdownUrl(pathname: string): string | null {
  const clean = pathname.replace(/\/+$/, "");
  if (!clean || clean === "/") return "/llms.txt";
  const last = clean.slice(clean.lastIndexOf("/") + 1);
  if (last.includes(".")) return null;
  return `${clean}.md`;
}

async function fetchCurrentMarkdown(): Promise<string> {
  // 1. Prefer HTTP Content Negotiation (`Accept: text/markdown`) on the canonical URL.
  try {
    const res = await fetch(location.pathname, { headers: { accept: "text/markdown" } });
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (res.ok && (ct.includes("text/markdown") || ct.includes("text/plain"))) {
      return await res.text();
    }
  } catch {
    // Fall through to static mirror fallback below.
  }
  // 2. Fallback to static .md mirror on hosts without edge content negotiation.
  const fallbackUrl = deriveFallbackMarkdownUrl(location.pathname);
  if (fallbackUrl) {
    try {
      const res = await fetch(fallbackUrl, { headers: { accept: "text/markdown, text/plain" } });
      if (res.ok) return await res.text();
    } catch {
      // Fall through to DOM text extraction.
    }
  }
  const title = document.querySelector<HTMLElement>(".post-title")?.textContent?.trim() || document.title;
  const body = document.getElementById("post_content")?.innerText?.trim() || document.body.innerText.trim();
  return `# ${title}\n\n${body}\n`;
}

/** Register read-only window.__ARGON_AGENT__ API and WebMCP tools without rendering visible UI. */
export function bindAgentTools(agentConfig: ClientConfig["agent"] | undefined, _signal?: AbortSignal): void {
  if (!agentConfig?.enabled) return;

  const api = {
    version: "1.0",
    getPageInfo() {
      return {
        title: document.title,
        url: location.href,
        pathname: location.pathname,
        contentNegotiation: "Accept: text/markdown",
        llmsTxtUrl: agentConfig.llmsTxt ? "/llms.txt" : null,
        agentIndexUrl: agentConfig.jsonIndex ? "/agent-index.json" : null,
      };
    },
    async getMarkdown(): Promise<string> {
      return fetchCurrentMarkdown();
    },
    async getLlmsTxt(): Promise<string> {
      const res = await fetch("/llms.txt", { headers: { accept: "text/plain" } });
      return res.ok ? res.text() : "";
    },
    async listEntries(kind?: string): Promise<AgentIndexEntry[]> {
      const idx = await fetchAgentIndex();
      if (!idx) return [];
      if (!kind) return idx.entries;
      return idx.entries.filter((entry) => entry.kind === kind);
    },
    async search(query: string, kind?: string): Promise<AgentIndexEntry[]> {
      const q = String(query || "").trim().toLowerCase();
      const items = await this.listEntries(kind);
      if (!q) return items;
      return items.filter((item) => {
        const hay = [item.title, item.description, item.excerpt, ...item.tags, ...item.categories].join(" ").toLowerCase();
        return hay.includes(q);
      });
    },
  };

  (window as unknown as { __ARGON_AGENT__?: typeof api }).__ARGON_AGENT__ = api;

  if (!agentConfig.webMcp || webMcpRegistered) return;
  const modelContext = (navigator as unknown as { modelContext?: WebMcpModelContext }).modelContext;
  if (!modelContext?.registerTool) return;
  webMcpRegistered = true;

  modelContext.registerTool({
    name: "argon_get_page_markdown",
    description: "Fetch the clean Markdown representation of the current blog post, page, or shuoshuo.",
    inputSchema: { type: "object", properties: {} },
    execute: async () => ({
      ...api.getPageInfo(),
      markdown: await api.getMarkdown(),
    }),
  });

  modelContext.registerTool({
    name: "argon_search_blog",
    description: "Search published posts, pages, and shuoshuo on this Argon Astro blog.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search keywords" },
        kind: { type: "string", enum: ["post", "page", "shuoshuo"], description: "Optional entry kind filter" },
      },
      required: ["query"],
    },
    execute: async (input) => api.search(String(input.query || ""), input.kind ? String(input.kind) : undefined),
  });

  modelContext.registerTool({
    name: "argon_list_entries",
    description: "List published posts, pages, and shuoshuo with canonical and Markdown (.md) mirror URLs.",
    inputSchema: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["post", "page", "shuoshuo"] },
      },
    },
    execute: async (input) => api.listEntries(input.kind ? String(input.kind) : undefined),
  });
}
