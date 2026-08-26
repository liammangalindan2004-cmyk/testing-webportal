# Final System Overhaul -- Pre-User Acceptance (Waterfall Final Phase)

This plan covers the **complete system finalization** before User Acceptance Testing. Zero loopholes: every portal page fully connected to Firebase Realtime Database, rich data visualization (not decoration), AI-looking design patterns eliminated, enterprise-grade email validation, professional EULA, redundancy removed, documentation updated for Cloud Firestore migration. No skipping, no shortcuts.

---

## User Review Required

> [!IMPORTANT]
> **Cloud Firestore Migration (Phase 8)**: You confirmed "go gagawing firestore na yan." This plan includes the migration as the final phase, executed via **Cline MCP (Ox Alpha)**. The system must be 100% finalized on RTDB first (Phases 1-7), then migrated. Ox Alpha tests until everything passes.

> [!WARNING]
> **"Fable 5" Design Standard**: UI must look like a professional SaaS dashboard -- not generic AI output. This means: varied spacing, asymmetric layouts where appropriate, hand-crafted color transitions, readable typography hierarchy, and purposeful micro-animations. Every card, chart, and modal must feel deliberate, not template-stamped.

> [!IMPORTANT]
> **No Emojis Anywhere**: Zero emojis in the EULA, portal text, toast messages, or any user-facing copy. Professional institutional language only.

---

## Proposed Changes

### Phase 1: Email Validation Hardening

Registration must be airtight -- no fake emails, no duplicates, no bypass.

---

#### [MODIFY] [RegisterPage.jsx](file:///c:/Users/John%20Raphael/OneDrive/Documents/Unmei%20Unified%20Module/UNMEIregis/src/RegisterPage.jsx)

**Current issues found:**
- Placeholder says `you@email.com` -- this trains users to type `@email.com` addresses
- Email regex `^[^\s@]+@[^\s@]+\.[^\s@]+$` is too permissive (accepts `test@email.com`, `a@b.c`)
- Duplicate check only scans `users/` node -- does NOT check `students/` or `enrollments/`
- No domain blocklist (should reject `@email.com`, `@test.com`, `@example.com`, `@mailinator.com`)

**Changes:**
1. Change placeholder from `you@email.com` to `yourname@gmail.com`
2. Add blocked email domain list: `email.com`, `test.com`, `example.com`, `mailinator.com`, `tempmail.com`, `guerrillamail.com`, `throwaway.email`, `yopmail.com`
3. Strengthen regex to require minimum 2-char TLD: `/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/`
4. Expand duplicate check to scan BOTH `users/` AND `students/` AND `enrollments/` nodes for matching email
5. Add explicit rejection for `@email.com` domain with clear error message: "Please use a real email address. Generic domains like @email.com are not accepted."
6. On submission: re-validate email one final time before `createUserWithEmailAndPassword` (prevent race condition)

#### [MODIFY] [RegisterPage.jsx](file:///c:/Users/John%20Raphael/OneDrive/Documents/Unmei%20Unified%20Module/UNMEIregis/src/RegisterPage.jsx) -- Rebuild required
After changes, run `npm run build` in `UNMEIregis/` and copy `dist/` output to `UNMEIwebsite/register/` and `public/register/`.

---

### Phase 2: Portal Agreement (EULA) -- Enterprise-Grade Rewrite

The current EULA has 7 short sections. Panel will flag it as AI-generated because it reads like a summary, not a real institutional agreement. Rewrite to enterprise standard.

---

#### [MODIFY] [dashboard.html](file:///c:/Users/John%20Raphael/OneDrive/Documents/Unmei%20Unified%20Module/UNMEIstudentsportal/dashboard.html) (lines 981-1025)

Replace the entire Portal Usage Agreement content with a **complete institutional EULA** covering:

