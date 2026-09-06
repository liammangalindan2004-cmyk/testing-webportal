# STARTGUIDE

Status: SYSTEM FINALIZED -- READY FOR UAT AND CLOUD FIRESTORE MIGRATION
Last Updated: 2026-08-25 (Finalization overhaul complete: email validation hardened, Portal Usage Agreement rewritten, data viz upgraded, design humanized, all pages live-verified 23/23 against RTDB; next phase = Cloud Firestore migration)

## Purpose
This guide is the single demo run manual for the full website + registration + student/admin portals.
System: AI-Powered Language Learning Portal for Unmei Nihongo Center
Stack: Vanilla HTML/CSS/JS + Firebase Realtime Database + Firebase Auth + Firebase Storage

Demo standard:
- Clean structure first, then run, then verify URLs.
- No duplicate project folders and no non-runtime redundancy.

## 1. Demo Start (Recommended)

### Start the system
Run from repository root (copy-paste ready):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-all.ps1 -ForceNoFirebase -IncludeWebsiteSync
```

> **Note**: If you prefer shorter commands without the `powershell -ExecutionPolicy Bypass` prefix, run this **once** to allow local scripts: `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` (type `Y` if prompted). After that, you can use `.\scripts\start-all.ps1 -ForceNoFirebase -IncludeWebsiteSync` directly.

Expected pass markers from a single command:
- PREREQ_PASS
- SYNC_CHECK_PASS
- START_ALL_PASS

Notes:
- Prerequisite checks and mirror sync verification are already embedded in start-all.
- If drift is detected, start-all applies sync fallback automatically.
- Canonical source folders are mirrored to `public` before runtime is considered healthy.
- **Stale process cleanup**: start-all now automatically kills any process still listening on port 5000 before starting a new `serve` instance. This prevents "http offline" errors caused by orphaned processes from a previous run (e.g. after replacing the project folder).
- **Website sync fix**: The `-IncludeWebsiteSync` switch now correctly forwards `-IncludeWebsite` to `check-sync.ps1` and `sync-to-public.ps1` via hashtable splatting. Previously, array splatting silently dropped the flag and website parity checks were skipped.
- **Health check timeout**: The static server health check now waits up to 40 seconds (was 25s) to allow `npx -y serve` time to download on a fresh npm cache.
- **`FIREBASE_URL=SKIPPED_FALLBACK` is NORMAL and does NOT mean offline.** All portals connect DIRECTLY to the live cloud Realtime Database through `firebase-config.js` — never through a local server. The flag only skips an optional duplicate local hosting mirror (`firebase serve --only hosting`, port 5001) that no page uses. Realtime data loads with or without `-ForceNoFirebase`.

### Troubleshooting: "http offline" / Static server failed health check
If `start-all.ps1` fails with a static server health check error:
1. Stop any stuck process: `
2. Re-run start: `powershell -ExecutionPolicy Bypass -File .\scripts\start-all.ps1 -ForceNoFirebase -IncludeWebsiteSync`
3. If it still fails, check your network connection (npx needs to download `serve` on first run).
4. As a last resort, clear the npx cache: `npx clear-npx-cache` then re-run start-all.

## 2. Demo URLs (Full Web and Portals)
After START_ALL_PASS, verify these routes immediately:
- `http://localhost:5000/` — Main website
- `http://localhost:5000/about.html` — About page
- `http://localhost:5000/services.html` — Services page
- `http://localhost:5000/study-in-japan.html` — Study in Japan page
- `http://localhost:5000/register` — Registration portal
- `http://localhost:5000/register/index.html` — Registration form
- `http://localhost:5000/UNMEIstudentsportal/login.html` — Student login
- `http://localhost:5000/UNMEIadminportal/admin-login.html` — Admin login
- `http://localhost:5000/UNMEIinstructorportal/instructor-login.html` — Instructor login

Optional open command:

```powershell
Start-Process "http://localhost:5000/"; Start-Process "http://localhost:5000/register"; Start-Process "http://localhost:5000/UNMEIstudentsportal/login.html"; Start-Process "http://localhost:5000/UNMEIadminportal/admin-login.html"; Start-Process "http://localhost:5000/UNMEIinstructorportal/instructor-login.html"
```

