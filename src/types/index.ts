export interface Tweet {
  id: string;
  title: string;
  content: string;
  link: string;
  publishedAt: Date;
  author: string;
  platform: 'twitter' | 'truthsocial'; // truthsocial은 임시로 비활성화됨
}

export interface RSSFeedItem {
  title?: string;
  link?: string;
  content?: string;
  contentSnippet?: string;
  pubDate?: string;
  creator?: string;
  author?: string;
  guid?: string;
}

export interface RSSAppFeedItem {
  id: string;
  title: string;
  url: string;
  content_text?: string;
  content_html?: string;
  date_published: string;
  authors?: Array<{ name: string }>;
  image?: string;
  attachments?: Array<{ url: string }>;
}

export interface RSSAppResponse {
  version: string;
  title: string;
  home_page_url: string;
  feed_url: string;
  favicon: string;
  language: string;
  description: string;
  items: RSSAppFeedItem[];
}

export interface AccountConfig {
  name: string;
  platform: 'twitter' | 'truthsocial'; // truthsocial은 임시로 비활성화됨
  rssAppFeedUrl: string;
  displayName: string;
}

export interface MonitoringConfig {
  accounts: AccountConfig[];
  checkInterval: number; // milliseconds
  maxRetries: number;
  retryDelay: number; // milliseconds
} 