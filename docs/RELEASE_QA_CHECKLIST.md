# SONIUM release QA checklist

Run this checklist on a dedicated Supabase test project and at least one physical Android device before inviting real users. Record the build number, device/Android version, test account IDs (never passwords or API secrets), and pass/fail notes.

## 1. Clean setup
- [ ] Install dependencies from the committed lockfile (add and commit a lockfile before release; none is currently committed).
- [ ] Run `npm run typecheck` and resolve every TypeScript error.
- [ ] Run `npx expo-doctor` and resolve or document every warning.
- [ ] Create a disposable Supabase project; enable Anonymous sign-in.
- [ ] Apply migrations in order: `0001_initial_schema.sql`, then `0002_security_hardening.sql`.
- [ ] Confirm the private `proofs` Storage bucket and Realtime publication tables exist.
- [ ] Configure only the project URL and publishable/anon key in the mobile app. Never use a service-role key in the client.
- [ ] Verify the report Edge Function is deployed and its Resend secrets are configured, or confirm the UI clearly reports that email alerts are unavailable.

## 2. Authentication and profile
- [ ] Fresh install creates one anonymous user and matching profile.
- [ ] Relaunch restores the same session and local preferences.
- [ ] Link an email/password credential, sign out, and sign back in.
- [ ] Verify a second device can recover the linked account.
- [ ] Verify a banned account cannot create/join a crew or access crew data.
- [ ] Confirm profile name validation and that one user cannot edit another profile.

## 3. Crew and challenge
- [ ] Create a crew; verify a unique invite code is generated.
- [ ] Join from a second account using the invite code.
- [ ] Verify invalid codes are rejected and duplicate joins do not create duplicate membership.
- [ ] Switch between multiple crews and verify all displayed data belongs to the selected crew.
- [ ] Leave a crew and verify its chat, members, tasks and proofs disappear from that account.
- [ ] Verify ordinary members cannot remove another member.
- [ ] Verify the challenge day is bounded to the configured 14-day period and dates behave correctly around midnight/time zones.
- [ ] Verify rename and penalty settings are reflected for all crew members.

## 4. Tasks, points and proof photos
- [ ] Complete and undo each daily task; verify state persists after restart.
- [ ] Verify the five prayer sub-tasks and parent completion stay consistent.
- [ ] Verify the server, not the client, determines completion points.
- [ ] Verify a user cannot submit completions for another user, another crew, or a future/past challenge day.
- [ ] Create a shared task and submit one camera proof per member.
- [ ] Verify the same member cannot submit duplicate proof for the same task.
- [ ] Verify proof images are private and readable only by members of that crew.
- [ ] Verify a user cannot upload into another member's storage folder or attach a file path from another crew.
- [ ] Verify image permission denial and camera cancellation do not crash the app.

## 5. Chat, reports and moderation
- [ ] Verify only crew members can read/write that crew's messages.
- [ ] Verify message length and empty-message validation.
- [ ] Verify Realtime updates on two devices and reconnect after network loss.
- [ ] Submit a report; verify the reported account/message/crew references are correct.
- [ ] Verify non-admins cannot read reports or invoke any `admin_*` RPC.
- [ ] Bootstrap the owner account in `app_admins` using the UUID from Supabase Auth.
- [ ] Verify the owner can review/update reports, ban/unban accounts, remove messages, remove a crew member and delete a crew.
- [ ] Verify the owner cannot accidentally ban their own account.
- [ ] Verify email notification failure does not silently mark a report as delivered.

## 6. Android and release
- [ ] Test on a physical Android device: fresh install, upgrade install, app background/foreground, rotation/portrait, low connectivity and offline state.
- [ ] Check text clipping, keyboard overlap, safe areas, dark/light themes and accessibility labels.
- [ ] Verify notification permission prompts and local reminder timing; confirm reminders can be disabled.
- [ ] Verify camera/photo permissions use clear explanations and no proof photo is uploaded without an explicit user action.
- [ ] Build an internal APK with EAS and install that exact artifact on a clean device.
- [ ] Record the EAS build URL, APK checksum, app version and Android version tested.
- [ ] Complete privacy notice, data retention/deletion process, support contact and age-appropriate safety review before public distribution.

## Current known release blockers
- No dependency lockfile is committed.
- No successful TypeScript check, Expo Doctor run, device QA or EAS APK build has been recorded.
- No live Supabase project has been migrated and tested.
- Report email delivery requires a deployed Edge Function and verified Resend configuration.
- The native UI still needs comparison against the original HTML prototype; Arabic localization and several planned features remain incomplete.

Do not mark a checkbox complete based on source-code presence alone. Only mark it after the behavior is observed in the test environment.
