import type { WordpressEnv } from "./env";
import type { WpEntry, WpList } from "./types";

export class WordpressClient {
  constructor(private readonly env: WordpressEnv) {}

  private authHeader(): string {
    return "Basic " + Buffer.from(this.env.user + ":" + this.env.password).toString("base64");
  }

  async getJson<T>(path: string): Promise<T> {
    const response = await fetch(this.env.url + "/wp-json/argon-astro/v1" + path, {
      headers: { authorization: this.authHeader(), accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error("Headless CMS request failed: " + response.status + " " + path);
    }
    return response.json() as Promise<T>;
  }

  async list(kind: "posts" | "pages" | "shuoshuo"): Promise<WpEntry[]> {
    const items: WpEntry[] = [];
    let page = 1;
    let total = 1;
    while (page <= total) {
      const body = await this.getJson<WpList<WpEntry>>("/" + kind + "?page=" + page + "&per_page=50");
      items.push(...body.items);
      total = body.totalPages || 1;
      page += 1;
    }
    return items;
  }
}