1. **Definitions and Scope** -- Define "Portal," "Mobile Application," "Student Account," "Authorized User," "Content," "Services"
2. **Account Registration and Security** -- Account tied to enrollment, single-user access, password responsibility, unauthorized access reporting
3. **Enrollment and Course Access** -- Course materials available upon verified payment, enrollment tied to specific JLPT level, schedule assignment
4. **Tuition, Fees, and Payment Terms** -- Payment methods (bank transfer, GCash, over-the-counter), installment plans, late payment consequences, refund policy (enrollment fee non-refundable, pro-rated tuition within 7 days)
5. **Portal and Mobile Application Integration** -- Data synchronization between web portal and UNMEI Learning app, offline capability limitations, data refresh intervals
6. **Academic Standards and Conduct** -- Attendance expectations, quiz/assessment integrity, plagiarism and misconduct handling, appeal process
7. **Intellectual Property** -- All course materials, lesson content, and assessment items are property of Unmei Nihongo Center, reproduction prohibited
8. **Personal Data Collection and Processing** -- Compliance with Republic Act No. 10173 (Data Privacy Act of 2012), data collected (name, contact, enrollment records, payment history, learning analytics), data retention period, data portability rights, right to erasure upon course completion
9. **Data Security** -- Firebase cloud infrastructure, encrypted connections, role-based access control, breach notification within 72 hours
10. **Limitation of Liability** -- Service availability target (99.5% uptime), scheduled maintenance windows, force majeure
11. **Account Suspension and Termination** -- Grounds for suspension (non-payment, misconduct, inactivity beyond 180 days), data export window (30 days post-termination), reactivation process
12. **Withdrawal and Refund Policy** -- Voluntary withdrawal procedure, refund schedule, certificate of completion eligibility
13. **Amendments** -- 30-day advance notice for material changes, continued use constitutes acceptance, opt-out procedure
14. **Governing Law and Dispute Resolution** -- Governed by laws of the Republic of the Philippines, venue: courts of the city where Unmei Nihongo Center is registered
15. **Contact Information** -- School office hours, support email, physical address

**Writing style**: Professional institutional language. No emojis. No "Yokoso!" or casual greetings. Reads like an actual school enrollment agreement, not a chatbot summary. Sentences vary in length and structure. Uses proper legal phrasing where needed but remains readable (not legalese for the sake of it).

---

### Phase 3: Data Visualization Upgrade (Live from RTDB)

All charts render from live Firebase data -- zero hardcoded chart values.

---

#### [MODIFY] [instructor-dashboard.html](file:///c:/Users/John%20Raphael/OneDrive/Documents/Unmei%20Unified%20Module/UNMEIinstructorportal/instructor-dashboard.html)
- Add D3 engine imports (`d3.v7.min.js` + `unmei-charts.js`) -- currently MISSING
- Add 3 new data viz panels:
  1. **Class Performance Trend** -- line chart: weekly average scores of instructor's assigned students (from `students/{uid}/performance/weeklyTrend`)
  2. **Student Score Distribution** -- horizontal bar chart: grade spread across assigned students
  3. **Rating Summary** -- radar chart: 8-category average from `instructorRatings` filtered by `instructorId`
- All charts filter by instructor's `coursesAssigned` array

#### [MODIFY] [instructor-student-view.html](file:///c:/Users/John%20Raphael/OneDrive/Documents/Unmei%20Unified%20Module/UNMEIinstructorportal/instructor-student-view.html)
- Add D3 engine imports (currently missing)
- Add **Student Skill Radar** (6-axis: Reading, Writing, Grammar, Kanji, Vocabulary, Listening)
- Add **Weekly Progress Line** from `students/{uid}/performance/weeklyTrend`
- Supports SOP 3 / OBJ 3: monitor and track learner progress

#### [MODIFY] [admin-dashboard.html](file:///c:/Users/John%20Raphael/OneDrive/Documents/Unmei%20Unified%20Module/UNMEIadminportal/admin-dashboard.html)
- Fix **Pending Payments** stat card -- wire to `payments` node, count `status === 'pending'`
- Fix enrollment trend chart -- pull from `enrollments` timestamps, not hardcoded
- Revenue chart -- aggregate `payments` where `status === 'approved'`
- Add **Student Performance Overview** panel: class-wide aggregate skill radar

