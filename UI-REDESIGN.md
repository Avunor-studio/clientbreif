# ClientBrief interface redesign

Verified locally on 16 November 2026.

## What changed

- Paper, ink, and burgundy visual system; Instrument Serif editorial headlines and Manrope application typography, self-hosted with Next.js font optimization. This pairing replaces the initial Newsreader / IBM Plex Sans design following the font revision.
- Original document mark and wordmark; product examples replace decorative stock visuals.
- Three substantive server-rendered public pages: Home, How it works, and For agencies. Examples are explicitly illustrative and use matching source excerpts; there are no invented customer endorsements, prices, or performance claims.
- Shared marketing navigation and footer, responsive example-output tabs, practical FAQs, agency scenarios, and recording/data explanations.
- Restyled overview, client/project forms, meetings, upload, approvals, settings, authentication, onboarding, meeting editor, and client review. Working controls retain the existing API and processing contracts.
- Mobile workspace drawer with native modal focus handling and Escape dismissal; meeting title/project search, processing-status filtering, and filter reset.
- Sticky save areas with explicit unsaved styling, keyboard-operable output tabs, transcript no-match feedback, and clearer loading/review errors. Change requests require comments in the browser as well as on the server.
- Fixed a reproducible Clerk OrganizationSwitcher hydration mismatch by loading the workspace account controls in a small client-only component. The real prebuilt organization switcher and user menu remain in use.

Reference sites studied: [Granola](https://www.granola.ai/) for typography and product demonstrations, and [Basecamp](https://basecamp.com/) for concrete workflow explanations. ClientBrief's layouts, illustrations, and copy are original.

## SEO and configuration

The public pages have distinct titles and descriptions, social previews, WebSite/WebPage JSON-LD, an SVG icon, and a 1200 × 630 Open Graph image. `robots.txt` and `sitemap.xml` are generated through Next.js metadata routes.

Set `SITE_URL` to the stable public HTTPS production origin and `SITE_INDEXABLE=true` only when launching an indexable production site. Default behavior is noindex; development and Vercel previews cannot opt into indexing. Production indexing with an unsuitable or missing origin fails with a setup error. Only the three marketing pages enter the production sitemap. Private, authentication, onboarding, API, and review routes remain noindex. `APP_URL` retains its separate application-link and origin-checking purpose.

## Automated and HTTP checks

- `npm test`: **58 passed, 4 opt-in live-service tests skipped**, including the later navigation/cache regression checks.
- `npm run typecheck`: passed.
- `npm run build`: passed, including workflow compilation, TypeScript, static marketing pages, metadata endpoints, and route generation.
- `git diff --check`: passed.
- Local HTTP: the three public pages, review route, SVG icon, Open Graph PNG, robots, and sitemap returned 200. Each marketing page had one H1, a distinct title/description, social metadata, and structured data.
- Development responses carried `X-Robots-Tag: noindex, nofollow, noarchive`; robots disallowed crawling and the sitemap contained no URLs with indexing disabled.
- Logged-out `/api/bootstrap` returned 401. No authentication bypass or production fixture route was added.
- SEO tests cover explicit indexing opt-in, development/preview exclusion, canonical-origin validation, private-route exclusion, and the exact public sitemap set.

## Browser checks

Used the connected browser's existing admin session and agency; did not create accounts, send invitations, or change roles.

- Home checked at 360, 390, 768, and 1440px; supporting pages checked at mobile/tablet/desktop widths. No page-level horizontal overflow on the inspected pages.
- Verified public mobile navigation, route transitions, example tabs, keyboard selection, FAQ expansion, and the example-brief anchor.
- Verified the real signed-in dashboard and client/project forms, including mobile sizing.
- Verified mobile drawer focus on opening, Escape dismissal with focus returned to its trigger, and navigation closing the drawer.
- Verified meeting search's no-match state and clear-filter behavior, upload fields/limits/required consent, settings usage/members, approvals empty state, and incomplete review-link feedback.
- After the account-control fix, a clean workspace reload and subsequent inspected pages produced no new browser console errors. Clerk's development-key warning remains expected in this development instance.
- Focus styles, reduced-motion CSS, semantic status colors, accessible form labels, and mobile touch sizes were reviewed in the implementation. This is not a formal accessibility audit or a measured Lighthouse report.

Screenshots are local, Git-ignored verification artifacts:

- `test-results/redesign/home-desktop.jpg`
- `test-results/redesign/home-mobile.jpg`
- `test-results/redesign/outputs-desktop.jpg`
- `test-results/redesign/workspace-desktop.jpg`
- `test-results/redesign/workspace-mobile.jpg`

## Live-service limits and handoff

Navigation revision: the authenticated workspace now lives in the persistent `/app` layout, rather than remounting on every section change. The full-page opening fallback was removed. Data refreshes on navigation, focus, and visibility changes keep the current workspace visible. The in-memory snapshot is scoped to user, session, and organization; scope changes and access-denied responses clear it, and late responses from an earlier scope are ignored. Mutation refreshes supersede requests started before the write. API requests remain authenticated and bypass HTTP caching.

TypeScript, all 58 tests, and a production build passed after this revision. Live browser checks traversed Overview → Clients & projects → All meetings → Overview and browser Back without the opening/loading placeholder returning. No browser console errors were observed. Live role/account switching was not repeated; the focused tests cover account/session resets, cross-agency late-response isolation, transient errors, denied access, request deduplication, and mutation refresh races. After restarting localhost, HTTP checks returned 200 for Home, 307 for the logged-out workspace, and 401 for the logged-out bootstrap API. The final preview screenshot is `test-results/navigation/workspace-navigation-final.jpg`.

Font revision: Instrument Serif and Manrope passed TypeScript and a production build. The running homepage returned HTTP 200; computed styles confirmed both families, and inspected 319px and 1440px layouts had no horizontal overflow. The current typography preview is `test-results/redesign/font-update.jpg`; the original redesign screenshots above document the preceding font pairing.

Clerk authentication and authenticated Supabase workspace reads worked in the browser. The selected workspace had one project and no meetings during this pass. A populated meeting editor, saving a new output version, timestamp seeking, exports, and a valid-link client approval were therefore **not reverified in the browser** during this redesign. Existing processing/export/authorization tests passed; those are not substitutes for live acceptance.

No new AssemblyAI transcription or Google generation job was submitted. Member-role tests, cross-organization browser isolation, and hosted invitation acceptance were not repeated. See the earlier verification documents for their separate history and limitations.

Changes are local. Deployment protection, hosted environment configuration, and the deployed preview have not been modified by this redesign. A production launch still needs a stable domain, production service configuration, and an explicitly enabled indexing setting.
