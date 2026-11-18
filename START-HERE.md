# BridgeHaul Task Desk — Cloudflare deployment

Prepared November 18, 2026. This package is ready for deployment; it has not been deployed to your Cloudflare account. No ChatGPT account is needed by employees once Cloudflare Access is configured.

## Included

- BridgeHaul application source and logos, with recurring duties, staff roles, active/inactive staff, history, archive/delete, and reminders settings.
- Cloudflare Worker configuration bound to your existing D1 database.
- Microsoft sign-in through your existing Cloudflare Access identity provider; verified signed identities and employee-specific API access. Jana is the initial manager. Other active employees can view their own duties/history and complete their own tasks. Managers can administer all staff and duties.
- `migration/import.sql`: one-time schema and data import.
- `migration/snapshot.json`: private source data snapshot captured 2026-11-18 at 19:05 UTC (12:05 p.m. Boise).
- `.github/workflows/deploy.yml`: deploy on pushes to main after GitHub setup.

The snapshot contains 124 duties, 14 staff, 3 completion history entries, 6 reminder delivery records and 1 runner configuration. This ZIP contains internal employee/task information. Keep the package and repository private. The migration folder is excluded from Git commits.

## 1. Install and check your account

Extract the ZIP. Open PowerShell **inside the extracted bridgehaul-task-desk folder**. Install Node.js 24 LTS if needed, then run:

```powershell
node --version
npm ci
npx wrangler whoami
```

If Wrangler is not signed in, run `npx wrangler login`. Your target account ID must be `2b3a9823b3c792bb833f10eb41a48d0e`. Signing in on your computer does not connect Cloudflare to this chat.

## 2. Import the snapshot once

The target must be the empty D1 database you created, ID `0b00ea61-d39f-4739-906b-4f4cbc1651a2`, named `bridgehaul-task-desk`. Check that it is empty:

```powershell
npx wrangler d1 execute bridgehaul-task-desk --remote --command "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%';"
```

If application tables already exist, stop and inspect them. Do not delete or overwrite a populated database. For your empty database:

```powershell
npm run db:import
npx wrangler d1 execute bridgehaul-task-desk --remote --file migration/verify.sql
```

Expected imported counts: tasks 124; staff 14; history 3; reminder_queue 6; reminder_config 1. Import is intended once; duplicate tables/IDs produce errors rather than replacing live records. Do not rerun import on later releases.

Changes made to the old Site after the snapshot time are not included. For a final cutover, pause edits on the old Site and obtain an updated export before importing into an empty target. This package is a point-in-time migration, not continuous synchronization.

## 3. First deploy

```powershell
npm run deploy:cloudflare
```

Wrangler prints the actual `workers.dev` URL. Save it. No custom domain is required. The app initially returns an Access setup error and will not return task data until the Access audience is configured.

## 4. Protect it with Microsoft sign-in

Your Microsoft identity-provider test is already complete. Now protect this application itself:

1. In Cloudflare, open **Workers & Pages → bridgehaul-task-desk → Access**.
2. Choose **Protect this Worker behind Access**, select **All traffic**, and apply an access policy.
3. In **Zero Trust → Access → Applications**, edit the resulting application. Select your tested Microsoft Entra ID login provider and allow only the approved staff email addresses (start with Jana and one test employee). Remove any unintended broad allow or bypass policies.
4. Copy this application's **Application Audience (AUD) Tag** from its configuration. This is different from the Microsoft client ID and tenant ID.
5. Open `wrangler.jsonc` in your extracted folder and replace `SET_AFTER_CREATING_ACCESS_APPLICATION` with that AUD tag. Keep `ACCESS_TEAM_DOMAIN` as `jana-demers.cloudflareaccess.com`. Save.
6. Run `npm run deploy:cloudflare` again.

If your dashboard uses the older layout, enable Cloudflare Access under the Worker's Domains/Settings for both production and preview URLs, then edit the generated Access application in Zero Trust. Use the production application's audience tag. Protect every alternate route/preview as well.

Reference: https://developers.cloudflare.com/workers/configuration/cloudflare-access/

## 5. Verify before inviting everyone

- Open the Worker URL in a private browser. Microsoft sign-in should appear; anonymous API access must not return duty or staff data.
- Sign in as `jana.demers@bridgehaul.com`: verify staff counts, assignments, history, archive state and settings against the old Site.
- In Staff directory, verify each active employee has the exact email Microsoft returns. Inactive employees cannot use their previous staff account; additional managers are listed explicitly in `ADMIN_EMAILS` in wrangler.jsonc.
- Sign in as a test employee: only their assigned duties/history are returned. Complete one task, refresh, and verify its completion and history. Trying another employee's `?rep=` link must not reveal that employee's tasks.
- Test due dates and daily time slots in Boise time. Completed recurring tasks reset when their next cycle is opened; no separate cron is needed for that reset.
- Browser notifications are shown only while the application is open, with browser permission enabled. Email and Teams background sending needs the separate cutover below.

## 6. Cut over reminders separately

Saved destinations and reminder delivery states are included. Sending/unknown/sent records are retained for duplicate prevention. The old Sites schedule ID is intentionally removed from the copied runner state.

This deployment does not install an email/Teams sender, migrate ChatGPT connector sessions, or automatically retarget the existing reminder automation. The existing automation still targets the old Site. Keep the old Site as the working system until the new sender is ready; do not operate two active reminder senders.

See `REMINDER_RUNNER.md` for the claim/send/record contract. After a new sender is connected and tested, pause the old schedule, reconcile any last reminder/completion changes, and then enable the new sender. Uncertain sends must remain unknown rather than being retried. Do not remove the old Site until the new version and its data are verified.

## 7. Set up future changes

See `FUTURE-CHANGES.md`. The included GitHub workflow is configured, but no GitHub repository or Cloudflare deployment connection has been created by this package. Once you connect a private repository and add its deployment secret, merging changes into main will deploy the code. Data remains in D1 and is not reimported by the workflow.
