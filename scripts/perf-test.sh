#!/bin/bash
# Performance Test Script for XBrowser Marketplace
# Runs after each deploy to verify performance, SEO, and security

set -euo pipefail

BASE_URL="${1:-https://xbrowser-marketplace.dyyz1993.workers.dev}"
REPORT_DIR="perf-reports"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
REPORT_FILE="$REPORT_DIR/perf-${TIMESTAMP}.md"

mkdir -p "$REPORT_DIR"

echo "# Performance Report - $(date -u '+%Y-%m-%d %H:%M:%S UTC')" > "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "**Base URL**: $BASE_URL" >> "$REPORT_FILE"
echo "**Commit**: $(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

measure_ttfb() {
  local url="$1"
  local label="$2"
  local extra_headers="${3:-}"
  
  local result1=$(curl -s -o /dev/null -w "%{time_starttransfer} %{http_code} %{size_download}" \
    $extra_headers "$url" 2>/dev/null || echo "0.000 000 0")
  local ttfb1=$(echo "$result1" | awk '{print $1}')
  local http1=$(echo "$result1" | awk '{print $2}')
  local size1=$(echo "$result1" | awk '{print $3}')
  
  sleep 1
  local result2=$(curl -s -o /dev/null -w "%{time_starttransfer} %{http_code}" \
    $extra_headers "$url" 2>/dev/null || echo "0.000 000")
  local ttfb2=$(echo "$result2" | awk '{print $1}')
  
  local ttfb1ms=$(echo "$ttfb1 * 1000" | bc | cut -c1-6)
  local ttfb2ms=$(echo "$ttfb2 * 1000" | bc | cut -c1-6)
  
  local rating="🟢 Good"
  if (( $(echo "$ttfb1 > 1.0" | bc -l) )); then
    rating="🔴 Poor"
  elif (( $(echo "$ttfb1 > 0.5" | bc -l) )); then
    rating="🟡 Fair"
  fi
  
  local size_fmt
  size_fmt=$(numfmt --to=iec "$size1" 2>/dev/null || echo "${size1}B")
  
  echo "| $label | \`$url\` | $http1 | ${ttfb1ms}ms | ${ttfb2ms}ms | $size_fmt | $rating |" >> "$REPORT_FILE"
}

echo "## 📊 Performance (TTFB)" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "| Page | URL | HTTP | 1st TTFB | 2nd TTFB (cache) | Size | Rating |" >> "$REPORT_FILE"
echo "|------|-----|------|----------|------------------|------|--------|" >> "$REPORT_FILE"

measure_ttfb "$BASE_URL/" "Homepage (SSG)"
measure_ttfb "$BASE_URL/plugin/xbrowser-plugin-github" "Plugin Detail (SSG)"
measure_ttfb "$BASE_URL/plugin/xbrowser-plugin-taobao" "Plugin Detail 2 (SSG)"
measure_ttfb "$BASE_URL/categories" "Categories (SSG)"
measure_ttfb "$BASE_URL/cli" "CLI Docs (SSG)"
measure_ttfb "$BASE_URL/login" "Login (SPA)"
measure_ttfb "$BASE_URL/search" "Search (SPA)"

echo "" >> "$REPORT_FILE"

echo "## 🔌 API Performance" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "| Endpoint | HTTP | 1st TTFB | 2nd TTFB (cache) | Size | Rating |" >> "$REPORT_FILE"
echo "|----------|------|----------|------------------|------|--------|" >> "$REPORT_FILE"

measure_ttfb "$BASE_URL/api/plugins?page=1&limit=20" "GET /api/plugins"
measure_ttfb "$BASE_URL/api/plugins?page=1&limit=20&category=web-automation" "GET /api/plugins (filtered)"
measure_ttfb "$BASE_URL/api/categories" "GET /api/categories"
measure_ttfb "$BASE_URL/api/plugins/xbrowser-plugin-github" "GET /api/plugins/:slug"

echo "" >> "$REPORT_FILE"

echo "## 🔍 SEO Checks" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "| Page | Title | Canonical | OG Tags | JSON-LD | noindex |" >> "$REPORT_FILE"
echo "|------|-------|-----------|---------|--------|---------|" >> "$REPORT_FILE"

check_seo() {
  local url="$1"
  local label="$2"
  local expect_noindex="${3:-false}"
  
  local html
  html=$(curl -s "$url" 2>/dev/null || echo "")
  
  local title
  title=$(echo "$html" | sed -n 's/.*<title>\([^<]*\)<\/title>.*/\1/p' | head -1)
  local canonical
  canonical=$(echo "$html" | sed -n 's/.*rel="canonical"[[:space:]]*href="\([^"]*\)".*/\1/p' | head -1)
  local og_title
  og_title=$(echo "$html" | sed -n 's/.*property="og:title"[[:space:]]*content="\([^"]*\)".*/\1/p' | head -1)
  local jsonld
  jsonld=$(echo "$html" | grep -c 'application/ld+json' 2>/dev/null | tr -d '\n' || echo "0")
  jsonld=${jsonld:-0}
  local noindex
  noindex=$(echo "$html" | grep -c 'noindex' 2>/dev/null | tr -d '\n' || echo "0")
  noindex=${noindex:-0}
  
  local title_status="✅"
  local canonical_status="✅"
  local og_status="✅"
  local jsonld_status="✅"
  local noindex_status="➖"
  
  if [ -z "$title" ] || [ "$title" = "xbrowser Plugin Marketplace" ]; then
    title_status="⚠️ Generic"
  fi
  if [ -z "$canonical" ]; then
    canonical_status="❌ Missing"
  fi
  if [ -z "$og_title" ]; then
    og_status="❌ Missing"
  fi
  if [ "$jsonld" -eq 0 ]; then
    jsonld_status="➖ N/A"
  fi
  
  if [ "$expect_noindex" = "true" ]; then
    if [ "$noindex" -gt 0 ]; then
      noindex_status="✅ Yes"
    else
      noindex_status="❌ Missing!"
    fi
  else
    if [ "$noindex" -gt 0 ]; then
      noindex_status="⚠️ Should NOT have noindex"
    else
      noindex_status="✅ None"
    fi
  fi
  
  echo "| $label | $title_status ${title:-N/A} | $canonical_status ${canonical:-N/A} | $og_status | $jsonld_status ($jsonld) | $noindex_status |" >> "$REPORT_FILE"
}

