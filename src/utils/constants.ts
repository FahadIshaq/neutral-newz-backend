import { RSSFeed } from '../types';

export const RSS_FEEDS: RSSFeed[] = [
  // US National
  {
    id: 'npr-national',
    name: 'NPR National',
    url: 'https://feeds.npr.org/1003/rss.xml',
    category: 'US_NATIONAL',
    active: true
  },
  {
    id: 'npr-politics',
    name: 'NPR Politics',
    url: 'https://feeds.npr.org/1014/rss.xml',
    category: 'US_NATIONAL',
    active: true
  },
  {
    id: 'pbs-headlines',
    name: 'PBS Headlines',
    url: 'https://www.pbs.org/newshour/feeds/rss/headlines',
    category: 'US_NATIONAL',
    active: true
  },
  {
    id: 'pbs-politics',
    name: 'PBS Politics',
    url: 'https://www.pbs.org/newshour/feeds/rss/politics',
    category: 'US_NATIONAL',
    active: true
  },
  {
    id: 'white-house',
    name: 'White House Press',
    url: 'https://www.whitehouse.gov/news/feed/',
    category: 'US_NATIONAL',
    active: true
  },
  {
    id: 'state-dept',
    name: 'State Department',
    url: 'https://www.state.gov/feed/',
    category: 'US_NATIONAL',
    active: true
  },
  {
    id: 'defense-dept',
    name: 'Defense Department',
    url: 'https://www.defense.gov/DesktopModules/ArticleCS/RSS.ashx?ContentType=1&Site=944&max=20',
    category: 'US_NATIONAL',
    active: true
  },
  {
    id: 'nytimes-politics',
    name: 'NYT Politics',
    url: 'https://www.nytimes.com/svc/collections/v1/publish/https://www.nytimes.com/section/politics/rss.xml',
    category: 'US_NATIONAL',
    active: true
  },
  {
    id: 'politico-picks',
    name: 'Politico Picks',
    url: 'https://www.politico.com/rss/politicopicks.xml',
    category: 'US_NATIONAL',
    active: true
  },
  {
    id: 'rollcall',
    name: 'Roll Call',
    url: 'https://rollcall.com/feed/',
    category: 'US_NATIONAL',
    active: true
  },
  
  // International
  {
    id: 'bbc-world',
    name: 'BBC World',
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    category: 'INTERNATIONAL',
    active: true
  },
  {
    id: 'aljazeera-world',
    name: 'Al Jazeera World',
    url: 'https://www.aljazeera.com/xml/rss/all.xml',
    category: 'INTERNATIONAL',
    active: true
  },
  {
    id: 'france24-world',
    name: 'France 24 World',
    url: 'https://www.france24.com/en/rss',
    category: 'INTERNATIONAL',
    active: true
  },
  {
    id: 'un-news',
    name: 'UN News',
    url: 'https://news.un.org/feed/subscribe/en/news/all/rss.xml',
    category: 'INTERNATIONAL',
    active: true
  },
  {
    id: 'npr-world',
    name: 'NPR World',
    url: 'https://feeds.npr.org/1004/rss.xml',
    category: 'INTERNATIONAL',
    active: true
  },
  
  // Finance/Macro
  {
    id: 'federal-reserve',
    name: 'Federal Reserve Press',
    url: 'https://www.federalreserve.gov/feeds/press_all.xml',
    category: 'FINANCE_MACRO',
    active: true
  },
  {
    id: 'npr-economy',
    name: 'NPR Economy',
    url: 'https://feeds.npr.org/1017/rss.xml',
    category: 'FINANCE_MACRO',
    active: true
  },
  {
    id: 'pbs-economy',
    name: 'PBS NewsHour Economy',
    url: 'https://www.pbs.org/newshour/feeds/rss/economy',
    category: 'FINANCE_MACRO',
    active: true
  },
  {
    id: 'imf-press',
    name: 'IMF Press',
    url: 'https://www.imf.org/external/cntpst/prfeed.aspx',
    category: 'FINANCE_MACRO',
    active: true
  }
];

export const PROCESSING_INTERVAL = '*/30 * * * *'; // Every 30 minutes
export const MAX_ARTICLES_PER_FEED = 50;
export const MAX_BRIEF_LENGTH = 500;
export const MIN_ARTICLES_FOR_BRIEF = 3;