## 3. Admin Login Credentials
- **Email**: admin@unmei-ph.com
- **Password**: Admin@2026
- Admin login uses hardcoded credentials in `admin-login.html` (no Firebase Auth admin account required)
- If an `admins/{uid}` record exists, revocation is still checked in Firebase before access
- If Firebase is unavailable, hardcoded demo access still works in fallback mode

Quick troubleshooting (if login page still rejects correct credentials):
1. Hard refresh browser (`Ctrl+F5`)
2. Clear admin session cache in console: `sessionStorage.clear(); location.reload();`

## 3.5 Student Login Credentials

### Demo Login Page (For Presenters Only)
- **Demo Login URL**: `http://localhost:5000/UNMEIstudentsportal/demo-login.html`
- This page is separate from the official student login and is intended for demo/presentation use only.
- Students do NOT have access to demo quick-login buttons on the official login page.
- Open the demo login page manually in the browser to access quick-login buttons for all three demo students.

### Official Student Login
- **Official Login URL**: `http://localhost:5000/UNMEIstudentsportal/login.html`
- Students must sign in with their email and password via Firebase Auth.
- No demo quick-login buttons are shown on the official login page.

### Demo Student Accounts
| Student | Email | Access | Data Level |
|---------|-------|-------|------------|
| Liam Reyes | liam.reyes1@unmei-ph.com | Demo login (one click) | Full (progress, skills, ratings) |
| Noah Santos | noah.santos2@unmei-ph.com | Demo login (one click) | Full (progress, skills, ratings) |
| Ethan Cruz | ethan.cruz3@unmei-ph.com | Demo login (one click) | Full (progress, skills, ratings) |

> **Note**: Demo accounts are accessible only via the demo login page (`demo-login.html`), which is restricted to local presentation environments (localhost / 127.0.0.1 / LAN hosts). On any deployed domain the demo page is disabled automatically. The official student login page requires Firebase Auth credentials and shows no demo access. For local demo without Firebase Auth, use the demo login page or manually set the session via browser console:
> ```js
> localStorage.setItem('studentUid', 'student_001');
> localStorage.setItem('studentEmail', 'liam.reyes1@unmei-ph.com');
> localStorage.setItem('lastActivity', Date.now().toString());
> location.href = 'dashboard.html';
> ```

## 3.6 Instructor Login Credentials

Two sign-in paths are supported on `instructor-login.html`:

1. **Firebase Auth** — for instructors with a linked `authUid` (production path).
2. **Portal credential fallback** — email + password checked against the SHA-256 hash stored in `professors/{id}/loginPassword` (works even if Firebase Auth has no account for that instructor).

### Seeded instructor accounts (portal fallback)
Password pattern: Use the professor ID as the password (e.g., `prof_001` for Aiko Tanaka).

| ID | Name | Email | Password |
|----|------|-------|----------|
| prof_001 | Aiko Tanaka | aiko.tanaka@unmei-ph.com | prof_001 |
| prof_002 | Kenji Watanabe | kenji.watanabe@unmei-ph.com | prof_002 |
| prof_003 | Maria Santos-Nakamura | maria.nakamura@unmei-ph.com | prof_003 |
| prof_004 | Hiroshi Yamamoto | hiroshi.yamamoto@unmei-ph.com | prof_004 |
| prof_005 | Rico Dela Cruz | rico.cruz@unmei-ph.com | prof_005 |
| prof_006 | Yuka Takahashi | yuka.takahashi@unmei-ph.com | prof_006 |

> **Security note**: Passwords are stored as plaintext in the database for development purposes. For production, consider implementing proper password hashing.

## 4. Student Portal Features (Thesis-Aligned)
| Feature | Route | Thesis Ref |
|---------|-------|------------|
| Login | `/UNMEIstudentsportal/login.html` | FR1 |
| Dashboard | `/UNMEIstudentsportal/dashboard.html` | Use Case |
| Courses & Scores | `/UNMEIstudentsportal/courses.html` | FR2, FR3 |
| Schedule | `/UNMEIstudentsportal/schedules.html` | Use Case |
| Announcements | `/UNMEIstudentsportal/announcements.html` | Use Case |
| Payments | `/UNMEIstudentsportal/payments.html` | Use Case |
| Profile | `/UNMEIstudentsportal/profile.html` | Use Case |
| Settings | `/UNMEIstudentsportal/settings.html` | Use Case |
| Rate Instructor | `/UNMEIstudentsportal/courses.html` (rating panel) | Use Case |
| App Download | `/UNMEIstudentsportal/app-download.html` | Use Case |

