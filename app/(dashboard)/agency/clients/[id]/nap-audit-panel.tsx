'use client';

import { MapPin, ExternalLink, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface NapEntry {
  directory: string;
  status: 'match' | 'mismatch' | 'not_found' | 'error' | 'blocked';
  issues: string[];
  last_checked?: string;
}

// Direct links to each directory's management/search page
const DIRECTORY_LINKS: Record<string, { manage: string; search: string }> = {
  'Google Business Profile': {
    manage: 'https://business.google.com',
    search: 'https://www.google.com/maps/search/',
  },
  'Yelp': {
    manage: 'https://biz.yelp.com',
    search: 'https://www.yelp.com/search?find_desc=veterinarian',
  },
  'Facebook': {
    manage: 'https://www.facebook.com/business',
    search: 'https://www.facebook.com/search/pages/?q=veterinarian',
  },
  'YellowPages': {
    manage: 'https://www.yellowpages.com/business/login',
    search: 'https://www.yellowpages.com/search?search_terms=veterinarian',
  },
  'Healthgrades': {
    manage: 'https://www.healthgrades.com/business',
    search: 'https://www.healthgrades.com/find-a-doctor',
  },
  'BBB': {
    manage: 'https://www.bbb.org/businesses',
    search: 'https://www.bbb.org/search?type=accredited&find_text=veterinarian',
  },
  'Manta': {
    manage: 'https://www.manta.com/manage',
    search: 'https://www.manta.com/search?search=veterinarian',
  },
  'Superpages': {
    manage: 'https://www.superpages.com/advertise',
    search: 'https://www.superpages.com/search?search_terms=veterinarian',
  },
  'Angi': {
    manage: 'https://pro.angi.com',
    search: 'https://www.angi.com/companylist/us/veterinarians.htm',
  },
  'VetRatingz': {
    manage: 'https://www.vetratingz.com/add-listing',
    search: 'https://www.vetratingz.com',
  },
  'AVMA Find-a-Vet': {
    manage: 'https://www.avma.org/membership/member-services/practice-listing',
    search: 'https://www.avma.org/resources-tools/pet-owners/petcare/finding-a-veterinarian',
  },
  'PetDesk': {
    manage: 'https://www.petdesk.com/for-vets',
    search: 'https://www.petdesk.com',
  },
  'BringFido': {
    manage: 'https://www.bringfido.com/add-listing',
    search: 'https://www.bringfido.com/attraction/type/vets',
  },
  'CitySearch': {
    manage: 'https://www.citysearch.com',
    search: 'https://www.citysearch.com/search?what=veterinarian',
  },
  'MapQuest': {
    manage: 'https://business.mapquest.com',
    search: 'https://www.mapquest.com/search/results?query=veterinarian',
  },
};

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

export function NAPAuditPanel({ entries }: { entries: NapEntry[] }) {
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
                const links = DIRECTORY_LINKS[entry.directory];
                return (
                  <div key={i} className="border border-amber-200 rounded-lg p-3 bg-amber-50/50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {links ? (
                          <a href={links.manage} target="_blank" rel="noopener noreferrer"
                            className="text-sm font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 w-fit">
                            {entry.directory}
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        ) : (
                          <p className="text-sm font-semibold text-gray-800">{entry.directory}</p>
                        )}
                        {entry.issues.map((issue, j) => (
                          <IssueRow key={j} raw={issue} />
                        ))}
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
            <div className="grid grid-cols-2 gap-1.5">
              {matches.map((entry, i) => {
                const links = DIRECTORY_LINKS[entry.directory];
                return (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    {links ? (
                      <a href={links.search} target="_blank" rel="noopener noreferrer"
                        className="text-xs font-medium text-emerald-800 hover:text-indigo-700 truncate">
                        {entry.directory}
                      </a>
                    ) : (
                      <span className="text-xs font-medium text-emerald-800 truncate">{entry.directory}</span>
                    )}
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
            <div className="grid grid-cols-2 gap-1.5">
              {missing.map((entry, i) => {
                const links = DIRECTORY_LINKS[entry.directory];
                const isBlocked = entry.status === 'blocked' || entry.issues.some(i => i.includes('blocked'));
                return (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                    {isBlocked
                      ? <HelpCircle className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      : <AlertTriangle className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
                    {links ? (
                      <a href={links.manage} target="_blank" rel="noopener noreferrer"
                        className="text-xs font-medium text-gray-600 hover:text-indigo-700 truncate flex items-center gap-1">
                        {entry.directory}
                        <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-50" />
                      </a>
                    ) : (
                      <span className="text-xs font-medium text-gray-500 truncate">{entry.directory}</span>
                    )}
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
