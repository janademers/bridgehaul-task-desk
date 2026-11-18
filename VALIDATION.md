# Package validation — November 18, 2026

Passed in the preparation environment:

- TypeScript `npx tsc --noEmit`.
- Cloudflare/Vinext production build.
- Wrangler deployment dry run: Worker bundle accepted locally, approximately 233 KiB gzip. This did not upload/deploy a Worker.
- Six authentication checks: valid signed identity, missing token, unset audience, wrong audience, expired identity, and tampered identity.
- Existing recurrence, daily run/reminder suppression, assignment and duty policy tests (`npm test`).
- Imported migration SQL into a temporary SQLite database. Row contents matched the exported snapshot for tasks, staff, history and reminder queue. Runner state was intentionally reset to unavailable with no copied schedule ID.

Not yet verified: deployment in Jana's Cloudflare account, actual Microsoft sign-in on the new Worker, employee end-to-end access/completion, remote D1 import, GitHub deployment secret/connection, or background email/Teams delivery. Complete START-HERE.md before switching staff to the new URL.

Build emitted framework dynamic-import optimization warnings; build completed successfully.
