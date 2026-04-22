# NAP Auditor Skill

Scrape cannabis directories and compare Name, Address, Phone data against the dispensary's master record. Flag inconsistencies.

## When to Use

- Weekly NAP consistency audit (Wednesday cron)
- After the agency updates dispensary info
- On initial setup to establish baseline

## How It Works

1. Load master NAP data from client config (dispensary_name, address, phone, website, license_number)
2. For each directory in dispensary-directories.json (20 total):
   a. Use Firecrawl to scrape the search results page
   b. Extract the dispensary's listing (if found)
   c. Compare each field against master data
   d. Score: `match` | `mismatch` | `not_found`
3. Compile audit report with specific mismatches flagged
4. Store results via Kyra SEO API
5. Flag critical mismatches for agency review

## Directories Audited (20)

1. Google Business Profile (critical)
2. Weedmaps (critical)
3. Leafly (critical)
4. Jane (high)
5. Dutchie (high)
6. AllBud (high)
7. Yelp (high)
8. Facebook (high)
9. Cannabis.net (high)
10. Merry Jane (high)
11. BudTrader (medium)
12. Cannabis Reports (medium)
13. SeshLyfe (medium)
14. Budista (medium)
15. Nextdoor (medium)
16. Apple Maps (medium — feeds Siri)
17. Bing Places (medium — feeds Copilot)
18. Foursquare (medium)
19. MapQuest (low)
20. CitySearch (low)
21. Angi (low)

## Comparison Rules

### Name Matching
- Fuzzy match (Levenshtein distance < 3)
- Handle common cannabis naming variations: "Dispensary" vs "Canna" vs "Weed" vs "Herb" vs "Bud"
- Ignore corporate suffixes: LLC, Inc, DBA, Corp, Ltd, PLLC
- Also strip cannabis-specific suffixes: "Cannabis", "Cannabis Co", "Weed", "Dispensary" for normalization
- "Delivery" ↔ "Delivers" variants accepted

### Address Matching
- Normalize: St/Street, Ave/Avenue, Dr/Drive, Ste/Suite
- Compare street number + street name (ignore unit/suite differences)
- Flag if ZIP code differs

### Phone Matching
- Strip all formatting: (408) 555-0123 = 4085550123
- Flag if any digit differs

### Website Matching
- Normalize: strip http(s)://, www., trailing slashes
- Compare domain + path

### License Number Matching (NEW — cannabis-specific)
- Extract state license number from scraped content if present
- Weedmaps and Leafly display license number publicly; flag if missing or mismatched
- Required check — wrong license on a public directory can trigger regulatory scrutiny

## Output Format

```json
{
  "audit_date": "2026-04-22",
  "dispensary": "Purple Lotus",
  "master_nap": {
    "name": "Purple Lotus",
    "address": "752 Commercial St, San Jose, CA 95112",
    "phone": "(408) 456-0420",
    "website": "https://purplelotuspc.com",
    "license_number": "C10-0000123-LIC"
  },
  "results": [
    {
      "directory": "Weedmaps",
      "status": "mismatch",
      "found_data": {
        "name": "Purple Lotus PC",
        "address": "752 Commercial Street, San Jose, CA 95112",
        "phone": "(408) 456-0420"
      },
      "issues": ["Name: 'Purple Lotus PC' vs 'Purple Lotus'"],
      "last_checked": "2026-04-22T10:00:00Z"
    }
  ],
  "summary": {
    "total_directories": 20,
    "consistent": 10,
    "mismatches": 3,
    "not_found": 2
  },
  "action_items": [
    "Update Weedmaps listing — name should be 'Purple Lotus'",
    "Claim Budista listing — dispensary not found"
  ]
}
```

## Dependencies

- `firecrawl-search` (ClawHub) — for web scraping
- Firecrawl API key (managed by Kyra)

## Cost

- ~20 Firecrawl scrapes per audit × $0.005/scrape = ~$0.10 per audit
- Weekly = ~$0.40/month per client

## Pre-Filled Directory Submission Data (NEW)

For every directory where the dispensary is "not_found", generate a ready-to-submit data package:

```json
{
  "directory": "Weedmaps",
  "submission_url": "https://weedmaps.com/business",
  "prefilled_data": {
    "business_name": "Purple Lotus",
    "address": "752 Commercial St, San Jose, CA 95112",
    "phone": "(408) 456-0420",
    "website": "https://purplelotuspc.com",
    "license_number": "C10-0000123-LIC",
    "categories": ["Dispensary", "Recreational Cannabis", "Medical Cannabis"],
    "description": "Licensed cannabis dispensary in San Jose serving adults 21+. Full menu of flower, pre-rolls, vapes, edibles, and concentrates from trusted CA brands. State license C10-0000123-LIC.",
    "hours": "Mon-Sun 9am-9pm",
    "delivery_radius_miles": 15,
    "photos_note": "Upload storefront exterior + product case + budtender at work (no customer faces)"
  }
}
```

Generate the description using the dispensary's product list and city — make it unique per directory (not copy-paste identical across all 20). Always include license number and age-gate language (21+ or medical-patient-only).

Store as `dataType: "directory_submissions"` in seo_data.

## Directory Priority Breakdown (20 entries)

The full 20 are configured in `config/dispensary-directories.json`:

- **Critical (3):** Google Business Profile, Weedmaps, Leafly
- **High (7):** Jane, Dutchie, AllBud, Yelp, Facebook, Cannabis.net, Merry Jane
- **Medium (9):** BudTrader, Cannabis Reports, SeshLyfe, Budista, Nextdoor, Apple Maps, Bing Places, Foursquare, MapQuest
- **Low (2):** CitySearch, Angi

These cover cannabis-specific directories (Weedmaps, Leafly, Jane, Dutchie, AllBud, Cannabis.net, Merry Jane, BudTrader, Cannabis Reports, SeshLyfe, Budista) which drive the majority of dispensary-related AI citations, plus general local directories (GBP, Yelp, FB, Nextdoor) and map platforms (Apple Maps, Bing Places, Foursquare, MapQuest) which feed Siri and Copilot AI assistants.

## Error Handling

- If Firecrawl fails for a directory: mark as "error", try again next week
- If >5 directories fail: flag as "incomplete audit" in report
- Never block on a single directory failure
- Some directories may block scraping (especially Weedmaps — strict bot detection) — mark as "blocked" and suggest manual check
