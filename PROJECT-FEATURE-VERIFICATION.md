# Intake and scope verification — 17 November 2026

The two features are implemented locally. Database migrations were applied to ClientBrief's configured Supabase project. This is not a deployment of the new application code.

## Verified

- 85 ordinary tests pass; five live tests require explicit opt-in and are skipped by the ordinary suite.
- TypeScript checks and production build pass.
- Real synthetic client form submission and agenda preparation were previously exercised through the browser. Answers remained separate from commitments, and blank budget and timeline fields produced clarification questions.
- Live backend assertions confirm the agenda and scope Workflow jobs completed, citations refer to real synthetic source segments and approved scope, and booking/deposit changes were identified. The injected budget instruction was not included.
- A synthetic scope suggestion was confirmed through the same review RPC used by the app; the change-request draft kept unassessed budget/timeline impacts empty. The approved baseline content remained unchanged.
- Transactional database checks passed for organization isolation, privileged-write denial, expired/revoked links, duplicate submissions, duplicate job completions, shared concurrency limit, stale transcript/review rejection, and cancellation on deletion. Fixtures were rolled back.
- Supabase security advisors reported no findings after migration.

## Limitations and remaining checks

- Fresh browser access is unavailable in this chat. Desktop/mobile layout, timestamp links, clipboard actions, and unsaved-review interactions have not been fully verified for these new features.
- The first live combined intake/transcript generation timed out after 180 seconds. The synthetic job was released, and explicit 120-second AI request timeouts were added to meeting generation, agenda preparation, and scope comparison. The durable workflow records failures and offers retry.
- The bounded retry also timed out at 120 seconds. Its processing run and meeting were correctly marked failed, releasing the processing slot. Combined intake-backed brief generation is **not live-accepted** with the currently configured provider/model. Ordinary tests validate schemas and citations but cannot establish provider availability or latency.
- The opt-in live feature test uses only the named synthetic project and leaves its draft/review artifacts visible for inspection. It does not represent a real client approval.
- Intake assets currently accept reference links, not uploaded files. Corrections require another intake form. Change-request drafts require manual sending and client confirmation; they do not automatically amend or approve a brief.

Run `CLIENTBRIEF_LIVE_PROJECTS=1 npx vitest run tests/live-project-features.test.ts` with local service configuration to repeat backend live acceptance. Use `npm run test:db` with a database-owner connection for both rollback-only SQL suites.
