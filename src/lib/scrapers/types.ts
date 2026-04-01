export interface ScrapedPhoto {
  source: '468' | 'ebestflower';
  postId: string;
  title: string | null;
  imageUrl: string;
  postUrl: string | null;
  author: string | null;
  postedAt: Date | null;
}

export interface ScrapeResult {
  source: string;
  inserted: number;
  skipped: number;
  errors: string[];
}

export interface ExternalPhoto {
  id: number;
  source: string;
  postId: string;
  title: string | null;
  imageUrl: string;
  postUrl: string | null;
  author: string | null;
  postedAt: string | null;
  scrapedAt: string;
}
