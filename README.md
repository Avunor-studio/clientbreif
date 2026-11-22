# ClientBrief

The interface uses a paper, ink, and burgundy design with Instrument Serif headlines and Manrope controls. Public pages are `/`, `/how-it-works`, and `/for-agencies`; they explain the existing recording-to-brief workflow using clearly labelled illustrative content.

## Public website and search indexing

Local and preview deployments are unindexable by default. The website includes page-specific descriptions, social previews, structured data, icons, and an opt-in sitemap.

For a public production launch, set `SITE_URL` to the stable HTTPS origin (for example, your own production domain, without a path), then set `SITE_INDEXABLE=true` and rebuild. Keep `SITE_INDEXABLE=false` for protected pilot deployments. Vercel preview and development environments remain unindexable even when the flag is enabled. `SITE_URL` only controls marketing metadata; keep `APP_URL` configured separately for application links and request-origin authorization.

Only the three public pages enter the sitemap. Workspace, authentication, onboarding, API, and client review routes carry `noindex` protection and never enter it. Review tokens and private project content are excluded from public metadata. A production build with indexing enabled rejects a missing or unsuitable `SITE_URL`. Fonts are self-hosted by Next.js; the build needs access to Google Fonts to retrieve them.

UI screenshots and verification notes for the redesign are documented in `UI-REDESIGN.md`. Application provider configuration and the rest of the setup follow below.

A working agency meeting application built with Next.js, Clerk Organizations, Supabase, AssemblyAI, Vercel Workflow, and the Vercel AI SDK. Users review transcripts before generating project briefs, decisions, action items, and follow-up drafts. Clients approve immutable brief versions through expiring links.

## Start locally

Requires Node.js 22 or newer and npm.

```powershell
cd 'C:\Users\SAI SHARAAN\Documents\ChatGPT\ggs\clientbrief'
npm ci
npm run dev
```

Open **http://localhost:3000**. Use `localhost` consistently for Clerk and `APP_URL`; a forced IPv4-only listener can conflict with Clerk's internal localhost rewrite. Do not run `next build` while a development server is using the same `.next` directory.

The production build uses Next.js's supported Webpack compiler and two page-generation workers to avoid the Windows Turbopack child-process failures observed on this machine.

Development filesystem caching is disabled after its generated cache exhausted local disk space. This affects restart speed only. Free sufficient disk space before running production builds; local Workflow state is stored separately in `.next/workflow-data` and must be preserved when clearing compiler caches.

The landing page and Clerk sign-in work before all AI services are configured. The workspace displays the required configuration instead of fabricated results.

## Current setup and remaining steps

- A Clerk development application was initialized using the B2B template. Organizations and required selection are enabled. Development keys are in the ignored `.env.local`; they are not committed.
- The Supabase project **ClientBrief** (`wyboymyzzoarwyuatrhk`) was created in Mumbai in the selected organization. All five migrations are already applied. Public URL and publishable key are configured locally.
- Local credentials are configured and their read-only service probes passed. Keep `.env.local` out of chat and source control.
- Clerk-to-Supabase authentication now works: the signed-in workspace can create clients/projects, upload a private recording, and save transcript corrections.
- A synthetic spoken recording was uploaded and transcribed through AssemblyAI on 15 November 2026. After AI Gateway's payment-card block, direct Google AI Studio generation was configured and verified against that saved transcript. A validated draft is saved on the synthetic test meeting; transcription was reused. Keep Google keys in `GOOGLE_GENERATIVE_AI_API_KEY`, not `AI_GATEWAY_API_KEY`.
- No Vercel deployment has been created. See `VERIFICATION.md` for verified and pending checks.

For a fresh checkout, copy `.env.example` to `.env.local` and configure every value. Do not overwrite the existing local file, which already contains Clerk development keys. `.env.local` is ignored. `scripts/configure-local.mjs` adds public settings for the provisioned project without replacing existing values; it is not a general-purpose project provisioning script.

