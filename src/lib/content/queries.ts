import rawEntries from "../../generated/entries.json";

export interface EntryData {
  title: string;
  date: Date;
  description: string;
  permalink: string;
  tags: string[];
  categories: string[];
  cover: string;
  sticky: boolean;
  draft: boolean;
  wpId?: number;
  commentCount: number;
  commentsOpen: boolean;
  upvotes: number;
  mood: string;
  images: string[];
  template: string;
  locked: boolean;
  hideReadingTime?: boolean;
  comments: { id: number; author: string; content: string; upvotes?: number }[];
}

export interface ContentEntry {
  id: string;
  kind: "post" | "page" | "shuoshuo";
  html: string;
  data: EntryData;
}

export type PostEntry = ContentEntry;
export type PageEntry = ContentEntry;
export type ShuoshuoEntry = ContentEntry;

interface RawEntry {
  id: string;
  kind: ContentEntry["kind"];
  title: string;
  date: string;
  description: string;
  permalink?: string;
  tags: string[];
  categories: string[];
  cover: string;
  sticky: boolean;
  draft: boolean;
  wpId: number | null;
  commentCount: number;
  commentsOpen?: boolean;
  upvotes?: number;
  mood: string;
  images: string[];
  template: string;
  locked?: boolean;
  hideReadingTime?: boolean;
  comments?: { id: number; author: string; content: string; upvotes?: number }[];
  html: string;
}

function loadRaw(): ContentEntry[] {
  const raw = rawEntries as RawEntry[];
  return raw.map((entry) => ({
    id: entry.id,
    kind: entry.kind,
    html: entry.html,
    data: {
      title: entry.title,
      date: new Date(entry.date),
      description: entry.description,
      permalink: entry.permalink || "",
      tags: entry.tags,
      categories: entry.categories,
      cover: entry.cover,
      sticky: entry.sticky,
      draft: entry.draft,
      wpId: entry.wpId ?? undefined,
      commentCount: entry.commentCount,
      commentsOpen: entry.commentsOpen !== undefined
        ? Boolean(entry.commentsOpen)
        : (entry.kind !== "page" || entry.template === "message"),
      upvotes: entry.upvotes ?? 0,
      mood: entry.mood,
      images: entry.images,
      template: entry.template,
      locked: Boolean(entry.locked),
      hideReadingTime: Boolean(entry.hideReadingTime),
      comments: entry.comments ?? [],
    },
  }));
}

const entries = loadRaw();

function byDate(items: ContentEntry[]): ContentEntry[] {
  return [...items].sort((a, b) => {
    if (a.data.sticky !== b.data.sticky) return a.data.sticky ? -1 : 1;
    return b.data.date.getTime() - a.data.date.getTime();
  });
}

export function publishedPosts(): ContentEntry[] {
  return byDate(entries.filter((entry) => entry.kind === "post"));
}

export function publishedMoments(): ContentEntry[] {
  return byDate(entries.filter((entry) => entry.kind === "shuoshuo"));
}

export function publishedPages(): ContentEntry[] {
  return entries.filter((entry) => entry.kind === "page");
}

export function termCounts(posts: ContentEntry[], key: "tags" | "categories"): Map<string, number> {
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const term of post.data[key]) counts.set(term, (counts.get(term) ?? 0) + 1);
  }
  return counts;
}

export function relatedPosts(posts: ContentEntry[], current: ContentEntry, mode: string, limit: number, orderBy = "date", order = "desc"): ContentEntry[] {
  if (mode === "disabled") return [];
  const useTag = mode.includes("tag");
  const useCategory = mode.includes("category");
  return posts
    .filter((post) => post.id !== current.id)
    .map((post) => {
      const tagScore = useTag ? post.data.tags.filter((tag) => current.data.tags.includes(tag)).length : 0;
      const categoryScore = useCategory ? post.data.categories.filter((item) => current.data.categories.includes(item)).length : 0;
      return { post, score: tagScore + categoryScore };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const direction = order === "asc" ? 1 : -1;
      if (orderBy === "title") return a.post.data.title.localeCompare(b.post.data.title) * direction;
      return (a.post.data.date.getTime() - b.post.data.date.getTime()) * direction;
    })
    .slice(0, limit)
    .map((item) => item.post);
}
