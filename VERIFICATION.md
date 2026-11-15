# Verification record

Hosted preview reached READY on 15 November 2026: https://clientbrief-dtoeadjyz-avunor.vercel.app. Landing and sign-in HTTP checks passed (200); logged-out bootstrap API returned 401. Vercel Authentication protection remains enabled. The signed-in hosted recording-to-approval flow is pending. See `PREVIEW-DEPLOYMENT.md` for target, configuration, and invitation-host setup.

Invitation redirect investigation: the live Clerk public environment returned hosted `accounts.dev/default-redirect` URLs for Home, after-sign-in, and after-sign-up. Added explicit app-side ClerkProvider/SignIn/SignUp destinations to `/app`. The hosted portal URLs still require correction in the ClientBrief Clerk Dashboard; the connected CLI account does not own/list this instance. This does not change organization membership or resend invitations. Verify with `node scripts/check-auth-redirects.mjs` after saving the Dashboard settings. Hosted invitation acceptance is not marked verified until an invited-user test returns to ClientBrief.

See `FEATURE-CHECK.md` for the later feature audit and four successful live Google scenarios. Generated scenario outputs are in `tests/fixtures/ai-scenarios-results.json`. Browser editing/version saving and review-link creation were verified; opening the copied review URL was blocked by browser security, so approval was not marked as passed.

Follow-up checks passed for task-completion version saving, authenticated transcript and brief downloads (downloaded contents inspected), and the follow-up copy notice. Real backend cleanup on disposable fixtures passed, as did real AssemblyAI silent-recording rejection followed by provider/storage cleanup. The existing smoke meeting was preserved. These checks do not establish live member permissions, CSV download, mobile layout, browser approval, interrupted upload recovery, or Workflow dispatch for deletion; see the updated feature report for exact limits.

## Live check on 15 November 2026

- Confirmed Google sign-in into the existing ClientBrief account and the selected agency workspace in the in-app browser.
- After the user saved native Clerk/Supabase settings, authenticated dashboard and meeting requests returned 200. Row-level security remains enabled.
- Created the clearly labeled `ClientBrief Smoke Test` client, `Website Discovery — Smoke Test` project, and `Synthetic client discovery — end-to-end test` meeting through the signed-in UI.
- Generated a short synthetic spoken WAV fixture, uploaded it directly into private Storage, and completed real AssemblyAI transcription with speaker labels and timestamps. Corrected the project spelling and speaker name in the editor, then saved successfully (PATCH 200).
- Fixed a real TUS upload failure: two Authorization headers were combined by XMLHttpRequest, invalidating the JWT. The upload now sets one refreshed bearer header per request and uses the direct Storage hostname. The retried real upload succeeded.
- Generation reached AI Gateway through Workflow but was rejected: the Vercel account requires a valid credit card to serve requests. No brief was fabricated. The transcript is saved for retry after billing setup. Added an actionable error and fatal classification for this permanent setup failure so future runs do not automatically repeat it.
- Local environment variables are now in the ignored `.env.local`; key fields in `.env.example` are empty.
- Clerk, Supabase server-key database access, private recording storage, AssemblyAI, and AI Gateway read-only credential probes passed. Server-key access does not prove that Clerk JWT trust is configured.
- Public pages returned HTTP 200, logged-out API requests returned 401, and an invalid review token returned 400.
- Subsequently verified direct Google AI Studio generation from the saved synthetic transcript through the real application processing function and database RPCs. The generated draft passed strict schema and source-reference checks, was persisted as a new version, left all unstated deadlines null, and moved the meeting to ready. The AssemblyAI provider job remained unchanged. This was a backend live check, not a repeated browser approval test.
- Google's API accepted a minimal schema but rejected the bounded nested output schema with `invalid argument`. Sending a shape-only generation schema fixed this; strict output limits, UUID/date validation, and transcript-reference validation still run before persistence.
- The full upload-to-approval browser flow remains incomplete at output review and approval; generation now works directly with Google.
- Turbopack's filesystem cache filled the local disk. Stopped the owned server, removed only generated `.next/cache` and `.next/dev/cache`, and preserved recordings and `.next/workflow-data`. Disabled development filesystem caching to prevent recurrence. Disk space remains low.

## Verified

- Production compilation with Next.js, Clerk, the AI SDK, and compiled Workflow routes.
- Final production build passed after the direct Google provider and generation-schema compatibility changes on 15 November 2026.
- Production builds use the supported Webpack compiler and two page-generation workers after Windows Turbopack child-process failures. Development uses Next.js's default compiler.
- TypeScript checks across application and tests.
- 35 automated tests passed, including model validation, upload limits, evidence references, nullable task fields, CSV escaping, current Clerk membership checks, role authorization, provider job reuse, cancellation, silent recordings, provider failures, fabricated evidence, cleanup failure, single-header TUS authorization, token refresh, expired sessions, permanent versus transient generation failures, direct Google SDK request/structured output handling, provider selection, and missing-key errors. The opt-in real Google generation test passed separately and is skipped during ordinary test runs. TypeScript passed after these fixes.
- Transactional database assertions on the provisioned Supabase project. Test fixtures were rolled back. Covered tenant isolation and cross-tenant mutation denial, privileged RPC restrictions, two-job concurrency, duplicate run reuse, version-specific approvals, response deduplication, expired/revoked links, and late results after deletion.
- Supabase security advisor: no findings after the migrations.
- Dependency audit: zero reported vulnerabilities after pinned transitive dependency fixes.
- Browser: desktop landing page, mobile landing page with no horizontal overflow at the tested 390px viewport, protected workspace redirect to the real Clerk sign-in form, and incomplete review-link error state. No browser console errors were observed on the tested sign-in page.

## Not yet verified

- Agency invitations, member sessions, and organization switching against live Clerk/Supabase integration.
- Browser output editing, source-citation playback, exports of generated content, and public client approval end to end. Direct Google backend generation is verified.
- Interrupted real TUS uploads and real provider artifact deletion.
- Vercel deployment and remote client access.

The native Clerk-to-Supabase integration is working. Direct Google AI Studio is selected (`AI_PROVIDER=google`) and the configured key passed authentication and live generation. The model defaults to configurable `gemini-4-hydrogen`. No substitute results or test bypass were added to production routes. The live test uses service-role backend operations on the specifically guarded synthetic test meeting; it does not verify browser authentication or Workflow dispatch again.

To deliberately repeat the live generation check, set `CLIENTBRIEF_LIVE_GENERATION=1` in the command environment and run `npx vitest run tests/live-generation.test.ts`. This spends provider quota and saves a new draft on the known synthetic smoke meeting. It is not part of the ordinary offline test suite.

## Reproduce

Run `npm test`, `npm run typecheck`, `npm run build`, and `npm audit`. Use `tests/database.sql` in a database-owner session or set `DATABASE_URL` and run `npm run test:db`.

Before pilot release, complete the README's real-recording flow with an agency admin and a member. Repeat with another organization to confirm all private recordings, exports, outputs, and processing actions remain isolated. Review every AI draft for factual support, then verify an approval attaches only to the shared version.
