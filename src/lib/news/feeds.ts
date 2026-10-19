
export type NewsCategory =
  | "india"
  | "world"
  | "technology"
  | "business";

export type NewsRegion = "india" | "world";

export type FeedConfig = {
  name: string;
  url: string;
  category: NewsCategory;
  region: NewsRegion;
};

export const feeds: FeedConfig[] = [
  {
    name: "The Indian Express",
    url: "https://indianexpress.com/section/india/feed/",
    category: "india",
    region: "india",
  },
  {
    name: "The Indian Express",
    url: "https://indianexpress.com/section/world/feed/",
    category: "world",
    region: "world",
  },
  {
    name: "The Indian Express",
    url: "https://indianexpress.com/section/technology/feed/",
    category: "technology",
    region: "world",
  },
  {
    name: "The Indian Express",
    url: "https://indianexpress.com/section/business/feed/",
    category: "business",
    region: "india",
  },
];