### Clerk authentication and agency membership

Use the Clerk development instance associated with the local publishable key. Claim the temporary application when ready using the Clerk CLI flow or Dashboard; do not create a different instance without replacing both keys.

1. In Clerk, confirm Organizations are enabled and membership is required. Personal accounts are not supported by this release.
2. In [Clerk Connect with Supabase](https://dashboard.clerk.com/setup/supabase), enable compatibility for this application. This adds `role: authenticated` to session tokens.
3. In [Supabase third-party auth settings](https://supabase.com/dashboard/project/wyboymyzzoarwyuatrhk/auth/third-party), add Clerk with the exact Clerk issuer domain. Use the native third-party integration, not the deprecated Supabase JWT template integration.
4. Refresh existing sessions after changing token configuration. The database policies use Clerk v2's signed `o.id` organization claim, rather than a user-supplied organization ID.
5. Set `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/app` and `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/onboarding`. The existing local file may contain the CLI's `/` defaults; changing them improves the post-login handoff.

Agency admins can invite members through Settings, create/revoke review links, and delete recordings or meetings. Members can create clients, projects, and meetings and edit outputs. The server checks current Clerk membership for authenticated API operations instead of trusting only a cached organization role.

Invitation emails also use Clerk's hosted Account Portal configuration; local environment variables cannot change those hosted pages. In the **ClientBrief** instance's Clerk Dashboard → Configure → Paths, set **Fallback development host** to `http://localhost:3000`. Fields prefixed with `$DEVHOST` require relative paths: Home `/app`, application sign-in `/sign-in`, application sign-up `/sign-up`, and after-sign-in/sign-up destinations `/app` if shown. Do not repeat the host inside those path fields. Check the Account Portal redirect settings if shown separately. `node scripts/check-auth-redirects.mjs` prints only the public routing URLs to verify they no longer use `accounts.dev/default-redirect`. Existing accepted invitations should not be resent automatically; open `/app` and select the invited agency. A localhost invite works only on the machine running ClientBrief; use the deployed HTTPS origin for remote teammates.

### Supabase server key and storage

Get a server secret key from the ClientBrief project's API Keys settings and assign it to `SUPABASE_SECRET_KEY`. A legacy `service_role` key also works. Never prefix this variable with `NEXT_PUBLIC_`. The connected CLI account could not retrieve it automatically.

The migrations create thirteen tenant-scoped tables, invoker RPCs available only to the service role, and a private `recordings` bucket. User requests use Clerk JWTs and RLS; background jobs and token-authorized public review operations use the server key after explicit authorization checks.

The bucket is configured for 250 MB recordings. Confirm the project's global Storage upload limit also permits 250 MB. If the selected free plan caps uploads below this size, use smaller files or change the product limit in `src/lib/model.ts` to the allowed size; do not silently upgrade the account. Uploads use 6 MB TUS chunks directly to storage. Video inputs use spoken audio only.

For another Supabase project, apply the SQL files in `supabase/migrations` in filename order, then configure its URL, keys, and Clerk integration. For CLI-based migration deployment, initialize/link a local Supabase project and use the current CLI's migration commands. Do not rerun the initial migration against the already-provisioned project.

### Transcription and generation

- Set `ASSEMBLYAI_API_KEY` from AssemblyAI. The pipeline uses English transcription with speaker labels and timestamps. Existing provider job IDs are reused after retries.
- Direct Google AI Studio is the default (`AI_PROVIDER=google`). Get a key at https://aistudio.google.com/apikey and set `GOOGLE_GENERATIVE_AI_API_KEY` in `.env.local`. Set `GOOGLE_AI_MODEL=gemini-4-hydrogen`, or another available model with structured-output support. This calls Google directly through `@ai-sdk/google`; no Gateway credential is needed. Never prefix the key with `NEXT_PUBLIC_`.
- Google's published pricing currently lists Gemini 4 Hydrogen with a free tier, subject to model availability and account rate limits. Free-tier content may be used to improve Google's products. Use synthetic/public test material on that tier; assess paid-service data terms before processing confidential client meetings. Check current details at https://ai.google.dev/gemini-api/docs/pricing.
- Optional Gateway routing: set `AI_PROVIDER=gateway`, `AI_GATEWAY_API_KEY`, and `AI_GATEWAY_MODEL=google/gemini-4-hydrogen`. The selected provider is explicit; the app never silently falls back to a different provider. Vercel's free Gateway credits require a payment method (https://vercel.com/academy/ai-sdk/ai-sdk-dev-setup).
- Restart the server after configuring credentials. Provider requests can incur usage charges.
- A valid API key alone does not prove generation access. AI Gateway may require a payment card on the Vercel account before serving requests. Billing setup errors stop automatic Workflow retries; the saved transcript remains available for manual retry after setup.
- Provider data is untrusted evidence. Generation is schema validated, source IDs are checked, and missing task owners/deadlines remain null. Extraction remains fallible; review every output.

## Using the MVP

1. Sign up, create an agency, and optionally invite a teammate.
2. Add a client and project under Clients & projects.
3. Upload an English recording and confirm permission to process it.
4. Wait for transcription; correct text and speaker names, then save.
5. Generate outputs. Review source timestamps, edit the brief and tasks, and save a new version.
6. As an admin, create a client review link. Copy and share it manually.
7. The client approves or requests changes. Their entered identity is self-reported, not verified or a legal electronic signature.
8. Export transcript TXT, brief Markdown, or tasks CSV; copy the follow-up draft into your email client for manual sending.

Generated versions are immutable. Approvals never carry to a new version. Regeneration creates another version and does not replace earlier edits. Links expire in seven days, can be revoked, and expose only their saved brief. Tokens are placed in URL fragments, stored as hashes in Postgres, and sent in POST bodies to avoid placing them in ordinary request paths.

## Processing and deletion

Vercel Workflow runs transcription submission/polling, output generation, and deletion as durable steps. Workflows work locally with the SDK's local world and on Vercel after deployment. The Clerk matcher excludes internal workflow routes. User routes and background jobs use separate authorization paths.

Two active processing runs are allowed per organization, enforced under a database advisory lock. Workflow start hooks deduplicate concurrent starts for the same processing run. The transcript stage is persisted independently from generation. An external transcription submission that succeeds just before a network failure may have an uncertain result before its provider ID is persisted; exactly-once billing across third-party systems is not guaranteed.

Recordings remain until deletion. Recording-only deletion retains saved transcripts and generated work. Full deletion immediately tombstones the meeting and revokes review links, then removes recordings, provider artifacts, transcript segments, outputs, tasks, responses, and processing metadata. A minimal tombstone remains to stop late jobs from recreating data. Cleanup state and retries appear in Settings. Previously issued playback URLs can remain usable until object removal or their five-minute expiration; provider-held copies depend on provider deletion completion. Logs record job IDs and stage counts, not transcript bodies.

## Verification

```powershell
npm test
npm run typecheck
npm run build
npm audit
```

Database tests run against a database-owner connection and roll fixtures back:

```powershell
$env:DATABASE_URL = '<direct or session-pooler connection string>'
npm run test:db
```

`tests/database.sql` and `tests/project-database.sql` can also run in the SQL editor. It verifies tenant isolation, cross-tenant mutation denial, privileged RPC permissions, processing limits and deduplication, immutable approvals, expiration/revocation, and deletion guards. Tests that set JWT claims directly test database policy behavior, not Clerk's JWT signature verification.

Implementation checks completed:

- Unit and mocked-provider tests for accepted/rejected files, evidence validation, nullable task fields, safe exports, persisted job retries, cancellation, silence, provider errors, fabricated citations, and cleanup failure.
- Database transaction tests passed against the new Supabase project, with fixtures rolled back.
- Production build and TypeScript checks passed during implementation; see `VERIFICATION.md` for the final result.
- Browser checks covered the desktop/mobile landing page, real Clerk sign-in, the authenticated workspace, client/project creation, private recording upload, real transcription, and saved transcript/speaker corrections. Direct Google generation and draft persistence passed a real backend check on the synthetic meeting. Output review and public approval still need a complete browser check.

## Request limits

ClientBrief allows 120 application API requests per signed-in account per minute across all agencies.
Starting transcription, brief generation, intake preparation or a scope check also consumes one of 10 processing requests per hour.
Signed-out review and intake requests share 30 requests per minute per Vercel client IP. Local and other hosts use one shared visitor allowance.
Client and project inserts and updates also share 60 successful row writes per account per minute, including direct Supabase Data API writes.
Private database counters store a digest of the identity. Only the backend can consume application quotas.
A limited application request returns HTTP 429 with a Retry-After header. Direct database reads and resumable storage transfers use Supabase authorization separately.

## Vercel deployment

1. Push the repository to your chosen Git host and import it into Vercel. Set the project **Root Directory** to `clientbrief` and Framework to Next.js. Use `npm ci` and `npm run build`.
2. Use a supported Node runtime at least version 22. Choose a function region near Mumbai if available on your plan.
3. Add the variables from `.env.example` in Vercel's project settings, scoped to the intended environment. Secrets belong only in server-side variables. Keep preview data separate from production client data.
4. Set `APP_URL` to the exact HTTPS deployment origin and configure matching Clerk allowed origins, redirects, and production instance keys as appropriate. A fixed pilot domain is easier to manage than changing preview URLs.
5. Keep `withWorkflow` in `next.config.ts`. Workflow routes must remain outside Clerk's matcher. Confirm the SDK's execution and data-retention settings fit the chosen Vercel plan.
6. Apply migrations before releasing against a new database. Run the full real-recording acceptance flow on a preview before allowing pilot client recordings.
7. If using `vercel env pull`, back up local configuration securely first: that command replaces its destination file. Do not commit a credential backup.

Local review links point to localhost and work only on the same computer. Remote client review needs a deployed origin. This release does not include billing, automated email sending, live bots, multilingual support, or task-tool integrations.

## Client intake and scope tracking

Open Clients & projects, then select a project. Client intake supports seven-day, revocable, single-submission links. Admins create links; members can read answers and draft discovery agendas. Collect goals, audience, deliverables, budget, timeline, reference links, and decision maker. Reference assets are links only; file uploads are not included. Contact details are self-reported. Answers remain immutable; corrections require a new form.

In a meeting, choose an intake submission before generating a new draft. Intake citations show the answer separately from recording timestamps. Requests are not meeting agreements. Saved versions and approvals remain independent.

Scope changes compare a saved meeting transcript with an approved brief from a different meeting in the same project. AI proposes cited additions, changes, or clarification points. Agency reviewers explicitly save a status and optional budget/timeline estimates. Copy a change-request draft containing only confirmed suggestions. Client approval of that draft is still manual; the existing approval flow approves brief versions, not scope-change drafts. Transcript edits require a fresh comparison. The two-job organization limit covers both meeting and project AI work.

Opt-in synthetic live test (uses configured Google and Supabase services):

```powershell
$env:CLIENTBRIEF_LIVE_PROJECTS = "1"
npx vitest run tests/live-project-features.test.ts
```

## Next to build

1. **Client review notifications.** When a client approves a brief or requests changes, save the response and use a Supabase Edge Function to email the agency's designated project contact. Include the decision and a link to the signed-in meeting workspace. Keep the email provider key in Supabase function secrets and use the saved response ID to prevent duplicate emails on retry.
2. **Pending approval digest.** Use Supabase Cron to send agency admins a weekday summary of briefs still awaiting review.
3. **Slack notifications.** Let each agency connect a channel to receive approval and change-request updates.
