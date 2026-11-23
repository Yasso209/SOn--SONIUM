# SONIUM implementation status — 23 Nov 2026

## Present in the current GitHub source
- Expo Router / React Native / TypeScript app shell with Home, Stats, Crew and Settings tabs.
- Local persistence for profile name/photo, theme, task completion, prayer selection and reminder preference.
- Supabase anonymous authentication bootstrap and email/password account linking / sign-in recovery.
- Crew create/join, multi-crew selection, leave, rename and penalty selection.
- Current-day task completions and the five-prayer checklist backed by `completions` when a crew is connected.
- Crew member list, leaderboard, Realtime crew chat and emoji stickers.
- Local daily reminder notification.
- EAS internal Android APK profile and Windows build helper.
- Supabase schema/RLS migrations and report-email Edge Function source.

## Not yet implemented or release-verified in the current GitHub app screen
- The full original HTML prototype is not yet committed in this repository; the native screen is a reduced implementation pass and still needs a detailed visual/interaction comparison.
- Shared Crew Tasks photo-proof interface and upload flow are not currently integrated in the GitHub app screen.
- Member reporting and owner moderation dashboard (ban/unban, report review, message deletion and crew moderation) are not currently integrated in the GitHub app screen, although backend SQL RPCs and the report email function are present.
- Remote push notifications (chat/task events), private 1:1 chat, Arabic localization and complete historical day-by-day statistics are incomplete.
- Dependencies could not be installed in the original build environment because package registry access timed out. A full Expo/TypeScript build and device test have not been completed.
- No live Supabase project has been provisioned or migrated. SQL has not been run against a live database.
- The report email Edge Function needs deployment and Resend secrets/domain verification.
- EAS cloud APK build requires the owner's Expo account and signing/build setup. No APK has been generated.

## Release gate
Do not distribute this build as a finished production app until the missing app features are restored, migrations/RLS are reviewed and tested, device QA is completed, and a signed APK is successfully produced.