check_seo "$BASE_URL/" "Homepage" "false"
check_seo "$BASE_URL/plugin/xbrowser-plugin-github" "Plugin: github" "false"
check_seo "$BASE_URL/plugin/xbrowser-plugin-taobao" "Plugin: taobao" "false"
check_seo "$BASE_URL/categories" "Categories" "false"
check_seo "$BASE_URL/cli" "CLI Docs" "false"
check_seo "$BASE_URL/login" "Login" "true"
check_seo "$BASE_URL/search" "Search" "true"
check_seo "$BASE_URL/register" "Register" "true"

echo "" >> "$REPORT_FILE"

echo "## 🛡️ Security Headers" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

headers=$(curl -sI "$BASE_URL/" 2>/dev/null || echo "")
echo "| Header | Value | Status |" >> "$REPORT_FILE"
echo "|--------|-------|--------|" >> "$REPORT_FILE"

check_header() {
  local name="$1"
  local value
  value=$(echo "$headers" | grep -i "^$name:" | sed "s/^$name: //i" | tr -d '\r')
  if [ -n "$value" ]; then
    echo "| $name | \`$value\` | ✅ |" >> "$REPORT_FILE"
  else
    echo "| $name | — | ❌ Missing |" >> "$REPORT_FILE"
  fi
}

check_header "Strict-Transport-Security"
check_header "X-Frame-Options"
check_header "X-Content-Type-Options"
check_header "X-XSS-Protection"
check_header "Referrer-Policy"
check_header "Permissions-Policy"

echo "" >> "$REPORT_FILE"

echo "## ⚡ Cache Verification" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "### Static Assets" >> "$REPORT_FILE"
echo "| Asset | CF Cache | Cache-Control |" >> "$REPORT_FILE"
echo "|-------|----------|---------------|" >> "$REPORT_FILE"

js_asset=$(curl -s "$BASE_URL/" 2>/dev/null | sed -n 's/.*\(\/assets\/[^"]*\.js\).*/\1/p' | head -1)
if [ -n "$js_asset" ]; then
  asset_headers=$(curl -sI "$BASE_URL$js_asset" 2>/dev/null || echo "")
  cf_cache=$(echo "$asset_headers" | grep -i "cf-cache-status" | awk '{print $2}' | tr -d '\r')
  cache_control=$(echo "$asset_headers" | grep -i "cache-control" | sed 's/cache-control: //i' | tr -d '\r')
  echo "| \`$js_asset\` | ${cf_cache:-N/A} | \`${cache_control:-N/A}\` |" >> "$REPORT_FILE"
else
  echo "| — | No JS assets found | — |" >> "$REPORT_FILE"
fi

echo "" >> "$REPORT_FILE"
echo "### API Cache (2nd request vs 1st)" >> "$REPORT_FILE"
echo "See TTFB comparison in Performance section above. 2nd TTFB should be significantly faster if KV cache is working." >> "$REPORT_FILE"

echo "" >> "$REPORT_FILE"

echo "## 🗺️ Sitemap & Robots" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

sitemap_status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/sitemap.xml" 2>/dev/null || echo "000")
robots_status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/robots.txt" 2>/dev/null || echo "000")
sitemap_urls=$(curl -s "$BASE_URL/sitemap.xml" 2>/dev/null | grep -c '<url>' || echo "0")
robots_disallow=$(curl -s "$BASE_URL/robots.txt" 2>/dev/null | grep -c 'Disallow' || echo "0")

echo "| Endpoint | HTTP | Details |" >> "$REPORT_FILE"
echo "|----------|------|---------|" >> "$REPORT_FILE"
echo "| /sitemap.xml | $sitemap_status | $sitemap_urls URLs |" >> "$REPORT_FILE"
echo "| /robots.txt | $robots_status | $robots_disallow Disallow rules |" >> "$REPORT_FILE"

echo "" >> "$REPORT_FILE"
echo "---" >> "$REPORT_FILE"
echo "*Report generated by CI on $(date -u '+%Y-%m-%d %H:%M:%S UTC')*" >> "$REPORT_FILE"

echo ""
echo "========================================="
cat "$REPORT_FILE"
echo "========================================="
echo ""
echo "Report saved to: $REPORT_FILE"

echo ""
echo "## Summary"
echo "Report file: $REPORT_FILE"
