/**
 * City Data Enrichment
 *
 * Provides real city-level data (population, median income, neighborhoods,
 * climate, landmarks) for content differentiation in city×service pages.
 *
 * Data sources (all free, public):
 * - US Census Bureau API (population, income, home values)
 * - Static climate zone datasets
 * - LLM-generated neighborhood/landmark data (cached in DB)
 *
 * Usage: Call ensureCityData(city, state) before generating city pages.
 * The data is cached in seo_city_data table to avoid repeated API calls.
 */

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

// ── Types ────────────────────────────────────────────────────────────────

export interface CityData {
  id: string;
  city: string;
  state: string;
  population: number | null;
  median_income: number | null;
  median_home_age: number | null;
  median_home_value: number | null;
  climate_zone: string | null;
  county: string | null;
  neighborhoods: string[];
  local_landmarks: string[];
  climate_notes: string | null;
  seasonal_factors: string[];
  data_source: string | null;
}

// ── Constants ────────────────────────────────────────────────────────────

const CENSUS_API_KEY = process.env.CENSUS_API_KEY || '';
const CENSUS_ACS_URL = 'https://api.census.gov/data/2022/acs/acs5';

// State FIPS codes for Census API
const STATE_FIPS: Record<string, string> = {
  'AL': '01', 'AK': '02', 'AZ': '04', 'AR': '05', 'CA': '06', 'CO': '08',
  'CT': '09', 'DE': '10', 'FL': '12', 'GA': '13', 'HI': '15', 'ID': '16',
  'IL': '17', 'IN': '18', 'IA': '19', 'KS': '20', 'KY': '21', 'LA': '22',
  'ME': '23', 'MD': '24', 'MA': '25', 'MI': '26', 'MN': '27', 'MS': '28',
  'MO': '29', 'MT': '30', 'NE': '31', 'NV': '32', 'NH': '33', 'NJ': '34',
  'NM': '35', 'NY': '36', 'NC': '37', 'ND': '38', 'OH': '39', 'OK': '40',
  'OR': '41', 'PA': '42', 'RI': '44', 'SC': '45', 'SD': '46', 'TN': '47',
  'TX': '48', 'UT': '49', 'VT': '50', 'VA': '51', 'WA': '53', 'WV': '54',
  'WI': '55', 'WY': '56', 'DC': '11',
};

// USDA Plant Hardiness Zones by state (simplified — representative zone for each state)
const STATE_CLIMATE_ZONES: Record<string, string> = {
  'AL': '8a', 'AK': '4a', 'AZ': '9b', 'AR': '7b', 'CA': '9b', 'CO': '5b',
  'CT': '6b', 'DE': '7a', 'FL': '10a', 'GA': '8a', 'HI': '11a', 'ID': '5b',
  'IL': '5b', 'IN': '5b', 'IA': '5a', 'KS': '6a', 'KY': '6b', 'LA': '9a',
  'ME': '5a', 'MD': '7a', 'MA': '6b', 'MI': '5b', 'MN': '4a', 'MS': '8a',
  'MO': '6a', 'MT': '4b', 'NE': '5a', 'NV': '7a', 'NH': '5b', 'NJ': '7a',
  'NM': '7a', 'NY': '6a', 'NC': '7b', 'ND': '4a', 'OH': '6a', 'OK': '7a',
  'OR': '8b', 'PA': '6b', 'RI': '6b', 'SC': '8a', 'SD': '4b', 'TN': '7a',
  'TX': '8b', 'UT': '6a', 'VT': '4b', 'VA': '7a', 'WA': '8b', 'WV': '6a',
  'WI': '4b', 'WY': '4b', 'DC': '7a',
};

// ── Public API ───────────────────────────────────────────────────────────

/**
 * Get city data from DB. Returns null if not cached.
 */
export async function getCityData(city: string, state: string): Promise<CityData | null> {
  const supabase = createServiceClientWithoutCookies();
  const normalizedCity = city.trim();
  const normalizedState = normalizeState(state);

  const { data, error } = await supabase
    .from('seo_city_data')
    .select('*')
    .eq('city', normalizedCity)
    .eq('state', normalizedState)
    .single();

  if (error || !data) return null;
  return data as unknown as CityData;
}

/**
 * Ensure city data exists in DB. If not cached, fetch from Census API
 * and cache it. Returns the city data record.
 */
