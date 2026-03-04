/**
 * GEO Tester — Executable skill for the Vet SEO Worker
 *
 * Tests whether a veterinary clinic appears in AI-generated search results.
 * Queries ChatGPT and Perplexity with 25 location-specific queries.
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
  clinic: string;
  city: string;
  overall_score: number;
  trend: 'up' | 'down' | 'stable';
  previous_score: number | null;
  results: GeoResult[];
  recommendations: string[];
  total_queries: number;
  successful_queries: number;
}

interface ClinicConfig {
  clinic_name: string;
  city: string;
  state: string;
  address: string;
  address_area: string;
  phone: string;
  website: string;
  services: string[];
}

/**
 * Substitute template variables in a query string
 */
function substituteQuery(template: string, clinic: ClinicConfig): string {
  return template
    .replace(/\{\{CITY\}\}/g, clinic.city)
    .replace(/\{\{CLINIC_NAME\}\}/g, clinic.clinic_name)
    .replace(/\{\{ADDRESS_AREA\}\}/g, clinic.address_area)
    .replace(/\{\{STATE\}\}/g, clinic.state)
    .replace(/\{\{SERVICE\}\}/g, clinic.services[0] || 'veterinary care');
}

/**
 * Check if the clinic is mentioned in an AI response
 */
function analyzeCitation(
  response: string,
  clinic: ClinicConfig,
): { cited: boolean; position: number | null; context: string } {
  const lowerResponse = response.toLowerCase();
  const clinicLower = clinic.clinic_name.toLowerCase();
  const phoneCleaned = clinic.phone.replace(/\D/g, '');

  // Check for clinic name mention
  const nameIndex = lowerResponse.indexOf(clinicLower);
  const phoneIndex = lowerResponse.indexOf(phoneCleaned);
  const websiteIndex = lowerResponse.indexOf(
    clinic.website.replace(/^https?:\/\//, '').toLowerCase(),
  );

  const cited = nameIndex !== -1 || phoneIndex !== -1 || websiteIndex !== -1;

  // Estimate position: count how many "businesses" are mentioned before this one
  let position: number | null = null;
  if (cited && nameIndex !== -1) {
    // Count numbered list items or distinct business mentions before our clinic
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
            'You are a helpful assistant answering questions about local businesses and services. Provide specific recommendations with names, addresses, and details when possible.',
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
            'You are a helpful assistant answering questions about local businesses. Be specific with names and locations.',
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
 * Generate service-specific query variations
 */
function expandQueries(
  templates: string[],
  clinic: ClinicConfig,
): string[] {
  const expanded: string[] = [];

  for (const template of templates) {
    if (template.includes('{{SERVICE}}')) {
      // Expand for top 3 services
      for (const service of clinic.services.slice(0, 3)) {
        expanded.push(
          substituteQuery(template.replace('{{SERVICE}}', service), clinic),
        );
      }
    } else {
      expanded.push(substituteQuery(template, clinic));
    }
  }

  return expanded;
}

/**
 * Generate recommendations based on test results
 */
function generateRecommendations(
  results: GeoResult[],
  clinic: ClinicConfig,
): string[] {
  const recommendations: string[] = [];

  // Group by query type
  const emergencyQueries = results.filter((r) =>
    r.query.toLowerCase().includes('emergency'),
  );
  const serviceQueries = results.filter((r) =>
    clinic.services.some((s) => r.query.toLowerCase().includes(s.toLowerCase())),
  );
  const generalQueries = results.filter(
    (r) =>
      !emergencyQueries.includes(r) && !serviceQueries.includes(r),
  );

  const emergencyCited = emergencyQueries.filter((r) => r.cited).length;
  const serviceCited = serviceQueries.filter((r) => r.cited).length;
  const generalCited = generalQueries.filter((r) => r.cited).length;

  if (emergencyQueries.length > 0 && emergencyCited === 0) {
    recommendations.push(
      'Clinic not appearing for emergency-related queries — consider publishing emergency vet content and ensuring "emergency" services are listed on all directories.',
    );
  }

  if (serviceQueries.length > 0 && serviceCited / serviceQueries.length < 0.3) {
    recommendations.push(
      'Low visibility for service-specific queries — create service-focused content pages for each specialty.',
    );
  }

  if (generalQueries.length > 0 && generalCited / generalQueries.length > 0.5) {
    recommendations.push(
      'Strong performance on general "best vet" queries — leverage this momentum with more location-specific content.',
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
      'Higher visibility on Perplexity than ChatGPT — focus content strategy on sources ChatGPT favors (authoritative directories, Wikipedia-style pages).',
    );
  } else if (chatgptRate > perplexityRate + 0.2) {
    recommendations.push(
      'Higher visibility on ChatGPT than Perplexity — create more content on platforms Perplexity indexes well (recent blog posts, news articles).',
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
  clinic: ClinicConfig,
  previousScore: number | null,
  openaiKey: string,
  perplexityKey: string,
): Promise<GeoTestReport> {
  const queryTemplates = geoQueriesConfig.queries;
  const queries = expandQueries(queryTemplates, clinic);
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
            const analysis = analyzeCitation(response, clinic);
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
            const analysis = analyzeCitation(response, clinic);
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

  const recommendations = generateRecommendations(results, clinic);

  return {
    test_date: today,
    clinic: clinic.clinic_name,
    city: clinic.city,
    overall_score: overallScore,
    trend,
    previous_score: previousScore,
    results,
    recommendations,
    total_queries: queries.length * 2, // ×2 for two providers
    successful_queries: successfulQueries,
  };
}
