# Future changes and deployment workflow

Use one private GitHub repository as the source for the Cloudflare version. The original ChatGPT Site and this external Worker become separate deployments; finalizing a Site change here does not automatically publish to Cloudflare.

## One-time connection

1. Complete the first manual deployment and Access setup in START-HERE.md.
2. Create an empty **private** GitHub repository called `bridgehaul-task-desk`, without adding a README there. Install Git for Windows if needed.
3. From PowerShell inside this source folder, run the commands below. Replace YOUR-ORGANIZATION with your actual GitHub organization or username:

```powershell
git init -b main
git add .
git status
```

Confirm `migration/`, `.env` files, credentials, node_modules and dist are absent from staged files. Application source includes internal seed duties/staff, so the repository must remain private.

```powershell
git commit -m "Prepare BridgeHaul Task Desk for Cloudflare"
git remote add origin https://github.com/YOUR-ORGANIZATION/bridgehaul-task-desk.git
```

4. In GitHub, create a repository **Environment** named `production` under Settings → Environments. Add its secret named `CLOUDFLARE_API_TOKEN`. Use Cloudflare's Edit Cloudflare Workers API-token template scoped only to your account; include the permissions needed for this Worker's D1 binding if prompted. Do not paste the token into chat, source, or commands committed to Git. You can require deployment reviewers in the production environment if you want a review before each release.
5. Push the source:

```powershell
git push -u origin main
```

6. Open GitHub → Actions → Deploy Task Desk and verify the first run succeeds. This is the point at which automatic deployments become connected.

Official setup: https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/

## Routine request-to-release process

- Request changes here against the **Cloudflare repository**, and provide the current source or connect the repository to a coding workspace. We can prepare updated files or a patch. This chat currently has no direct write/deploy connection to your new private repository.
- Work on a branch. Review the change, run `npm ci`, `npm test`, `npx tsc --noEmit`, and `npm run build:cloudflare`.
- Commit and open a pull request. Merge to main when ready. The supplied workflow runs tests and the build, then deploys to Cloudflare. It does not copy the snapshot or import SQL.
- Open the live URL and confirm the changed behavior. Tasks, staff and completions remain in D1 through code releases.
- For database schema changes, prepare a separate versioned migration. Back up D1 first, review the SQL, and apply that specific migration before the dependent code. Never rerun `migration/import.sql` as an update mechanism.

## Backup and rollback

Before a schema migration or final data cutover, export the current database to a private location:

```powershell
npx wrangler d1 export bridgehaul-task-desk --remote --output taskdesk-backup.sql
```

Keep exports out of Git. For a bad code release, revert the commit and merge the revert to main to rebuild/redeploy the previous code. Code rollback does not undo D1 writes or schema changes. Restore data only from a reviewed backup/recovery plan.

## Commands

| Purpose | Command |
| --- | --- |
| Check recurrence, assignment, duty and authentication behavior | `npm test` |
| Type check | `npx tsc --noEmit` |
| Build external Worker | `npm run build:cloudflare` |
| Manual code deployment | `npm run deploy:cloudflare` |
| One-time initial data import | `npm run db:import` |

The original Sites scaffolding remains in this source for reference. Use the `:cloudflare` commands for the external deployment, rather than the original Sites build/publish helpers.