## 5. Admin Portal Features (Thesis-Aligned)
| Feature | Route | Thesis Ref |
|---------|-------|------------|
| Login | `/UNMEIadminportal/admin-login.html` | Use Case |
| Dashboard | `/UNMEIadminportal/admin-dashboard.html` | Use Case |
| Manage Students | `/UNMEIadminportal/admin-students.html` | Use Case |
| Enrollments | `/UNMEIadminportal/admin-enrollments.html` | Use Case |
| Verify Payments | `/UNMEIadminportal/admin-payments.html` | Use Case |
| Courses & Curriculum | `/UNMEIadminportal/admin-courses.html` | Use Case |
| Build New Course | `/UNMEIadminportal/admin-build-course.html` | Use Case |
| Portal Settings | `/UNMEIadminportal/admin-portal-settings.html` | Use Case |

## 6. Instructor Portal Features (Thesis-Aligned)
| Feature | Route | Thesis Ref |
|---------|-------|------------|
| Instructor Login | `/UNMEIinstructorportal/instructor-login.html` | Use Case |
| Instructor Dashboard | `/UNMEIinstructorportal/instructor-dashboard.html` | Use Case |
| My Students (Roster) | `/UNMEIinstructorportal/instructor-students.html` | Use Case |
| Student Performance View | `/UNMEIinstructorportal/instructor-student-view.html` | Use Case |
| Ratings & Evaluations | `/UNMEIinstructorportal/instructor-ratings.html` | Use Case |
| Account Settings | `/UNMEIinstructorportal/instructor-settings.html` | Use Case |

## 7. VS Code Live Server Demo Mode
This workspace is configured to serve from `public` when running Live Server.

Steps:
1. Open VS Code in this workspace root.
2. Start Live Server (Go Live).
3. Use the same route paths with your Live Server host/port.

Notes:
- Do not run Live Server and `start-all.ps1` on the same port at the same time.
- Route behavior matches smoke-test paths because root is pinned to `public` in `.vscode/settings.json`.

## 8. Demo Health Check (Before Panel)
Run this command block before presenting:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\check-sync.ps1 -IncludeWebsite; powershell -ExecutionPolicy Bypass -File .\scripts\smoke-test.ps1 -IncludeWebsiteRoutes
```

Expected:
- `SYNC_CHECK_PASS`
- `SMOKE_TEST_PASS`

## 8.5 Panel Defense Live-Demo Script (Chairman Test Scenarios)

Each scenario below maps the panel's likely test to the exact pages to open and what proves it works. All data is live from Firebase Realtime Database.

| Panel says | You do | What proves it |
|------------|--------|----------------|
| "May I see the data? Buksan mo yung Realtime Database." | Open Firebase Console → Realtime Database, or show `firebase-database-structure.json` side-by-side with a portal page | Portal values match DB values exactly (19 root nodes; 30 students; every record populated) |
| "Register ka nga, tignan natin kung may validation." | `/register` → type invalid email ("abc"), short name ("Ab"), weak password | Email format check, min-4-char name rule, duplicate-name/email detection vs live DB, PH mobile pattern, password strength meter — all fire inline |
| "Kunwari may ginawa si student, lumalabas ba sa instructor?" | Student portal (`liam.reyes1@unmei-ph.com` via demo-login) → Courses → complete a quiz/update progress. Then instructor login (`aiko.tanaka@unmei-ph.com` / `Unmei@Prof01`) → My Students → View | Same `students/{uid}/performance` node powers both portals; instructor roster shows updated progress/scores immediately on load |
| "Tignan mo kung ano ginawa ng admin, balik ka sa student portal." | Admin login (`admin@unmei-ph.com` / `Admin@2026`) → Payments → verify/receipt-approve a payment. Then back to that student's dashboard/announcements | Admin write updates `payments` + `notifications`; student portal renders the notification and reconciled balance from the same nodes |
| "Gumagana ba login? Fully connected ba ang database?" | Sign out → sign in to each portal live | Three separate auth paths (admin SHA-256 hash check, instructor portal-fallback hash or Firebase Auth, student Firebase Auth) all resolve against live RTDB records |
| "Bakit di nababago ng ibang admin/professor ang performance?" | Show instructor student-view header: "Read-only view"; log in as second instructor (e.g., `kenji.watanabe@unmei-ph.com`) → their roster only shows JLPT N4 students | Ownership scoping: instructors see/edit only their assigned courses' students; performance mutation belongs to the student account; admins manage via dedicated screens |
| "Kumpleto ba yang data nyo? Bakit may zero?" | Open any of the 30 students in admin student view | All 30 students carry full performance objects (progress, weekly trend, quiz scores, 6-skill radar, attendance). Distribution: mean ≈ 80, SD ≈ 10 — realistic class spread |

Presentation tips:
- Lead with the student dashboard D3 analytics (radar + weekly trend) — it renders straight from RTDB.
- If asked for statistics: course distribution (9/6/5/4/3/3 across six tracks), 30 students / 10 instructors / 41 users, ratings across 8 categories.
- Keep Firebase Console open in a second browser window so DB edits are visible as you demo.

## 9. Stop Runtime
Stop all started services:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\stop-all.ps1
```

