# Changelog: LeadScout — AI-Powered Cold Outreach Research & Personalization

## v1 — 2026-03-25
- extension/icons/**: Replace placeholder icons with actual branded icons — Users will see broken/blank icons in Chrome toolbar which looks unprofessional and reduces trust. The current icons are 1x1 pixel placeholders per icons/README.md.

## v2 — 2026-03-25
- server/public/index.html + server/routes/api.js**: Add a single "LinkedIn URL" input field that auto-fetches profile data — User explicitly said "too many boxes to fill out" and wants to "just drop a link." Add a URL input at the top with a "Fetch Profile" button. When clicked, call a new `/api/scrape-url` endpoint (or client-side fetch + parse) that extracts profile data and pre-fills the form fields. Keep manual fields as optional overrides, but make the URL the primary input.

## v3 — 2026-03-25
- 1. server/views/dashboard.html + server/index.js: Add navigation link back to main app from dashboard — User feedback: "when you go to dashboard there is no way back to the functional app"
2. server/views/dashboard.html + server/index.js: Show human-readable generation details instead of raw JSON — User feedback: "when you click in to the logged runs it shows code not natural language"
3. server/public/index.html: Ensure main app is the default landing page — User feedback: "the page opens to a dashboard that does not link to the functional app"
4. server/views/dashboard.html: Dashboard template uses Handlebars syntax but manual string replacement — Code maintainability issue

## v4 — 2026-03-25
- 1. server/views/dashboard.html + server/views/generation-detail.html: Update styling to match main app's dark theme — The main app uses a professional dark theme (#0d1117 background) while the dashboard and generation detail pages use a light purple gradient. This creates a jarring visual transition when users navigate between pages. Users expect consistent branding and design language across all pages of the same product.

## v5 — 2026-03-25
- 1. server/routes/api.js + server/public/app.js: Fix URL fetch reliability and improve error messaging — User reported "failed to fetch url". The current `/api/scrape-url` endpoint attempts to scrape LinkedIn directly via HTTP, but LinkedIn blocks unauthenticated requests. While the code has fallback logic, the error path isn't handling all failure modes gracefully. **Fix:** (a) Add explicit timeout handling with user-friendly messages, (b) When fetch fails/returns limited data, show a prominent notice that says "Limited data available — for full profile extraction, use the Chrome extension on LinkedIn" instead of silently failing or showing cryptic errors, (c) Pre-populate whatever fields ARE available (at minimum the name from URL) so users see partial success rather than complete failure.
2. server/public/app.js: Improve URL input validation UX — The URL validation happens client-side first, then server-side. If user pastes a mobile LinkedIn URL (linkedin.com/mweb/...) or Sales Navigator URL, they get a generic "invalid URL" error. **Fix:** Add specific error messages for common URL variations: "Sales Navigator URLs are not supported — please use the standard LinkedIn profile URL", "Mobile LinkedIn URLs detected — please use the desktop profile URL (linkedin.com/in/username)".
3. server/routes/api.js: Add request timeout configuration for node-fetch — The current `timeout: 10000` option may not work as expected with dynamic import of node-fetch. **Fix:** Use AbortController for reliable timeout handling:

## v6 — 2026-03-25
- 1. extension/popup/popup.css: Update Chrome extension popup to match dark theme** — The extension popup still uses the old purple gradient theme (`linear-gradient(135deg, #667eea 0%, #764ba2 100%)` with light card backgrounds), while the web app and dashboard now use the professional dark theme (`#0d1117` background). When users click the extension, then click "📊 Dashboard" in the footer, they experience a jarring visual transition. All UI surfaces should share the same dark theme for brand consistency and professional appearance.

## v7 — 2026-03-26
- 1. server/index.js: Fix "Avg Per Day" calculation in dashboard stats** — The current calculation uses `stats.lastGeneration` (most recent) instead of the first generation timestamp. This produces incorrect averages. For example, if a user made 100 generations over 30 days but the last one was 1 minute ago, it would show ~100/day instead of ~3/day. **Fix:** Either add a `firstGeneration` field to the stats query, or calculate from earliest record in DB:
2. extension/content/scraper.js + extension/popup/popup.js: Remove duplicate scraping logic** — The content script (`scraper.js`) contains a full extraction implementation with message listener, but the popup (`popup.js`) uses `chrome.scripting.executeScript` with its own inline `scrapeLinkedInProfile` function. The content script loads but its code is never called. This is technical debt that could cause confusion during maintenance. **Fix:** Either (a) remove the unused content script and its manifest entry, or (b) refactor popup to use `chrome.runtime.sendMessage` to call the content script's existing implementation. Option (a) is simpler since executeScript approach works.

## v8 — 2026-03-26
- 1. extension/manifest.json + extension/content/scraper.js: Remove unused content script** — The manifest loads `content/scraper.js` as a content script, but `popup.js` uses `chrome.scripting.executeScript` with its own inline scraping function. The content script loads on every LinkedIn profile but is never called. This is technical debt that wastes memory and could cause maintenance confusion. **Fix:** Remove the `content_scripts` entry from manifest.json and delete `content/scraper.js`, since the executeScript approach in popup.js is working correctly.

## v9 — 2026-03-26
- 1. extension/content/scraper.js: Delete deprecated file** — The file still exists with a deprecation notice, but the manifest `content_scripts` entry was correctly removed. The file should be deleted entirely to avoid maintenance confusion. This is purely a code hygiene issue — users are not affected.

