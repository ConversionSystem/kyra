/**
 * GEO Tester — Executable skill for the Cannabis SEO Worker
 *
 * Tests whether a cannabis dispensary appears in AI-generated search results.
 * Queries ChatGPT and Perplexity with 25 location-specific cannabis queries.
 *
 * This file runs inside the OpenClaw container as part of the agent's skill set.
 * It's invoked by the cron scheduler or on-demand via the agent.
 */

import geoQueriesConfig from '../../config/geo-queries.json';

interface GeoResult {
  query: string;
  provider: string;
  cited: boolean;
  position: number | null;
  context: string;
  date: string;
}

interface GeoTestReport {
  test_date: string;
  dispensary: string;
  city: string;
  overall_score: number;
  trend: 'up' | 'down' | 'stable';
  previous_score: number | null;
  results: GeoResult[];
  recommendations: string[];
  total_queries: number;
  successful_queries: number;
}

interface DispensaryConfig {
  dispensary_name: string;
  city: string;
  state: string;
  address: string;
  address_area: string;
  phone: string;
  website: string;
  products: string[];
  license_number: string;
  delivery_available: boolean;
}

/**
 * Substitute template variables in a query string
 */
function substituteQuery(template: string, dispensary: DispensaryConfig): string {
  return template
    .replace(/\{\{CITY\}\}/g, dispensary.city)
    .replace(/\{\{DISPENSARY_NAME\}\}/g, dispensary.dispensary_name)
    .replace(/\{\{ADDRESS_AREA\}\}/g, dispensary.address_area)
    .replace(/\{\{STATE\}\}/g, dispensary.state)
    .replace(/\{\{PRODUCT\}\}/g, dispensary.products[0] || 'flower');
}

/**
 * Check if the dispensary is mentioned in an AI response
 */
function analyzeCitation(
  response: string,
  dispensary: DispensaryConfig,
): { cited: boolean; position: number | null; context: string } {
  const lowerResponse = response.toLowerCase();
  const dispensaryLower = dispensary.dispensary_name.toLowerCase();
  const phoneCleaned = dispensary.phone.replace(/\D/g, '');

  // Check for dispensary name mention
  const nameIndex = lowerResponse.indexOf(dispensaryLower);
  const phoneIndex = lowerResponse.indexOf(phoneCleaned);
  const websiteIndex = lowerResponse.indexOf(
    dispensary.website.replace(/^https?:\/\//, '').toLowerCase(),
  );

  const cited = nameIndex !== -1 || phoneIndex !== -1 || websiteIndex !== -1;

  // Estimate position: count how many "businesses" are mentioned before this one
  let position: number | null = null;
  if (cited && nameIndex !== -1) {
    // Count numbered list items or distinct business mentions before our dispensary
    const textBefore = response.substring(0, nameIndex);
    const numberedItems = textBefore.match(/\d+[\.\)]/g);
    position = numberedItems ? numberedItems.length + 1 : 1;
  }

  // Extract context snippet
  let context = '';
  if (cited) {
    const idx = nameIndex !== -1 ? nameIndex : phoneIndex !== -1 ? phoneIndex : websiteIndex;
    const start = Math.max(0, idx - 80);
    const end = Math.min(response.length, idx + 120);
    context = '...' + response.substring(start, end).trim() + '...';
  }

  return { cited, position, context };
}

/**
 * Query ChatGPT for a GEO test
 */
async function queryChatGPT(
  query: string,
  apiKey: string,
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant answering questions about local cannabis dispensaries and retail cannabis products in legal adult-use and medical markets. Provide specific recommendations with names, addresses, and details when possible.',
        },
        { role: 'user', content: query },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`ChatGPT API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Query Perplexity for a GEO test
 */
async function queryPerplexity(
  query: string,
  apiKey: string,
): Promise<string> {
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant answering questions about local cannabis dispensaries in legal markets. Be specific with names and locations.',
        },
        { role: 'user', content: query },
      ],
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    throw new Error(`Perplexity API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Generate product-specific query variations
 */
function expandQueries(
  templates: string[],
  dispensary: DispensaryConfig,
): string[] {
  const expanded: string[] = [];

  for (const template of templates) {
    if (template.includes('{{PRODUCT}}')) {
      // Expand for top 3 products
      for (const product of dispensary.products.slice(0, 3)) {
        expanded.push(
          substituteQuery(template.replace('{{PRODUCT}}', product), dispensary),
        );
      }
    } else {
      expanded.push(substituteQuery(template, dispensary));
    }
  }

  return expanded;
}

/**
 * Generate recommendations based on test results
 */
