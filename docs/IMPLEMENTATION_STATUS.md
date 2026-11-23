# SONIUM implementation status — 23 Nov 2026

## Present in the current GitHub source
- Expo Router / React Native / TypeScript app shell with Home, Stats, Crew and Settings tabs.
- Local persistence for profile name/photo, theme, task completion, prayer selection and reminder preference.
- Supabase anonymous authentication bootstrap and email/password account linking / sign-in recovery.
- Crew create/join, multi-crew selection, leave, rename and penalty selection.
- Current-day task completions and the five-prayer checklist backed by `completions` when a crew is connected.
- Crew member list, leaderboard, Realtime crew chat and emoji stickers.
- Shared Crew Tasks with camera capture, private Storage upload and signed proof display are integrated in the app source.
- Member reporting, report email invocation and owner-only moderation controls (ban/unban, report review, message removal, crew/member moderation) are integrated in the app source and SQL.
- Local daily reminder notification.
- EAS internal Android APK profile and Windows build helper.
- Supabase schema/RLS migrations and report-email Edge Function source.
- A manual release QA checklist is available at `docs/RELEASE_QA_CHECKLIST.md`.

## Not yet implemented or release-verified
- The full original HTML prototype is not yet committed in this repository; the native screen is a reduced implementation pass and still needs a detailed visual/interaction comparison.
- Shared proof upload, member reporting and owner moderation have not been verified against a live Supabase project/device.
- Remote push notifications (chat/task events), private 1:1 chat, Arabic localization and complete historical day-by-day statistics are incomplete.
- No dependency lockfile is committed yet.
- A full Expo/TypeScript check, Expo Doctor run and physical-device QA have not been completed.
- Supabase project `jengdekjfrizdypysjef` is live. Migrations 0001–0005 have been applied and verified. RLS is enabled for all ten SONIUM public tables; proof storage is private and limited to image files up to 10 MiB. The `notify-report` Edge Function is deployed with JWT verification.
- The report Edge Function is deployed. Email notifications are not configured until the owner adds Resend secrets (`RESEND_API_KEY`, `REPORTS_EMAIL`, optional `REPORTS_FROM`) in Supabase.
- EAS cloud APK build requires the owner's Expo account and signing/build setup. No APK has been generated.

## Next execution order
1. Install dependencies and create/commit a lockfile.
2. Run TypeScript and Expo Doctor checks; fix code/config errors.
3. Enable Anonymous sign-ins in Supabase Auth, create the owner's first account, bootstrap the owner UUID in `app_admins`, and test RLS/storage/admin paths.
4. Run the full manual checklist in `docs/RELEASE_QA_CHECKLIST.md` on Android.
5. Compare native screens against the original HTML prototype and close visual/interaction gaps.
6. Produce and install an EAS internal APK; record the exact build artifact and test results.

Do not distribute this build as a finished production app until migrations/RLS are reviewed and tested, device QA is completed, privacy requirements are addressed, and a signed APK is successfully produced.
