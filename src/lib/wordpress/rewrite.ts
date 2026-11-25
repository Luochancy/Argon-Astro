import { createHash } from "node:crypto";

export function localMediaPath(id: number, sourceUrl: string): string {
  const name = sourceUrl.split("?")[0]?.split("/").pop() || "file";
  const safe = name.replace(/[^\w.\-]+/g, "-");
  return "/media/wp/" + id + "-" + safe;
}

export function rewriteHtml(html: string, map: Map<string, string>): string {
  let next = html;
  for (const [from, to] of map) {
    next = next.split(from).join(to);
  }
  return next;
}

export function hashText(value: string): string {
  return createHash("sha1").update(value).digest("hex").slice(0, 8);
}
