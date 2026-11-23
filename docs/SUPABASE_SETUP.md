# SONIUM — Supabase setup and live status

Project reference: `jengdekjfrizdypysjef`
Project URL: `https://jengdekjfrizdypysjef.supabase.co`

## Live backend status

The production Supabase project is active and has migrations `0001` through `0008` applied.

The schema includes profiles, crews, memberships, the task catalogue, completions, shared crew tasks and proofs, messages, reports, and the owner-admin registry. RLS is enabled on exposed app tables. Crew messages are included in the `supabase_realtime` publication.

The `proofs` Storage bucket is private, limited to 10 MiB per object, and restricted to supported image formats. Its policies restrict reads to crew members and uploads to the submitting member.

The `notify-report` Edge Function is deployed and ACTIVE with JWT verification enabled. Reports are stored in the database even if email delivery is not configured. Optional email alerts require server-side Supabase function secrets:
- `RESEND_API_KEY`
- `REPORTS_EMAIL`
- optionally `REPORTS_FROM`

Never put a Resend key, Supabase Secret key, legacy `service_role` key, or database password in the mobile app or repository.

## Applied migrations

Run these only on a separate clean project. They have already been applied to `jengdekjfrizdypysjef`; do not run them again on this live database.

1. `0001_initial_schema.sql`
2. `0002_security_hardening.sql`
3. `0003_function_privileges.sql`
4. `0004_private_rls_helpers.sql`
5. `0005_proof_storage_limits.sql`
6. `0006_private_rpcs.sql`
7. `0007_foreign_key_indexes.sql`
8. `0008_rls_performance.sql`

## Authentication setting that must be checked in the dashboard

SONIUM creates an anonymous authenticated user on first launch. In Supabase Dashboard → Authentication → Sign In / Providers, enable **Anonymous sign-ins**. Email/password is enabled by default for hosted projects; keep it enabled so a user can link their anonymous identity for account recovery.

Anonymous identities cannot be recovered after uninstalling or losing app data until the user links the identity to an email/password account.

## Owner-only admin bootstrap

1. Install the connected APK and open SONIUM once.
2. In Settings → Account recovery, link the owner's account to an email and password.
3. In Supabase Dashboard → Authentication → Users, copy that owner's User UID.
4. Run this once in SQL Editor, replacing the placeholder with the owner's own UID:

```sql
insert into public.app_admins(user_id)
values ('OWNER_AUTH_USER_UUID')
on conflict do nothing;
```

Only grant this role to the app owner. The `app_admins` table intentionally has no direct client policy; admin checks are performed through restricted database functions.

## Android build

The GitHub Actions workflow embeds only the Supabase URL and a public Publishable key, which is designed for client apps. RLS is the security boundary. Every push to `main` builds a debug APK artifact; the artifact expires after 14 days. This is a testing build, not a store-signed release.

## Final two-device acceptance test

After enabling anonymous sign-ins and granting the owner role, test with two different accounts/devices:

- Create a crew on device A and join it from device B with the invite code.
- Confirm member lists, daily completions, leaderboard, and chat synchronize.
- Create a shared task and upload a proof; confirm only crew members can access it.
- Submit a report and verify it appears in the owner's moderation dashboard.
- Confirm a normal member cannot access owner-only moderation or another crew's data.

Do not call the service production-ready until these end-to-end checks pass.