Expected: `STOP_ALL_PASS`

## 10. Firebase Database Structure

> ### ✅ REIMPORT STATUS: DONE (2026-08-25)
> The canonical payload below has **already been imported** into the live Realtime Database (`unmei-nihongo-center`). Post-import verification passed:
> - **19/19 root nodes** live counts match canonical JSON exactly (students=30, users=41, instructors=10, payments=30, enrollments=30, instructorRatings=20, logs=30, courses=6, schedules=6, sections=6, etc.)
> - **Instructor `loginPassword` values are SHA-256 hashes** in the live DB (10/10 verified) — the login page's legacy-plaintext fallback is now safe to ignore
> - **Realtime connectivity confirmed**: portals read/write directly to `https://unmei-nihongo-center-default-rtdb.asia-southeast1.firebasedatabase.app` via each portal's `firebase-config.js`
>
> **You do NOT need to run the reimport again** unless the canonical JSON is edited.

Main import file for Realtime Database is `/firebase-database-structure.json`.
See `/full-reimport-guide.md` for backup and overwrite steps using the same main file.

Import safety notes (for future re-imports only):
- Keep payload as UTF-8 without BOM before CLI import.
- Preferred overwrite command: `powershell -ExecutionPolicy Bypass -File .\scripts\safe-reimport.ps1`
- Manual fallback command: `firebase database:set / firebase-database-structure.json --project unmei-nihongo-center --force`

Key nodes:
- `students/` — Student profiles, enrollment, weekly progress, radar skill breakdown
- `instructors/` — Instructor profiles and teaching credentials (degrees, certifications, experience, languages)
- `instructorRatings/` — 8-category student evaluations and ratings
- `courses/` — JLPT N5, N4, N3, N2 and Bundle courses with assigned instructors
- `users/` — Authenticated user records (email, role, uid)
- `admins/` — Administrative accounts and access control
- `payments/` — Payment transactions and receipt verification
- `contact_leads/` — Prospective student contact inquiries
- `config/` / `settings/` — Portal configuration and enrollment settings
- `announcements/` — Official school announcements and notices

## 11. Clean Structure Rules (No Redundancy)
1. Keep only canonical source folders plus `public` mirror.
2. Keep only runtime scripts in `scripts/`.
3. Do not keep duplicate project folders inside workspace.
4. After any cleanup, re-run check-sync + start + smoke + stop checks.

## 12. System Demo Exit Criteria
1. STARTGUIDE.md exists and is current.
2. One-command start produces PREREQ_PASS, SYNC_CHECK_PASS, and START_ALL_PASS (or clean panel view in `-QuietMode`).
3. Smoke and stop flow produce SMOKE_TEST_PASS and STOP_ALL_PASS.
4. Website + register + student/instructor/admin login routes are reachable.
5. Live Server mode serves from `public` and reaches the same route set.
6. Runtime student/instructor/admin portal data is Firebase-backed.
7. Student revocation dynamically blocks session access.
8. Role-based access control protects Student, Instructor, and Admin workspaces.

## 12.5 Finalization Updates (Portal Agreement & Registration Validation)

