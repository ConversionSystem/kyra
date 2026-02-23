#!/bin/bash
# Scrape GHL Certified Admin Directory → CSV lead list
# Usage: bash scrape-ghl-directory.sh > leads-ghl-directory.csv

BASE="https://directory.gohighlevel.com/search_results"
PAGES=19  # 472 results / 25 per page

echo "Name,Profile URL,Description,Location,LinkedIn"

for page in $(seq 1 $PAGES); do
  URL="${BASE}?page=${page}"
  # Fetch the page
  HTML=$(curl -s -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" "$URL")
  
  # Extract profile slugs and names using grep/sed
  echo "$HTML" | grep -oP '(?<=href="/)[^"]+certified-admins/[^"]+' | while read -r slug; do
    # Fetch individual profile
    PROFILE_HTML=$(curl -s -A "Mozilla/5.0" "https://directory.gohighlevel.com/${slug}")
    
    NAME=$(echo "$PROFILE_HTML" | grep -oP '(?<=<h1[^>]*>)[^<]+' | head -1 | sed 's/^[ \t]*//')
    DESC=$(echo "$PROFILE_HTML" | grep -oP '(?<=<p class="bio[^>]*>)[^<]+' | head -1)
    LOCATION=$(echo "$PROFILE_HTML" | grep -oP '(?<=<span class="location[^>]*>)[^<]+' | head -1)
    LINKEDIN=$(echo "$PROFILE_HTML" | grep -oP 'https://www\.linkedin\.com/in/[a-zA-Z0-9-]+' | head -1)
    
    # Clean and output CSV
    NAME=$(echo "$NAME" | tr ',' ' ')
    DESC=$(echo "$DESC" | tr ',' ' ' | head -c 120)
    
    echo "\"$NAME\",\"https://directory.gohighlevel.com/${slug}\",\"$DESC\",\"$LOCATION\",\"$LINKEDIN\""
  done
  
  sleep 1  # Be nice to the server
done
