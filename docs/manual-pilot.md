# Running the ClientBrief pilot

Opening a workspace starts its one-time 14-day trial with 60 shared recording minutes. Existing workspaces start on their first visit after launch. Historical recordings carry no charge. Settings shows the expiry date, completed seconds and time reserved by active jobs.

An admin can select **Request pilot access** in Settings. The request appears in the private operator queue in Supabase. It requires manual review and collects no payment. As the project operator, open the SQL Editor and list pending requests.

```sql
select org_id, plan, requested_at, term_end
from private.workspace_plans
where requested_at is not null
order by requested_at;
```

Match the organization ID to the agency in Clerk. Once you agree the pilot terms, use the row's exact organization ID and timestamp in this statement.

```sql
select private.approve_pilot('<organization ID>', '<requested_at>'::timestamptz);
```

A true result starts a fresh 600-minute term immediately for one calendar month. Approving early replaces the current allowance, so confirm the start date with the agency. Replaying an approval returns false. Refresh Settings to see the term. Each renewal requires another request and operator approval.

The server checks the duration before upload. The database reserves seconds when transcription starts, uses the provider duration on success and releases failed or cancelled jobs. Retries of the same active job share a reservation. If the provider reports a longer duration than the upload estimated, the ledger records the full duration and available time bottoms out at zero. Generation from existing transcripts, exports and client review continue after expiry. Shared links retain their usual expiry.
