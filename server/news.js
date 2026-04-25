const NEWSAPI_KEY = null; // No server-side default — user must provide via UI

// Map our UI source labels to search domains for better matching
const SOURCE_DOMAINS = {
  'NYT': 'nytimes.com',
  'Reuters': 'reuters.com',
  'Bloomberg': 'bloomberg.com',
  'AP News': 'apnews.com',
  'WSJ': 'wsj.com',
  'Financial Times': 'ft.com',
};

/**
 * Fetch real articles from NewsAPI for a given event query and source list.
 * Uses domain-based filtering for much better source coverage on the free tier.
 */
export async function fetchArticles(event, sources, newsApiKey) {
  const key = newsApiKey || NEWSAPI_KEY;
  if (!key) {
    console.warn('[news] No NewsAPI key — falling back to LLM-only analysis');
    return [];
  }

  const query = encodeURIComponent(event.slice(0, 100));
  const articles = [];
  const seenUrls = new Set();

  // Strategy 1: Fetch per-source using domain filtering (most reliable)
  const domains = sources.map(s => SOURCE_DOMAINS[s]).filter(Boolean);

  for (const domain of domains) {
    try {
      const url = `https://newsapi.org/v2/everything?q=${query}&domains=${domain}&pageSize=3&sortBy=relevancy&language=en&apiKey=${key}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.status === 'ok' && data.articles?.length > 0) {
        for (const a of data.articles) {
          if (!seenUrls.has(a.url)) {
            seenUrls.add(a.url);
            articles.push({
              source: a.source?.name || domain,
              title: a.title || '',
              description: a.description || '',
              content: a.content || a.description || '',
              url: a.url || '',
              publishedAt: a.publishedAt || '',
            });
          }
        }
      }
    } catch (err) {
      console.warn(`[news] Failed to fetch from ${domain}:`, err.message);
    }
  }

  // Strategy 2: Broad search to fill gaps if we didn't get enough
  if (articles.length < 5) {
    try {
      const url = `https://newsapi.org/v2/everything?q=${query}&pageSize=10&sortBy=relevancy&language=en&apiKey=${key}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.status === 'ok' && data.articles?.length > 0) {
        for (const a of data.articles) {
          if (!seenUrls.has(a.url)) {
            seenUrls.add(a.url);
            articles.push({
              source: a.source?.name || 'Unknown',
              title: a.title || '',
              description: a.description || '',
              content: a.content || a.description || '',
              url: a.url || '',
              publishedAt: a.publishedAt || '',
            });
          }
        }
      }
    } catch (err) {
      console.warn('[news] Broad search failed:', err.message);
    }
  }

  // Log source distribution
  const sourceCounts = {};
  for (const a of articles) {
    sourceCounts[a.source] = (sourceCounts[a.source] || 0) + 1;
  }
  console.log(`[news] Fetched ${articles.length} articles:`, sourceCounts);

  return articles;
}

/**
 * Format articles into a text block for LLM context
 */
export function formatArticlesForLLM(articles) {
  if (articles.length === 0) {
    return 'No real articles were found. Use your training knowledge to provide the best analysis possible, but note this in your response.';
  }

  return articles.map((a, i) =>
    `[Article ${i + 1}] Source: ${a.source} | Published: ${a.publishedAt}\nTitle: ${a.title}\nURL: ${a.url}\n${a.content}`
  ).join('\n\n---\n\n');
}