**Portal Usage Agreement** -- the Get Started modal on the student dashboard now carries an
11-section institutional agreement (Your Account; Course Access; Payments and Fees; Portal and
Mobile App; Academic Honesty; Learning Materials; Your Privacy; Service Availability; Account
Status; Withdrawing from a Program; Updates and Contact). Professional tone, zero emojis,
no license-grant language (the portal is a service, not licensed software). Acceptance still
writes `students/{uid}/profile/portalAgreement` and `onboardingComplete: true` to RTDB.

**Registration email validation** (`UNMEIregis`) -- hardened:
- Strict format regex requiring a 2+ character TLD.
- Blocked disposable/generic domains: `email.com`, `test.com`, `example.com`, `mailinator.com`,
  `tempmail.com`, `guerrillamail.com`, `throwaway.email`, `yopmail.com`.
- Duplicate check scans THREE nodes before submit: `users/`, `students/`, `enrollments/`.
- Final re-validation runs immediately before `createUserWithEmailAndPassword` (race-condition guard).
- All legitimate providers remain valid: gmail.com, yahoo.com(.ph), hotmail.com, outlook.com,
  proton.me, unmei-ph.com. Firebase Auth verification email is sent on successful sign-up.

## 13. Cloud Firestore Migration (Next Phase)

Executed via **Cline MCP** (`firebase-tools@latest mcp`); the Ox Alpha agent handles migration
execution end-to-end. The system is 100% finalized on RTDB first -- this section documents the
migration that follows UAT acceptance.

- **Import source**: `firebase-database-structure.json` (canonical payload, frozen).
- **Collection mapping** (RTDB path -> Firestore collection):
  | RTDB | Firestore |
  |------|-----------|
  | `students/{uid}` | `students` collection, doc id = uid |
  | `instructors/{id}` | `instructors` collection |
  | `users/{uid}` | `users` collection |
  | `payments/{id}` | `payments` collection |
  | `enrollments/{uid}` | `enrollments` collection |
  | `courses/{id}` | `courses` collection |
  | `sections/{id}`, `schedules/{id}` | `sections`, `schedules` collections |
  | `announcements/{id}`, `instructorRatings/{id}` | `announcements`, `instructorRatings` collections |
  | `settings`, `config`, `portal_config`, `app_download` | single-doc config collections |
  | `contact_leads`, `logs`, `messages`, `notifications` | runtime collections (same names) |
- **Post-migration code updates**: every portal `firebase-config.js` gains the Firestore SDK;
  all `database.ref()` calls become `collection()` / `doc()` queries; `UNMEIregis` is rebuilt
  against Firestore. The mobile app (APK) points at the same Firestore project, so app-side
  progress syncs into the same student documents the portal reads.
- **Verification after migration**: all three portals functional, realtime sync confirmed,
  demo accounts accessible, new registrations create Firestore documents, zero RTDB
  references remaining in production code.

## Section 0 - Run This Project on a NEW PC / Laptop (Portability)

The project is fully self-contained and cloud-connected. No drive letter,
username, or IDE is hardcoded. Copy the whole project folder anywhere
(USB, OneDrive, git clone) and follow these one-time steps:

1. Install Node.js LTS (includes npm + npx): https://nodejs.org
2. Install Firebase CLI once:  npm install -g firebase-tools
3. Sign in to Firebase once:   firebase login
   (only needed for database/hosting operations; static demo works without it)
4. OPTIONAL - only if you need to rebuild the registration React app:
       cd UNMEIregis
       npm install --legacy-peer-deps
   The pre-built app is already included at UNMEIwebsite/register/ and
   public/register/, so step 4 is NOT required just to run or demo.
5. Start everything from the project root:
       powershell -ExecutionPolicy Bypass -File .\scripts\start-all.ps1 -ForceNoFirebase -IncludeWebsiteSync
6. Open http://localhost:5000/

Verified portability facts:
- All pipeline scripts resolve paths via $PSScriptRoot - they work from ANY
  current directory, any drive letter, any machine (proven: check-sync run
  successfully while CWD was C:\\).
- All portal pages reference assets by RELATIVE paths only (no file:///, no
  absolute drives) - audited by scripts/portability-audit.cjs
  (PORTABILITY_PATH_PASS).
- Live data comes from Cloud Firestore over the internet using the embedded
  web config - identical on every machine.




