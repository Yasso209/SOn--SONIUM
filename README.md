# SONIUM — Android app

SONIUM is a 14-day challenge app for friends. The Android client is built with Expo, React Native and TypeScript; Supabase provides authentication, Postgres, Row Level Security, Realtime chat and private proof storage.

## Project structure

- `app/` — Expo Router entry and native screens.
- `src/lib/supabase.ts` — Supabase client with persisted authentication.
- `src/theme/tokens.ts` — SONIUM dark/light theme.
- `assets/mascot.webp` — Home-screen mascot.
- `supabase/migrations/` — initial database/RLS schema and security hardening.
- `supabase/functions/notify-report/` — optional report email notification function.
- `docs/HANDOFF-original.md` — original product decisions and design requirements.
- `docs/IMPLEMENTATION_STATUS.md` — honest implementation and release status.
- `docs/RELEASE_QA_CHECKLIST.md` — manual verification steps required before release.

## Current implementation

The native app includes Home, Stats, Crew and Settings; daily tasks and the five-prayer checklist; day selection; profile/theme persistence; anonymous Supabase sign-in; crew create/join/switch/leave; leaderboard; Realtime crew chat with stickers; shared crew tasks with camera proof upload and signed image display; member reporting; owner-only moderation controls for reports, accounts, messages and crews; email/password account linking; local daily reminder; and privacy disclosure for owner review of crew messages.

The backend migrations define crew membership, tasks, completions, shared tasks/proofs, messages, reports, admin controls and RLS policies. The report Edge Function sends report metadata through Resend when configured.

## Important: not a release build yet

This repository is an active development implementation, not a verified production release. No APK has been generated. No live Supabase project has been provisioned or migrated, and the SQL has not been tested against a live database. Dependencies and the native app have not completed an end-to-end build/device QA pass. Remote push notifications, complete proof-photo flow verification, historical day-by-day statistics, Arabic localization, private 1:1 chat, and final visual comparison with the original HTML prototype remain incomplete.

Do not distribute to real users until the database migrations and RLS are reviewed and tested, device QA passes, and a signed APK is produced.

## Requirements

- Node.js 20 LTS or newer
- npm
- Supabase project
- Expo / EAS account for cloud APK builds

## Local setup (Windows PowerShell)

1. Install Node.js LTS from https://nodejs.org/ and reopen PowerShell.
2. In the project folder run:

   ```powershell
   npm install
   Copy-Item .env.example .env
   ```

3. Create a Supabase project and enable Anonymous sign-ins under Authentication > Sign In / Providers.
4. In Supabase SQL Editor, run `supabase/migrations/0001_initial_schema.sql`, then review and run `0002_security_hardening.sql`.
5. Add the Supabase Project URL and publishable/anon key to `.env`. Never put a service-role key in the app or chat.
6. Start the app with `npx expo start`.

## Build an installable APK

Run:

```powershell
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build --platform android --profile preview
```

The EAS preview profile produces an internal Android APK. EAS login and Android signing setup are required. The included `build-apk.ps1` helper can install Node.js LTS through winget, install dependencies and start the EAS build.

## Owner admin bootstrap

After the owner's first anonymous sign-in, copy that account UUID from Supabase Authentication > Users, then run this once in SQL Editor:

```sql
insert into public.app_admins(user_id) values ('OWNER_AUTH_USER_UUID');
```

Never expose the service-role key. The owner is the only app-wide moderator; crew members are equal and cannot remove each other.

## Report email alert

Deploy `supabase/functions/notify-report` and configure the Edge Function secrets `RESEND_API_KEY`, `REPORTS_EMAIL` and `REPORTS_FROM`. The service-role key is read only in the Edge Function environment; never add it to mobile app configuration.

## Privacy

Crew chat is visible to crew members and may be reviewed by the app owner for moderation, as disclosed in-app. Proof images are intended to be stored in the private `proofs` bucket and visible only to the relevant crew. Review the privacy notice and applicable requirements before public distribution.
