# Connect SONIUM to the Supabase project

Project reference: `jengdekjfrizdypysjef`

Project URL (used by the Android build workflow):

```text
https://jengdekjfrizdypysjef.supabase.co
```

## 1. Enable the authentication providers

In the Supabase Dashboard for this project:

1. Open **Authentication** → **Sign In / Providers**.
2. Enable **Anonymous sign-ins**.
3. Enable the **Email** provider so an anonymous profile can later be linked to an email and password.
4. Save the settings.

SONIUM creates an anonymous authenticated user on first launch. The user should link that account to an email/password from the Account recovery panel before changing phones or uninstalling the app.

## 2. Apply the database migrations

Open **SQL Editor** → **New query**. Run these repository files in this exact order, one file at a time:

1. `supabase/migrations/0001_initial_schema.sql`
2. `supabase/migrations/0002_security_hardening.sql`

Repository links:

- [Initial schema](https://github.com/Yasso209/SOn--SONIUM/blob/main/supabase/migrations/0001_initial_schema.sql)
- [Security hardening](https://github.com/Yasso209/SOn--SONIUM/blob/main/supabase/migrations/0002_security_hardening.sql)

Run each migration once on this new project. Do not run the initial schema twice: it creates tables, policies, triggers, and Realtime publication entries.

The migrations create profiles, crews, members, the task catalogue, completions, shared crew tasks/proofs, messages, reports, admin RPCs, a private `proofs` Storage bucket, RLS policies, and Realtime publication membership.

## 3. Add the public key to GitHub Actions

The Android workflow already contains the Supabase project URL. It needs the project's **Publishable key** to embed the public client configuration in the APK.

1. In Supabase open **Project Settings** → **API Keys**.
2. Copy the **Publishable key** (it starts with `sb_publishable_`). Do not copy the Secret key.
3. Open the GitHub repository **Settings** → **Secrets and variables** → **Actions**.
4. Choose **New repository secret**.
5. Name it exactly `SUPABASE_PUBLISHABLE_KEY` and paste the Publishable key as its value.

The workflow reads that secret at build time. The Publishable key is intended for a mobile app, but the database must still be protected by the supplied RLS policies. Never place a Supabase Secret key, legacy `service_role` key, database password, or Resend secret in the Android app or GitHub source.

After adding the repository secret, run the **SONIUM Android APK** workflow from the repository's **Actions** tab (or push a new commit to `main`). The resulting APK will be configured for this project.

## 4. Make the app owner an administrator

First install the connected APK and open SONIUM once so it creates the owner's anonymous account. In the app's **Settings → Account recovery**, link that same account to an email and password.

Then in Supabase open **Authentication** → **Users**, copy the owner's User UID, and run this once in SQL Editor, replacing the placeholder:

```sql
insert into public.app_admins(user_id)
values ('OWNER_AUTH_USER_UUID')
on conflict do nothing;
```

Only add the app owner's own account. This enables the owner-only moderation dashboard; ordinary crew members do not receive admin privileges.

## 5. Report email alerts (optional)

Reports are stored in the database. The optional `notify-report` Edge Function sends an email notification when it is deployed and its Resend email secrets are configured. Until then, the report record can still be reviewed in the owner dashboard, but email delivery is not available.

Deploy the function from `supabase/functions/notify-report` using the Supabase Dashboard or CLI, then configure its server-side secrets in Supabase. Do not put those secrets in GitHub source or the Android app.

## 6. Verify before using with a group

Use two test accounts on two devices:

- Create a crew on device A and join it from device B using the invite code.
- Confirm member lists, current-day task completion, leaderboard, and messages update across devices.
- Add a shared task, upload a proof photo, and confirm only crew members can view it.
- Submit a report and verify it appears in the owner's moderation dashboard.
- Confirm an ordinary member cannot access admin actions or view another crew's data.

Do not treat the live backend as production-ready until these checks pass. The current Android workflow produces a debug APK for testing, not a store-signed release.
