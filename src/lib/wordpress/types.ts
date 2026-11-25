export interface WpMedia {
  id: number;
  sourceUrl: string;
  alt: string;
  mime: string;
}

export interface WpEntry {
  id: number;
  slug: string;
  title: string;
  date: string;
  modified?: string;
  excerpt: string;
  sticky?: boolean;
  categories?: string[];
  tags?: string[];
  commentCount?: number;
  raw?: string;
  rendered?: string;
  media?: WpMedia[];
  mood?: string;
  images?: string[];
}

export interface WpList<T> {
  page: number;
  totalPages: number;
  items: T[];
}