function generateRecommendations(
  results: GeoResult[],
  dispensary: DispensaryConfig,
): string[] {
  const recommendations: string[] = [];

  // Group by query type
  const deliveryQueries = results.filter((r) =>
    r.query.toLowerCase().includes('delivery') ||
    r.query.toLowerCase().includes('late') ||
    r.query.toLowerCase().includes('curbside'),
  );
  const productQueries = results.filter((r) =>
    dispensary.products.some((p) => r.query.toLowerCase().includes(p.toLowerCase())) ||
    ['flower', 'pre-roll', 'prerolls', 'vape', 'cartridge', 'edible', 'concentrate', 'rosin', 'indica', 'sativa'].some((kw) => r.query.toLowerCase().includes(kw)),
  );
  const generalQueries = results.filter(
    (r) =>
      !deliveryQueries.includes(r) && !productQueries.includes(r),
  );

  const deliveryCited = deliveryQueries.filter((r) => r.cited).length;
  const productCited = productQueries.filter((r) => r.cited).length;
  const generalCited = generalQueries.filter((r) => r.cited).length;

  if (deliveryQueries.length > 0 && deliveryCited === 0) {
    recommendations.push(
      'Dispensary not appearing for delivery-related queries — consider publishing after-hours delivery content and ensuring "delivery" is listed on Weedmaps, Leafly, and the dispensary website.',
    );
  }

  if (productQueries.length > 0 && productCited / productQueries.length < 0.3) {
    recommendations.push(
      'Low visibility for product-specific queries — create product category pages (flower, pre-rolls, vapes, edibles, concentrates) with strain and terpene detail.',
    );
  }

  if (generalQueries.length > 0 && generalCited / generalQueries.length > 0.5) {
    recommendations.push(
      'Strong performance on general "best dispensary" queries — leverage this brand-awareness momentum with more location-specific content.',
    );
  }

  const perplexityResults = results.filter((r) => r.provider === 'perplexity');
  const chatgptResults = results.filter((r) => r.provider === 'chatgpt');
  const perplexityRate =
    perplexityResults.filter((r) => r.cited).length / (perplexityResults.length || 1);
  const chatgptRate =
    chatgptResults.filter((r) => r.cited).length / (chatgptResults.length || 1);

  if (perplexityRate > chatgptRate + 0.2) {
    recommendations.push(
      'Higher visibility on Perplexity than ChatGPT — focus content strategy on sources ChatGPT favors (Weedmaps/Leafly profiles, cannabis Wikipedia-style pages, authoritative directories).',
    );
  } else if (chatgptRate > perplexityRate + 0.2) {
    recommendations.push(
      'Higher visibility on ChatGPT than Perplexity — create more content on platforms Perplexity indexes well (recent blog posts, news articles, cannabis trade press).',
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      'Maintain current strategy. Continue publishing consistent content to improve citation rates.',
    );
  }

  return recommendations;
}

/**
 * Main GEO test execution
 */
export async function runGeoTest(
  dispensary: DispensaryConfig,
  previousScore: number | null,
  openaiKey: string,
  perplexityKey: string,
): Promise<GeoTestReport> {
  const queryTemplates = geoQueriesConfig.queries;
  const queries = expandQueries(queryTemplates, dispensary);
  const results: GeoResult[] = [];
  const today = new Date().toISOString().split('T')[0];
  let successfulQueries = 0;

  // Run all queries in parallel (batches of 5) to avoid sequential timeout
  const BATCH_SIZE = 5;
  for (let i = 0; i < queries.length; i += BATCH_SIZE) {
    const batch = queries.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.flatMap((query) => [
        // ChatGPT
        queryChatGPT(query, openaiKey)
          .then((response) => {
            const analysis = analyzeCitation(response, dispensary);
            successfulQueries++;
            return { query, provider: 'chatgpt', cited: analysis.cited, position: analysis.position, context: analysis.context, date: today } as GeoResult;
          })
          .catch((err) => {
            console.error(`[geo-tester] ChatGPT failed for "${query}":`, err);
            return null;
          }),
        // Perplexity
        queryPerplexity(query, perplexityKey)
          .then((response) => {
            const analysis = analyzeCitation(response, dispensary);
            successfulQueries++;
            return { query, provider: 'perplexity', cited: analysis.cited, position: analysis.position, context: analysis.context, date: today } as GeoResult;
          })
          .catch((err) => {
            console.error(`[geo-tester] Perplexity failed for "${query}":`, err);
            return null;
          }),
      ]),
    );
    for (const r of batchResults) {
      if (r.status === 'fulfilled' && r.value) results.push(r.value);
    }
    // Brief pause between batches to avoid rate limits
    if (i + BATCH_SIZE < queries.length) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  // Calculate scores
  const citedCount = results.filter((r) => r.cited).length;
  const totalCount = results.length;
  const overallScore = totalCount > 0 ? Math.round((citedCount / totalCount) * 100) : 0;

  // Determine trend
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (previousScore !== null) {
    if (overallScore > previousScore + 5) trend = 'up';
    else if (overallScore < previousScore - 5) trend = 'down';
  }

  const recommendations = generateRecommendations(results, dispensary);

  return {
    test_date: today,
    dispensary: dispensary.dispensary_name,
    city: dispensary.city,
    overall_score: overallScore,
    trend,
    previous_score: previousScore,
    results,
    recommendations,
    total_queries: queries.length * 2, // ×2 for two providers
    successful_queries: successfulQueries,
  };
}
