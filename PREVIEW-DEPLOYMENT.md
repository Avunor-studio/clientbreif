# ClientBrief preview

Vercel team: avunor (`team_JwnMl8x7NNv7BT4pZHFZHZiQ`).
Project: clientbrief (`prj_MDrUqPGfWLPBInW6cHbCFTFIwSUE`).
Preview: https://clientbrief-dtoeadjyz-avunor.vercel.app
Deployment: `dpl_6Z7xHCuQmygv6maA4j6Hrz8v9gfy` (staging/preview target).

Deployment reached READY. Authenticated Vercel fetch checks returned 200 for `/` and `/sign-in` with ClientBrief content and no setup error. `/api/bootstrap` returned 401 without a Clerk session, as intended. This is a hosted availability/auth-boundary check; a signed-in hosted upload-to-approval flow has not yet been repeated.

Source was uploaded from the local `clientbrief` application directory; no Git integration or commit was created. Local environment files, Clerk metadata, test recordings, tests, and build caches were excluded. Preview variables were configured separately; secrets were stored as sensitive values. No production credentials were configured.

The preview uses the existing development Clerk instance and development Supabase project. AI generation uses Google directly. `APP_URL` is intentionally unset so review links and origin checks use the deployment request origin rather than localhost. Clerk sign-in/up paths and return paths are configured in the preview environment.

Vercel Authentication protection remains enabled. Reviewers may need authorized Vercel access; this is not a public pilot launch. Application sign-in remains required separately.

For remotely opened invitation emails, set the Clerk instance's fallback development host to the preview origin above. Keep Home URL `/app` and sign-in/up paths relative. This changes the external-invitation fallback from localhost; local app-origin sign-in remains available. After future preview deployments, update the fallback to the intended stable testing origin as necessary.

Vercel automatically targeted the new project's first deployment as production; it was canceled before completion. Subsequent deployment requests explicitly used `staging`, Vercel API's preview target. No production launch was completed.

Before an external agency pilot, use an intentional stable domain, appropriate production authentication/data settings, approved recording data terms, and a complete hosted upload-to-approval check. The local acceptance results are in `VERIFICATION.md` and `FEATURE-CHECK.md`.