---

### Phase 4: AI-Flagged Design Elimination (Fable 5 Standard)

Remove every pattern that screams "AI generated this template."

---

#### [MODIFY] [studentportal.css](file:///c:/Users/John%20Raphael/OneDrive/Documents/Unmei%20Unified%20Module/UNMEIstudentsportal/studentportal.css)
- Break uniform `border-radius: 12px` -- vary by card type (10px stat cards, 14px panels, 16px modals)
- Differentiate card shadows (stat cards: tight `0 1px 3px`, panels: diffused `0 4px 24px`, charts: medium `0 2px 12px`)
- Add asymmetric grid gaps where two panels sit side by side (left panel slightly more margin-right)
- Replace generic color variables with UNMEI brand warmth (deeper crimson tones, not flat red)
- Vary hover effects -- stat cards scale subtly, panels lift shadow, nav items shift color
- Typography: use 3+ distinct font weights (400, 500, 600, 700) not just regular/bold
- Button styles: primary buttons use gradient (not flat color), ghost buttons use border-only with color shift on hover
- Modal backdrop: use `backdrop-filter: blur(8px)` for depth, not just dark overlay
- Scrollbar styling: thin custom scrollbar for agreement boxes
- Remove any identical spacing patterns -- top/bottom padding should vary by section importance

#### [MODIFY] [adminportal.css](file:///c:/Users/John%20Raphael/OneDrive/Documents/Unmei%20Unified%20Module/UNMEIadminportal/adminportal.css)
- Same design humanization principles
- Admin theme distinction: slightly cooler palette (professional navy accents alongside UNMEI red)

#### [MODIFY] [instructorportal.css](file:///c:/Users/John%20Raphael/OneDrive/Documents/Unmei%20Unified%20Module/UNMEIinstructorportal/instructorportal.css)
- Same treatment
- Instructor theme: warm neutral tones (distinguishes from student cool and admin professional)

---

### Phase 5: System Logic and Database Connection Verification

Every page must read/write from RTDB with zero dead ends. No `--`, no `Loading...`, no stale fallbacks.

---

