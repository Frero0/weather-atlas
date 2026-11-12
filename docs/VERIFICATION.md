# Verification notes

## Baseline and identity

The inspected starting application used React 18.2 and esbuild. Open-Meteo geocoding and current weather were present, but `fetchWeather` discarded the requested daily forecast. `ReactDOM.render`, absolute root asset paths, a basic shell worker, manifest and checks in `check.jsx` / `check-pwa.cjs` were confirmed. No applicable AGENTS.md or existing application Git repository was found.

The initial state is preserved in commit `46e85fc`. Its author and committer use the existing configured identity Federico Santorsola / `166096298+Frero0@users.noreply.github.com`, checked against the connected Frero0 profile (ID 166096298). Settings are repository-local. No pre-existing authors were rewritten.

## Official integration

The Forecast and Geocoding APIs were requested directly and through the browser. Parameters were checked against the official provider documentation. Real responses for Turin, London and Tokyo were displayed; screenshots use real returned values. Tests use clearly named response fixtures, never production fallback mock weather.

Current weather is based on 15-minute model data. Canonical units are Celsius, km/h and mm, with presentation conversions. Unix timestamps and IANA zones prevent reliance on the device timezone. Daily labels preserve the fixed provider retrieval-offset boundaries, as documented by Open-Meteo for DST transitions.

## Reproducible local checks

- Clean `npm ci --offline --cache /tmp/weather-atlas-npm-cache` succeeded after populating a separate dependency cache from the lockfile. The initially attempted default offline cache was incomplete; no successful clean install is claimed for that first attempt.
- TypeScript strict typecheck: passed.
- ESLint: passed.
- Vitest: 23 tests passed across API contracts, partial/null/malformed responses, bounded retries, search results, obsolete request guards, WMO codes, translations, conversions, cross-timezone dates, DST fallback, provider day labels, persistence, cache expiry, favourites, shared comparisons, URL selections and worker scope isolation.
- Production build: passed. Approximately 555 KB JavaScript (168 KB gzip), 16 KB CSS (4 KB gzip), and less than 10 KB of local PWA icons.
- Dependency installation reported zero vulnerabilities.

## Production browser checks

Chrome headless / Playwright on Linux, using the real Open-Meteo APIs. Desktop viewport 1440×1100, mobile 390×844 and tablet 768×1024.

Verified:

1. English first launch and live current conditions for Turin.
2. Hourly chart, 48 table observations and seven selectable daily forecasts.
3. Search for London, distinct matching locations and keyboard result selection.
4. Three saved places, quick switching and comparison at an exact UTC instant.
5. Fahrenheit, mph, dark/light themes, Italian language and persisted preferences after reload.
6. Selected-day URL restoration and actual clipboard sharing.
7. Geolocation denied, with actionable feedback; no geolocation request at startup.
8. Mobile and tablet without page overflow, with horizontal scrolling inside hourly and weekly containers.
9. Offline app reopening after a complete first visit.
10. Missing-cache offline state, expired-cache fallback and restoration after connectivity returns.
11. Actual service worker update: a changed worker is installed, update is accepted, the page reloads and favourites/units remain intact.
12. A deliberately created unrelated app cache remains intact after activation. Unit checks additionally verify root legacy-cache cleanup and prefix isolation.
13. No JavaScript errors or failed HTTP responses in ordinary online flows. Expected offline failures are isolated from that assertion.

The subpath test exposed and verified a fix for manifest/precache base resolution when `--base` is supplied through the Vite CLI. The same complete browser flow passed on a production build served at `/weather-atlas/` on port 3019, including offline reopening and worker updates. The browser locale was Italian while the app correctly started in English.

The browser script temporarily changes the generated worker cache revision to exercise an update, then restores the generated file. No altered worker or browser test state is committed.

## Limits

Native installation prompts and a physical installed-app session were not automated: availability is browser/platform-specific. The install control is conditional on the browser event, with menu/iOS instructions otherwise. Physical devices, Safari, Firefox and assistive screen readers were not tested. Keyboard and table alternatives are not a WCAG certification.

Geolocation permission denial was checked in the headless browser. Device-level geolocation accuracy, real GPS timeout/unavailability and polar-region astronomical values were not validated on physical hardware; null astronomical values are covered by normalisation tests.

GitHub Actions is configured but has not run remotely. No remote repository, push, deployment or external publication was performed. Provider availability and API quotas remain outside the application’s control.
