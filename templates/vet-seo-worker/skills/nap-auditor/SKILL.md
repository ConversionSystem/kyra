# NAP Auditor Skill

Scrape veterinary directories and compare Name, Address, Phone data against the clinic's master record. Flag inconsistencies.

## When to Use

- Weekly NAP consistency audit (Wednesday cron)
- After the agency updates client info
- On initial setup to establish baseline

## How It Works

1. Load master NAP data from client config (clinic_name, address, phone, website)
2. For each directory in vet-directories.json (15 total):
   a. Use Firecrawl to scrape the search results page
   b. Extract the clinic's listing (if found)
   c. Compare each field against master data
   d. Score: `match` | `mismatch` | `not_found`
3. Compile audit report with specific mismatches flagged
4. Store results via Kyra SEO API
5. Flag critical mismatches for agency review

## Directories Audited (15)

1. Google Business Profile (critical)
2. Yelp (critical)
3. Facebook (high)
4. YellowPages (high)
5. Healthgrades (high)
6. VetRatingz (high)
7. AVMA Find-a-Vet (high)
8. BBB (medium)
9. Manta (medium)
10. Superpages (medium)
11. Angi (medium)
12. PetDesk (medium)
13. BringFido (medium)
14. CitySearch (low)
15. MapQuest (low)

## Comparison Rules

### Name Matching
- Fuzzy match (Levenshtein distance < 3)
- Handle common variations: "Vet" vs "Veterinary", "Clinic" vs "Hospital"
- Ignore: LLC, Inc, DBA prefixes/suffixes

### Address Matching
- Normalize: St/Street, Ave/Avenue, Dr/Drive, Ste/Suite
- Compare street number + street name (ignore unit/suite differences)
- Flag if ZIP code differs

### Phone Matching
- Strip all formatting: (402) 555-0123 = 4025550123
- Flag if any digit differs

### Website Matching
- Normalize: strip http(s)://, www., trailing slashes
- Compare domain + path

## Output Format

```json
{
  "audit_date": "2026-03-04",
  "clinic": "Goodrich Veterinary Clinic",
  "master_nap": {
    "name": "Goodrich Veterinary Clinic",
    "address": "1234 Main St, Omaha, NE 68102",
    "phone": "(402) 555-0123",
    "website": "https://goodrichvet.com"
  },
  "results": [
    {
      "directory": "Yelp",
      "status": "mismatch",
      "found_data": {
        "name": "Goodrich Vet Clinic",
        "address": "1234 Main Street, Omaha, NE 68102",
        "phone": "(402) 555-0123"
      },
      "issues": ["Name: 'Goodrich Vet Clinic' vs 'Goodrich Veterinary Clinic'"],
      "last_checked": "2026-03-04T10:00:00Z"
    }
  ],
  "summary": {
    "total_directories": 15,
    "consistent": 10,
    "mismatches": 3,
    "not_found": 2
  },
  "action_items": [
    "Update Yelp listing — name should be 'Goodrich Veterinary Clinic'",
    "Claim BringFido listing — clinic not found"
  ]
}
```

## Dependencies

- `firecrawl-search` (ClawHub) — for web scraping
- Firecrawl API key (managed by Kyra)

## Cost

- ~15 Firecrawl scrapes per audit × $0.005/scrape = ~$0.075 per audit
- Weekly = ~$0.30/month per client

## Error Handling

- If Firecrawl fails for a directory: mark as "error", try again next week
- If >5 directories fail: flag as "incomplete audit" in report
- Never block on a single directory failure
- Some directories may block scraping — mark as "blocked" and suggest manual check