export async function ensureCityData(city: string, state: string): Promise<CityData | null> {
  const normalizedCity = city.trim();
  const normalizedState = normalizeState(state);

  // Check cache first
  const cached = await getCityData(normalizedCity, normalizedState);
  if (cached) return cached;

  // Fetch from Census API + static datasets
  const enriched = await fetchCityEnrichment(normalizedCity, normalizedState);

  // Cache in DB
  const supabase = createServiceClientWithoutCookies();
  const { data, error } = await supabase
    .from('seo_city_data')
    .upsert(
      {
        city: normalizedCity,
        state: normalizedState,
        population: enriched.population,
        median_income: enriched.median_income,
        median_home_age: enriched.median_home_age,
        median_home_value: enriched.median_home_value,
        climate_zone: enriched.climate_zone,
        county: enriched.county,
        neighborhoods: enriched.neighborhoods,
        local_landmarks: enriched.local_landmarks,
        climate_notes: enriched.climate_notes,
        seasonal_factors: enriched.seasonal_factors,
        data_source: enriched.data_source,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'city,state' },
    )
    .select('*')
    .single();

  if (error || !data) {
    console.error('[city-data] Failed to cache city data:', error?.message);
    return null;
  }

  return data as unknown as CityData;
}


// ── Census API ───────────────────────────────────────────────────────────

interface CensusEnrichment {
  population: number | null;
  median_income: number | null;
  median_home_age: number | null;
  median_home_value: number | null;
  climate_zone: string | null;
  county: string | null;
  neighborhoods: string[];
  local_landmarks: string[];
  climate_notes: string | null;
  seasonal_factors: string[];
  data_source: string;
}

async function fetchCityEnrichment(city: string, state: string): Promise<CensusEnrichment> {
  const result: CensusEnrichment = {
    population: null,
    median_income: null,
    median_home_age: null,
    median_home_value: null,
    climate_zone: STATE_CLIMATE_ZONES[state] || null,
    county: null,
    neighborhoods: [],
    local_landmarks: [],
    climate_notes: getClimateNotes(state),
    seasonal_factors: getSeasonalFactors(state),
    data_source: 'static',
  };

  // Try Census API if key is configured
  if (CENSUS_API_KEY) {
    try {
      const censusData = await fetchCensusData(city, state);
      if (censusData) {
        result.population = censusData.population;
        result.median_income = censusData.median_income;
        result.median_home_value = censusData.median_home_value;
        result.median_home_age = censusData.median_home_age;
        result.data_source = 'census_acs_2022';
      }
    } catch (err) {
      console.warn(`[city-data] Census API failed for ${city}, ${state}:`, err);
    }
  }

  return result;
}

interface CensusResult {
  population: number | null;
  median_income: number | null;
  median_home_value: number | null;
  median_home_age: number | null;
}

