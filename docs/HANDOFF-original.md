# SONIUM — handoff

## What it is
Android app for a 14-day challenge between friends. Daily tasks give points. Each week the member in last place pays a penalty (treats the crew, the crew decides, or a custom one). Name: SONIUM. Developer: Yassin Mohamed. Support WhatsApp: 01100322517.

## Files
- `sonium.html` — finished interactive prototype (Home, Stats, Crew, Settings). Single file, no server. This is the visual and behaviour reference: match it exactly when porting.
- `schema.sql` — Supabase schema, RLS and storage policy. Syntax checked, not yet run on a real project.
- The 4 design screenshots (Home, Stats, Crew, Settings) are in the user's own gallery. Ask the user to attach them again if needed.

## Decisions already made
- Native Android app: React Native + Expo + TypeScript. iOS later. No Google Play, no PWA.
- Server: Supabase (anonymous sign-in, Postgres with RLS, Realtime, Storage). Free tier only.
- Distribution: APK built with EAS Build, hosted on GitHub Releases, installed by friends from a private link.
- No login screen: anonymous sign-in, the user picks a name and a photo.
- Crews: no founder, no admins. Anyone invites with a link, anyone leaves, nobody removes others. A user can be in several crews (shown as "Another crew" in Settings).
- App owner (the user) is the only admin: reads reports and bans from the Supabase dashboard. Reports should also email him (Database Webhook or Edge Function, later phase).
- Group chats can be reviewed by the owner. The app must say so clearly (privacy sheet already does).
- Chat: crew chat only for now, with emoji and stickers. Private 1:1 chats later.
- Notifications: instant (messages, friend finished a task) plus a daily reminder. Needs Firebase Cloud Messaging with Expo. Later phase.
- Shared "Crew Tasks" need a camera photo as proof (20 points, stored in the private `proofs` bucket at `<crew_id>/<user_id>/<file>`).
- Points come from `task_catalog` on the server. Tasks can only be logged for the current challenge day.
- Challenge length is 14 days (the design screenshots say 7 as placeholder).

## Prototype behaviour to keep
- Dark by default, lime accent. Light theme and "follow system" in Settings > Appearance.
- Floating glass pill tab bar (Home, Stats, Crew, Settings). The bubble bounces between tabs and the bar can be dragged.
- Home: hero with the 3D mascot (cutout from the design), progress ring, first 4 tasks, "Keep Going!" scrolls to the next unfinished task, "See All" opens a day-by-day view (past days read-only).
- "Daily prayers" is a group task: tapping opens the 5 prayers sheet; it completes when all 5 are on.
- Stats: tiles, challenge progress, weekly bars (tasks or points), quick insights.
- Crew: members, invite link sheet, rename crew, points and rank, crew progress, chat card, Crew Tasks with photo proof, weekly verdict card with penalty picker, activity feed.
- Settings: profile (name, photo), notifications, appearance, privacy, language (Arabic coming soon), crews, About, Help & Support.
- Chat: emoji tray, sticker tray (8 stickers), Enter to send.

## Suggested build order
1. Project setup (Expo, TypeScript, navigation, theme tokens from the prototype, fonts).
2. Supabase client, anonymous sign-in, profile name, create crew, join by invite link.
3. Tasks and points (`completions`), leaderboard (`crew_leaderboard` view), streak, stats.
4. Crew tasks with camera proof (Storage upload) and the weekly verdict.
5. Chat with Realtime, emoji, stickers, report and block.
6. Push notifications.
7. EAS build, APK on GitHub Releases.

Do one phase per message and test before moving on. Never ask the user to share a `service_role` or secret key. The anon / publishable key and project URL are fine.

## Still open
- Does the user have a laptop that can run Node.js? (Needed to build the APK.)
- Supabase project URL and anon key (user will create the project).
- Add the user to `app_admins` after his first sign-in.
