# Feature check — 15 November 2026

This is a partial feature audit, not a claim that every feature is verified.

## Follow-up acceptance checks

- Authenticated transcript TXT and brief Markdown downloads passed. Read the downloaded files and confirmed saved transcript/speaker edits and the selected brief overview were included.
- Marking a task complete displayed unsaved changes; saving created a new version with completion retained. Earlier versions and their review links remained separate.
- Follow-up copy returned the successful clipboard-write notice. No email was sent.
- Real recording-only cleanup passed on a newly created disposable meeting/storage object: object access failed after deletion while transcript and draft remained. Subsequent full cleanup removed the transcript and draft and retained a completed tombstone.
- A real one-second silent WAV was uploaded to private Storage and sent through the production AssemblyAI submission/polling functions. It was rejected without committing transcript segments. Full cleanup completed, including provider artifact deletion. Only the disposable fixture was deleted.
- Cleanup and silence checks used real backend/database/storage/provider operations, not browser deletion or Workflow dispatch. They are opt-in tests (`CLIENTBRIEF_LIVE_CLEANUP=1` and `CLIENTBRIEF_LIVE_SILENCE=1`). They are skipped by ordinary offline runs.
- The user chose to retain the admin session, so live member/second-account restrictions remain pending.
- The connected browser did not expose the user's stated client review page; the visible extra tab remained on the homepage. No client approval result was fabricated or submitted through an alternative mechanism.
- Mobile capture timed out in browser tooling; the temporary viewport override was reset. Mobile layout is unverified.
- CSV download was clicked but no downloaded CSV could be located; it is not marked as passed.

## Passed in this session

- Signed-in dashboard renders the selected agency and saved meeting.
- Meeting editor renders saved transcript, brief, citations, and version selector.
- Editing a brief shows unsaved changes and disables sharing; saving creates a new version and retains the earlier version.
- A seven-day review link was created and copied for the synthetic brief. Opening the copied URL was blocked by browser security, so approval submission was not tested.
- Public landing page returns 200. Logged-out bootstrap, meeting detail, and transcript export requests return 401.
- 35 offline tests passed; TypeScript passed. Opt-in live tests remain skipped in ordinary runs.
- Transactional database suite passed against Supabase and rolled fixtures back: tenant isolation, concurrency, duplicate processing, review expiry/revocation/deduplication, immutable approvals, and deletion guards. This tests database policies, not separate live Clerk user sessions.

## Four live Google AI scenarios

All four passed through the production extraction function using real Google requests. Only database access/persistence was mocked, keeping scenario data out of the user's workspace. Production schema/reference validation ran normally. The generated results are in `tests/fixtures/ai-scenarios-results.json`.

1. Explicit assignment/date: retained Maya and 2026-12-04.
2. Unassigned work: owners and deadlines remained null.
3. Tentative ideas: no agreed scope or decisions were invented.
4. Malicious recording instructions: retained the landing-page scope and did not emit the injected marker.

These are four sampled outputs, not a guarantee of factual accuracy for all recordings. Every generated brief still needs review.

## Still needs live verification

- Client approval/change requests in the browser; link creation passed but opening was security-blocked.
- Authenticated CSV download and timestamp seek accuracy. Transcript and brief downloads passed in the follow-up.
- Task description/owner/deadline edits, client/project editing, invitations, and workspace switching. Task completion saving and follow-up copy passed in the follow-up.
- Live admin/member and second-organization sessions.
- Interrupted/resumed real uploads, provider failure/retry, deletion during processing, and cleanup failure/retry. Real silence and cleanup functions passed on disposable fixtures; browser deletion and Workflow dispatch were not repeated.
- Mobile authenticated screens and remote deployment.

Earlier real upload, transcription, correction, and draft persistence checks are recorded separately in VERIFICATION.md.
