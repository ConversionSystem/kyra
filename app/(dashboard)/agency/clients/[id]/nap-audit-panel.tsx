'use client';

import { useState } from 'react';
import { MapPin, ExternalLink, CheckCircle2, AlertTriangle, HelpCircle, Copy, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface NapEntry {
  directory: string;
  status: 'match' | 'mismatch' | 'not_found' | 'error' | 'blocked';
  issues: string[];
  last_checked?: string;
  listing_url?: string; // actual scraped listing URL (when found)
}

// Management portal URLs — where the business owner logs in to update their listing
const DIRECTORY_MANAGE: Record<string, string> = {
  'Google Business Profile': 'https://business.google.com',
  'Yelp':                    'https://biz.yelp.com',
  'Facebook':                'https://www.facebook.com/business',
  'YellowPages':             'https://www.yellowpages.com/business/login',
  'Healthgrades':            'https://www.healthgrades.com/business',
  'BBB':                     'https://www.bbb.org/businesses',
  'Manta':                   'https://www.manta.com/manage',
  'Superpages':              'https://www.superpages.com/advertise',
  'Angi':                    'https://pro.angi.com',
  'VetRatingz':              'https://www.vetratingz.com/add-listing',
  'AVMA Find-a-Vet':         'https://www.avma.org/membership/member-services/practice-listing',
  'PetDesk':                 'https://www.petdesk.com/for-vets',
  'BringFido':               'https://www.bringfido.com/add-listing',
  'CitySearch':              'https://www.citysearch.com',
  'MapQuest':                'https://business.mapquest.com',
};

/**
 * Build a personalized search URL for a directory using the business name + city.
 * This sends the user directly to search results for THEIR specific business,
 * not a generic category page.
 */
function buildSearchUrl(directory: string, businessName: string, city: string): string {
  const q  = encodeURIComponent(businessName);
  const loc = encodeURIComponent(city);
  const qLoc = encodeURIComponent(`${businessName} ${city}`);

  const patterns: Record<string, string> = {
    'Google Business Profile': `https://www.google.com/maps/search/${qLoc}`,
    'Yelp':         `https://www.yelp.com/search?find_desc=${q}&find_loc=${loc}`,
    'Facebook':     `https://www.facebook.com/search/pages/?q=${qLoc}`,
    'YellowPages':  `https://www.yellowpages.com/search?search_terms=${q}&geo_location_terms=${loc}`,
    'Healthgrades': `https://www.healthgrades.com/search?what=${q}&where=${loc}`,
    'BBB':          `https://www.bbb.org/search?find_text=${q}&find_loc=${loc}`,
    'Manta':        `https://www.manta.com/search?search=${qLoc}`,
    'Superpages':   `https://www.superpages.com/search?search_terms=${q}&geo_location_terms=${loc}`,
    'Angi':         `https://www.angi.com/search?what=${q}&where=${loc}`,
    'VetRatingz':   `https://www.vetratingz.com/search?q=${qLoc}`,
    'AVMA Find-a-Vet': `https://www.avma.org/resources-tools/pet-owners/petcare/finding-a-veterinarian`,
    'PetDesk':      `https://www.petdesk.com/search?q=${qLoc}`,
    'BringFido':    `https://www.bringfido.com/search/?action=search&q=${qLoc}`,
    'CitySearch':   `https://www.citysearch.com/search?what=${q}&where=${loc}`,
    'MapQuest':     `https://www.mapquest.com/search/results?query=${qLoc}`,
  };

  return patterns[directory] ?? `https://www.google.com/search?q=${qLoc}+${encodeURIComponent(directory)}`;
}

/**
 * Get the best link for a directory entry:
 * 1. Use actual scraped listing_url if available (most specific)
 * 2. Fall back to personalized search URL with business name + city
 * Never return generic homepage or category links.
 */
function getDirectoryLink(
  entry: NapEntry,
  businessName: string,
  city: string,
  mode: 'view' | 'manage',
): string {
  if (mode === 'view' && entry.listing_url) {
    return entry.listing_url; // exact listing page from scraper
  }
  if (mode === 'manage' && DIRECTORY_MANAGE[entry.directory]) {
    return DIRECTORY_MANAGE[entry.directory];
  }
  return buildSearchUrl(entry.directory, businessName, city);
}

/**
 * Parse raw issue string into a human-readable label.
 * Input examples:
 *   "Website: 'https://lh3.googleusercontent.com' vs 'https://amerivet.com/'"
 *   "Phone: '(100) 218-3011' vs '855-621-2500'"
 *   "Name: 'Amerivet San Antonio' vs 'AmeriVet'"
 */
function humanizeIssue(raw: string): { field: string; found: string; expected: string } | string {
  const match = raw.match(/^(\w[\w\s]*?):\s*'([^']*)'\s*vs\s*'([^']*)'/);
  if (!match) {
    // Handle special cases
    if (raw.includes('blocked scraping')) return 'Blocked — needs manual check';
    if (raw.includes('not found')) return 'Listing not found on this directory';
    return raw;
  }
  const [, field, found, expected] = match;
  return { field: field.trim(), found, expected };
}

function IssueRow({ raw }: { raw: string }) {
  const parsed = humanizeIssue(raw);

  if (typeof parsed === 'string') {
    return <p className="text-xs text-amber-700 mt-1">{parsed}</p>;
  }

  const fieldLabel = parsed.field === 'Website' ? '🌐 Website'
    : parsed.field === 'Phone' ? '📞 Phone'
    : parsed.field === 'Name' ? '🏥 Name'
    : parsed.field === 'Address' ? '📍 Address'
    : `⚠️ ${parsed.field}`;

  // Shorten long URLs for display
  const shorten = (s: string) => s.length > 35 ? s.slice(0, 32) + '…' : s;

  return (
    <div className="mt-1.5 bg-amber-50 rounded-md p-2 text-xs">
      <p className="font-semibold text-amber-800 mb-1">{fieldLabel} mismatch</p>
      <div className="space-y-0.5">
        <div className="flex gap-1.5 items-start">
          <span className="text-red-500 shrink-0 font-semibold">Found:</span>
          <span className="text-gray-600 break-all">{shorten(parsed.found) || '(empty)'}</span>
        </div>
        <div className="flex gap-1.5 items-start">
          <span className="text-emerald-600 shrink-0 font-semibold">Should be:</span>
          <span className="text-gray-600 break-all">{shorten(parsed.expected) || '(empty)'}</span>
        </div>
      </div>
    </div>
  );
}

export function NAPAuditPanel({ entries, businessName = '', city = '' }: { entries: NapEntry[]; businessName?: string; city?: string }) {
  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            NAP Consistency Audit
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-gray-500 py-6 text-center">
            No audit run yet. Click <strong>NAP Audit</strong> above to check all 15 directories.
          </p>
        </CardContent>
      </Card>
    );
  }

  const matches = entries.filter(e => e.status === 'match');
  const mismatches = entries.filter(e => e.status === 'mismatch');
  const missing = entries.filter(e => e.status === 'not_found' || e.status === 'error' || e.status === 'blocked');

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            NAP Consistency Audit
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            {matches.length > 0 && (
              <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200 font-medium">
                ✓ {matches.length} consistent
              </span>
            )}
            {mismatches.length > 0 && (
              <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full border border-amber-200 font-medium">
                ⚠ {mismatches.length} need fixing
              </span>
            )}
            {missing.length > 0 && (
              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full border border-gray-200 font-medium">
                {missing.length} not listed
              </span>
            )}
          </div>
        </div>

        {mismatches.length > 0 && (
          <p className="text-xs text-amber-700 mt-2 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            <strong>Action needed:</strong> {mismatches.length} director{mismatches.length === 1 ? 'y has' : 'ies have'} incorrect info. Click the directory name to open it and update your listing.
          </p>
        )}
      </CardHeader>

      <CardContent className="pt-0 space-y-2">
        {/* Mismatches first — needs action */}
        {mismatches.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">⚠ Needs Fixing</p>
            <div className="space-y-2">
              {mismatches.map((entry, i) => {
                const viewUrl   = getDirectoryLink(entry, businessName, city, 'view');
                const manageUrl = getDirectoryLink(entry, businessName, city, 'manage');
                return (
                  <div key={i} className="border border-amber-200 rounded-lg p-3 bg-amber-50/50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {/* Link to the actual listing so they can see what's wrong */}
                        <a href={viewUrl} target="_blank" rel="noopener noreferrer"
                          className="text-sm font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 w-fit">
                          {entry.directory}
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                        {entry.issues.map((issue, j) => (
                          <IssueRow key={j} raw={issue} />
                        ))}
                        {/* Separate manage link */}
                        <a href={manageUrl} target="_blank" rel="noopener noreferrer"
                          className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-indigo-500 hover:text-indigo-700">
                          Update listing →
                        </a>
                      </div>
                      <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded border border-amber-300 font-medium shrink-0">
                        Fix needed
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Consistent */}
        {matches.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2 mt-3">✓ Consistent</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {matches.map((entry, i) => {
                const viewUrl = getDirectoryLink(entry, businessName, city, 'view');
                return (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <a href={viewUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs font-medium text-emerald-800 hover:text-indigo-700 truncate">
                      {entry.directory}
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Not found / missing */}
        {missing.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 mt-3">Not Listed (opportunity)</p>
            <p className="text-xs text-gray-400 mb-2">Getting listed on these directories will improve your local SEO and AI citations.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {missing.map((entry, i) => {
                const manageUrl = getDirectoryLink(entry, businessName, city, 'manage');
                const isBlocked = entry.status === 'blocked' || entry.issues.some(issue => issue.includes('blocked'));
                return (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                    {isBlocked
                      ? <HelpCircle className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      : <AlertTriangle className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
                    <a href={manageUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs font-medium text-gray-600 hover:text-indigo-700 truncate flex items-center gap-1">
                      {entry.directory}
                      <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-50" />
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
