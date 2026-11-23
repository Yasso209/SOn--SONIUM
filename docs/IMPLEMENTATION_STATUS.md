# SONIUM implementation status — 23 Nov 2026

## Present in the source
- Expo / React Native / TypeScript app shell and four primary tabs.
- Local persistence for basic profile, theme, task completion, prayer selection and reminder preference.
- Supabase anonymous authentication bootstrap and email/password account linking / sign-in.
- Crew create/join, multi-crew selection, leave, rename and penalty selection.
- Task completions and prayer subtasks backed by `completions` when a crew is connected.
- Crew members, leaderboard, Realtime group chat, emoji stickers.
- Shared crew tasks, private storage upload, signed proof image display.
- Member reporting, report email Edge Function, owner-only report/ban/crew moderation UI.
- Local daily reminder notification.
- EAS internal Android APK profile and Windows build helper.

## Not yet release-verified / incomplete
- Dependencies could not be installed in this build environment because package registry access timed out. Therefore a full Expo/TypeScript build and device test were not possible here.
- No real Supabase project has been provisioned or migrated; SQL has not been run against a live database.
- The report email Edge Function needs deployment and Resend secrets/domain verification.
- Remote push notifications (chat/task events), photo camera capture, 1:1 chat, full weekly verdict automation, and production privacy/legal review are not complete.
- The native UI is an implementation pass, not yet pixel-compared against every screen and interaction in the HTML prototype.
- EAS cloud APK build requires the owner's Expo account and signing/build setup. No APK has been generated yet.

## Release gate
Do not distribute this build as a finished production app until migrations are applied and tested, RLS is reviewed, a device QA pass is completed, and a signed APK is successfully produced.