#### Admin Portal (6 pages)
| Page | Verification |
|------|-------------|
| [admin-dashboard.html](file:///c:/Users/John%20Raphael/OneDrive/Documents/Unmei%20Unified%20Module/UNMEIadminportal/admin-dashboard.html) | 4 stat cards populate from RTDB, 3 charts render, recent enrollments table loads |
| [admin-students.html](file:///c:/Users/John%20Raphael/OneDrive/Documents/Unmei%20Unified%20Module/UNMEIadminportal/admin-students.html) | All 30+ students list, search/filter works, revoke/restore writes back |
| [admin-payments.html](file:///c:/Users/John%20Raphael/OneDrive/Documents/Unmei%20Unified%20Module/UNMEIadminportal/admin-payments.html) | Approve/reject writes to `payments/{id}/status`, creates notification |
| [admin-enrollments.html](file:///c:/Users/John%20Raphael/OneDrive/Documents/Unmei%20Unified%20Module/UNMEIadminportal/admin-enrollments.html) | Enrollment list loads from `enrollments` node |
| [admin-courses.html](file:///c:/Users/John%20Raphael/OneDrive/Documents/Unmei%20Unified%20Module/UNMEIadminportal/admin-courses.html) | Course list from `courses` node, click through to detail |
| [admin-portal-settings.html](file:///c:/Users/John%20Raphael/OneDrive/Documents/Unmei%20Unified%20Module/UNMEIadminportal/admin-portal-settings.html) | Settings read/write to `portal_config` and `config` nodes |

#### Student Portal (8 pages)
| Page | Verification |
|------|-------------|
| [dashboard.html](file:///c:/Users/John%20Raphael/OneDrive/Documents/Unmei%20Unified%20Module/UNMEIstudentsportal/dashboard.html) | Welcome banner, 4 stat cards, data viz section, schedules, announcements -- all from RTDB |
| [profile.html](file:///c:/Users/John%20Raphael/OneDrive/Documents/Unmei%20Unified%20Module/UNMEIstudentsportal/profile.html) | Profile loads from `students/{uid}/profile`, avatar upload to Storage |
| [courses.html](file:///c:/Users/John%20Raphael/OneDrive/Documents/Unmei%20Unified%20Module/UNMEIstudentsportal/courses.html) | Course content from `courses`, rating submission to `instructorRatings` |
| [payments.html](file:///c:/Users/John%20Raphael/OneDrive/Documents/Unmei%20Unified%20Module/UNMEIstudentsportal/payments.html) | Payment history from `payments`, receipt upload to Storage |
| [schedules.html](file:///c:/Users/John%20Raphael/OneDrive/Documents/Unmei%20Unified%20Module/UNMEIstudentsportal/schedules.html) | Schedule from `sections` + `schedules` nodes |
| [announcements.html](file:///c:/Users/John%20Raphael/OneDrive/Documents/Unmei%20Unified%20Module/UNMEIstudentsportal/announcements.html) | Announcements from `announcements` node |
| [settings.html](file:///c:/Users/John%20Raphael/OneDrive/Documents/Unmei%20Unified%20Module/UNMEIstudentsportal/settings.html) | Password change, preferences write back |
| [app-download.html](file:///c:/Users/John%20Raphael/OneDrive/Documents/Unmei%20Unified%20Module/UNMEIstudentsportal/app-download.html) | Download link from `app_download`, payment gate checks `payments` status |

#### Instructor Portal (4 pages)
| Page | Verification |
|------|-------------|
| [instructor-dashboard.html](file:///c:/Users/John%20Raphael/OneDrive/Documents/Unmei%20Unified%20Module/UNMEIinstructorportal/instructor-dashboard.html) | Stat cards + new charts from RTDB |
| [instructor-students.html](file:///c:/Users/John%20Raphael/OneDrive/Documents/Unmei%20Unified%20Module/UNMEIinstructorportal/instructor-students.html) | Student roster filtered by `coursesAssigned` |
| [instructor-student-view.html](file:///c:/Users/John%20Raphael/OneDrive/Documents/Unmei%20Unified%20Module/UNMEIinstructorportal/instructor-student-view.html) | Individual student data + new charts |
| [instructor-ratings.html](file:///c:/Users/John%20Raphael/OneDrive/Documents/Unmei%20Unified%20Module/UNMEIinstructorportal/instructor-ratings.html) | Ratings from `instructorRatings` filtered by `instructorId` |

---

### Phase 6: Redundancy Removal and Cleanup

---

- Delete `scripts/sync-to-public.js` (temp workaround)
- Remove any stale/orphaned test scripts
- Verify no redundant data in `firebase-database-structure.json` (orphaned references, inconsistent averages)
- Clean any browser extension artifacts from HTML files
- Remove any `console.log` debug statements from production code

---

### Phase 7: Documentation Updates

---

#### [MODIFY] [STARTGUIDE.md](file:///c:/Users/John%20Raphael/OneDrive/Documents/Unmei%20Unified%20Module/STARTGUIDE.md)
- Update status: "System Finalized -- Ready for UAT and Cloud Firestore Migration"
- Add **Section 13: Cloud Firestore Migration (Next Phase)** covering:
  - Cline MCP connected via `firebase-tools@latest mcp`
  - Ox Alpha (Stealth provider) handles migration execution
  - `firebase-database-structure.json` is the import source
  - RTDB to Firestore collection mapping:
    - `students/{uid}` --> `students` collection
    - `instructors/{id}` --> `instructors` collection
    - `users/{uid}` --> `users` collection
    - `payments/{id}` --> `payments` collection
    - `enrollments/{uid}` --> `enrollments` collection
    - etc.
  - Post-migration: update all `firebase-config.js` to use Firestore SDK
  - Mobile app connects to same Firestore project
- Update EULA section to note new enterprise-grade agreement
- Update email validation section with new blocked domains
- Remove outdated troubleshooting that no longer applies

#### [MODIFY] [full-reimport-guide.md](file:///c:/Users/John%20Raphael/OneDrive/Documents/Unmei%20Unified%20Module/full-reimport-guide.md)
- Add **Cloud Firestore Migration** section:
  - Current RTDB structure maps to Firestore collections
  - MCP config already set up for Cline
  - Post-migration verification steps
  - Firestore security rules template
- Update status: system finalized on RTDB, migration is next
- Keep RTDB reimport instructions (valid until migration complete)

---

### Phase 8: Cloud Firestore Migration (Cline/Ox Alpha Execution)

> [!IMPORTANT]
> This phase runs AFTER Phases 1-7 are 100% complete and verified. Cline + Ox Alpha handles the migration via MCP.

**Pre-migration checklist (must all pass before starting):**
- All portal pages fully functional on RTDB
- `SMOKE_TEST_PASS` on all routes
- No `--` or `Loading...` placeholders anywhere
- Email validation hardened
- EULA enterprise-grade
- `firebase-database-structure.json` is the canonical source of truth

**Migration scope (for Cline/Ox Alpha):**
1. Read `firebase-database-structure.json`
2. Create Firestore collections with proper document structure
3. Preserve all sampling/demo data alongside real user data
4. Update all portal `firebase-config.js` files to use Firestore SDK
5. Update all RTDB `database.ref()` calls to Firestore `collection()` / `doc()` calls
6. Rebuild `UNMEIregis` to use Firestore
7. Test every portal page end-to-end
8. Verify mobile app (APK) can connect to same Firestore project

**Post-migration verification:**
- All 3 portals functional with Firestore
- Real-time data sync works
- Demo accounts still accessible
- Registration creates Firestore documents
- No RTDB references remain in production code

---

## SOP/OBJ Alignment Matrix

| SOP/OBJ | Requirement | Implementation | Portal |
|---------|------------|----------------|--------|
| SOP 1 / OBJ 1 | Gamified Japanese module with AI + visual reinforcement | Character Mastery gauges, Practice Activity heatmap, App Sync data viz | Student Dashboard |
| SOP 2 / OBJ 2 | Assessment module (reviews, quizzes, practice) for retention | Quiz scores, performance tracking, weekly trend charts, skill radar | Student Courses + Dashboard |
| SOP 3 / OBJ 3 | Online portal to manage student records, monitor/track progress | Admin CRUD, Instructor student view with charts, Student profile | All 3 Portals |

---

## Verification Plan

### Automated Tests
```powershell
node scripts/validate-seed-dataset.cjs
# Expected: SEED_DATASET_VALID

powershell -ExecutionPolicy Bypass -File .\scripts\start-all.ps1 -ForceNoFirebase -IncludeWebsiteSync
# Expected: PREREQ_PASS, SYNC_CHECK_PASS, START_ALL_PASS

powershell -ExecutionPolicy Bypass -File .\scripts\smoke-test.ps1 -IncludeWebsiteRoutes
# Expected: SMOKE_TEST_PASS
```

### Manual Verification
- Login to each portal and verify all data loads from RTDB (no placeholders)
- Verify all D3 charts render with real data
- Test email registration: try `test@email.com` -- must be rejected
- Test email registration: try duplicate email -- must be rejected
- Verify EULA reads as professional institutional agreement (no AI flags, no emojis)
- Inspect CSS for uniform AI patterns -- ensure visual variation
- Test login/CRUD/logout for each role
- Verify mobile responsiveness (less than 768px viewport)
- Open Firebase Console side-by-side to confirm live data sync

### Ox Alpha Final Testing (Phase 8)
- Ox Alpha runs automated end-to-end testing via Cline MCP
- Tests until every flow passes without issues
- No baraby, no skipping -- complete coverage required