async function fetchCensusData(city: string, state: string): Promise<CensusResult | null> {
  const fips = STATE_FIPS[state];
  if (!fips) return null;

  // Census variables:
  // B01003_001E = total population
  // B19013_001E = median household income
  // B25077_001E = median home value
  // B25035_001E = median year structure built
  const variables = 'B01003_001E,B19013_001E,B25077_001E,B25035_001E';
  const placeName = `${city} city`;

  try {
    const url = `${CENSUS_ACS_URL}?get=NAME,${variables}&for=place:*&in=state:${fips}&key=${CENSUS_API_KEY}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });

    if (!res.ok) return null;

    const data = (await res.json()) as string[][];
    if (!data || data.length < 2) return null;

    // Find the matching city row (case-insensitive, partial match)
    const headers = data[0];
    const cityLower = placeName.toLowerCase();
    const row = data.slice(1).find(r =>
      r[0]?.toLowerCase().includes(cityLower) ||
      r[0]?.toLowerCase().includes(city.toLowerCase()),
    );

    if (!row) return null;

    const popIdx = headers.indexOf('B01003_001E');
    const incIdx = headers.indexOf('B19013_001E');
    const valIdx = headers.indexOf('B25077_001E');
    const ageIdx = headers.indexOf('B25035_001E');

    const parseNum = (val: string | undefined) => {
      if (!val || val === '-666666666' || val === 'null') return null;
      const n = parseInt(val, 10);
      return isNaN(n) ? null : n;
    };

    const medianYearBuilt = parseNum(row[ageIdx]);
    const currentYear = new Date().getFullYear();

    return {
      population: parseNum(row[popIdx]),
      median_income: parseNum(row[incIdx]),
      median_home_value: parseNum(row[valIdx]),
      median_home_age: medianYearBuilt ? currentYear - medianYearBuilt : null,
    };
  } catch {
    return null;
  }
}

// ── Static Data ──────────────────────────────────────────────────────────

function getClimateNotes(state: string): string | null {
  const climateMap: Record<string, string> = {
    'AZ': 'Hot desert climate with extreme summer heat (100-115°F). Low humidity.',
    'TX': 'Hot summers, mild winters. Humidity varies by region. Frequent severe weather.',
    'FL': 'Subtropical. Hot humid summers, mild winters. Hurricane season June-November.',
    'CA': 'Mediterranean climate (coastal) to desert (inland). Mild year-round.',
    'NY': 'Four distinct seasons. Cold winters, warm humid summers. Snow belt regions.',
    'IL': 'Continental climate. Cold winters, hot summers. Wide temperature swings.',
    'CO': 'Semi-arid. Cold winters, warm summers. High altitude, low humidity.',
    'WA': 'Marine climate (west) to semi-arid (east). Mild but rainy winters.',
    'GA': 'Humid subtropical. Hot summers, mild winters. Frequent thunderstorms.',
    'OH': 'Humid continental. Cold winters, warm summers. Lake-effect snow near Cleveland.',
    'PA': 'Humid continental. Cold winters, warm summers. Moderate precipitation.',
    'MN': 'Continental. Very cold winters (-10°F), warm summers (85°F). Heavy snow.',
    'MI': 'Humid continental. Lake-effect snow. Cold winters, moderate summers.',
    'NC': 'Humid subtropical. Mild winters, hot summers. Mountain areas cooler.',
    'NV': 'Arid desert. Extreme heat in summer (110°F+). Cool winters in north.',
    'OR': 'Marine west coast. Mild, wet winters. Dry warm summers.',
  };
  return climateMap[state] || null;
}

function getSeasonalFactors(state: string): string[] {
  const factors: Record<string, string[]> = {
    'AZ': ['Extreme summer heat requires robust cooling', 'Monsoon season July-September', 'Winter is mild, less heating demand'],
    'TX': ['Summer AC demand is critical (100°F+)', 'Severe storms can damage property', 'Freeze events rare but destructive'],
    'FL': ['Year-round AC demand', 'Hurricane preparedness essential', 'High humidity causes mold/moisture issues'],
    'CA': ['Wildfire season impacts air quality', 'Drought conditions affect landscaping', 'Earthquake preparedness important'],
    'NY': ['Winter heating is essential', 'Snow and ice damage common', 'Spring flooding in some areas'],
    'IL': ['Extreme cold requires reliable heating', 'Summer storms and tornado risk', 'Spring thaw causes water issues'],
    'CO': ['High altitude affects HVAC efficiency', 'Winter snow loads on roofs', 'Dry air requires humidification'],
    'MN': ['Extreme cold requires reliable heating systems', 'Heavy snow loads on structures', 'Short summer season for outdoor work'],
  };
  return factors[state] || [];
}

// ── Utilities ────────────────────────────────────────────────────────────

/**
 * Normalize state to 2-letter code.
 */
function normalizeState(state: string): string {
  const trimmed = state.trim().toUpperCase();
  if (trimmed.length === 2) return trimmed;

  const stateNames: Record<string, string> = {
    'ALABAMA': 'AL', 'ALASKA': 'AK', 'ARIZONA': 'AZ', 'ARKANSAS': 'AR',
    'CALIFORNIA': 'CA', 'COLORADO': 'CO', 'CONNECTICUT': 'CT', 'DELAWARE': 'DE',
    'FLORIDA': 'FL', 'GEORGIA': 'GA', 'HAWAII': 'HI', 'IDAHO': 'ID',
    'ILLINOIS': 'IL', 'INDIANA': 'IN', 'IOWA': 'IA', 'KANSAS': 'KS',
    'KENTUCKY': 'KY', 'LOUISIANA': 'LA', 'MAINE': 'ME', 'MARYLAND': 'MD',
    'MASSACHUSETTS': 'MA', 'MICHIGAN': 'MI', 'MINNESOTA': 'MN', 'MISSISSIPPI': 'MS',
    'MISSOURI': 'MO', 'MONTANA': 'MT', 'NEBRASKA': 'NE', 'NEVADA': 'NV',
    'NEW HAMPSHIRE': 'NH', 'NEW JERSEY': 'NJ', 'NEW MEXICO': 'NM', 'NEW YORK': 'NY',
    'NORTH CAROLINA': 'NC', 'NORTH DAKOTA': 'ND', 'OHIO': 'OH', 'OKLAHOMA': 'OK',
    'OREGON': 'OR', 'PENNSYLVANIA': 'PA', 'RHODE ISLAND': 'RI', 'SOUTH CAROLINA': 'SC',
    'SOUTH DAKOTA': 'SD', 'TENNESSEE': 'TN', 'TEXAS': 'TX', 'UTAH': 'UT',
    'VERMONT': 'VT', 'VIRGINIA': 'VA', 'WASHINGTON': 'WA', 'WEST VIRGINIA': 'WV',
    'WISCONSIN': 'WI', 'WYOMING': 'WY', 'DISTRICT OF COLUMBIA': 'DC',
  };

  return stateNames[trimmed] || trimmed.slice(0, 2);
}
