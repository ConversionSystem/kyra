/**
 * Lead Source Abstraction — shared types for all lead providers.
 *
 * Every lead source (Outscraper, AI Discovery, CSV) returns the same shape
 * so the pipeline doesn't care where leads come from.
 */

export interface RawLead {
  company: string;
  website: string | null;
  phone: string | null;
  email: string | null;
  industry: string | null;
  location: string | null;
  full_address: string | null;
  company_size: string | null;
  rating: number | null;
  reviews_count: number | null;
  // Optional enrichment from the source itself
  description: string | null;
  social_links: Record<string, string> | null;
}

export type LeadSourceType = 'google_maps' | 'ai_discovery' | 'csv_upload';

export interface LeadSourceConfig {
  type: LeadSourceType;
  query: string;         // e.g. "cannabis dispensaries"
  location: string;      // e.g. "Los Angeles, CA"
  limit: number;         // max leads to return
  // For AI discovery:
  role?: string;
  companySize?: string;
  // For CSV:
  csvData?: CsvLeadRow[];
}

export interface CsvLeadRow {
  company: string;
  website?: string;
  phone?: string;
  email?: string;
  industry?: string;
  location?: string;
  full_name?: string;
  title?: string;
}

export interface LeadSourceResult {
  source: LeadSourceType;
  leads: RawLead[];
  total: number;
  cost_estimate?: string; // e.g. "$0.03"
  warning?: string;       // e.g. "AI-generated leads may not be real businesses"
}

export type StreamCallback = (event: string, data: Record<string, unknown>) => void;
