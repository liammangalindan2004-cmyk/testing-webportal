# UNMEI NIHONGO CENTER — Web Portal System: Master Implementation Directive

> **Document Purpose**: This is the authoritative implementation prompt for any AI agent or developer working on this system. It contains the full system audit, every identified bug/inconsistency, every new feature requirement, and phased implementation instructions. Follow this document top-to-bottom. Do NOT deviate from the specifications without explicit user approval.

> **Critical Context**: The capstone panel is about to review this system. The adviser's verdict was: **"PURO UI HINDI SYSTEM — DID NOT MEET THE STATEMENT OF THE PROBLEM AND ITS OBJECTIVES."** Every change below is designed to convert this from a UI shell into a real, data-driven system.

---

## SYSTEM OVERVIEW

| Component | Path | Stack |
|-----------|------|-------|
| Main Website (Replica) | `UNMEIwebsite/` | Vanilla HTML/CSS/JS (replica of unmei-ph.com) |
| Registration Portal | `UNMEIregis/` | React + Vite + Tailwind + Firebase (Iconify icons, single-file build) |
| Student Portal | `UNMEIstudentsportal/` | Vanilla HTML/CSS/JS + Firebase RTDB + Firebase Auth |
| Admin Portal | `UNMEIadminportal/` | Vanilla HTML/CSS/JS + Firebase RTDB |
| Instructor Portal | `UNMEIinstructorportal/` | Vanilla HTML/CSS/JS + Firebase RTDB + Firebase Auth |
| Public Mirror | `public/` | Auto-synced from source folders |
| Scripts | `scripts/` | PowerShell + Node automation |
| Firebase Config | `firebase.json` | Firebase Hosting (public mirror) |
| Canonical DB Payload | `firebase-database-structure.json` (repo root) | Seed dataset — NEVER published to `public/` |
| Dataset Generator | `scripts/build-seed-dataset.cjs` | The only generator (30 students / 10 instructors) |
| Dataset Validator | `scripts/validate-seed-dataset.cjs` | Runs inside `safe-reimport.ps1` before any import |
| FDD Diagram | `unmei_webportal_fdd.xml` | draw.io (3 columns: Student / Instructor / Admin) |

### Firebase RTDB Root Nodes (Current)
```
admins, announcements, answer_keys, app_download, assessments, class_setups,
classes, config, courses, data_constraints, enrollment_rules, enrollments,
firestore_collections, logs, messages, notifications, payments, portal_config,
professorRatings, professors, schedules, sections, settings, students, users,
validation_rules
```

### Revised Statement of the Problem and Objectives (From Adviser)

```
SOP 1: What system function can be developed to improve students' understanding
       of Japanese lessons in a gamified environment?
OBJ 1: To develop a gamified Japanese language module in kanji stroke and
       Japanese reading with AI integration through visual reinforcement and
       guided practice.

SOP 2: What system function can be developed to improve knowledge retention
       based on learner's memory and performance?
OBJ 2: To develop an assessment module, such as reviews, quizzes, practice...

SOP 3: What system function can be developed to manage student records and
       monitor and track learner progress?
OBJ 3: To develop an online portal for learners.
```

> **IMPORTANT**: The portal must demonstrate real system functionality per OBJ 3. Every "View" action must show real data. Every chart must be data-driven. Every student record must be trackable with performance analytics.

---

## PHASE 0: CRITICAL BUGS AND INCONSISTENCIES AUDIT

### BUG-01: Doughnut/Pie Charts Exist (BANNED)
- **Location**: `UNMEIstudentsportal/dashboard.html` line 854 (`type: 'doughnut'`)
- **Location**: `UNMEIadminportal/admin-dashboard.html` line 911 (`type: 'doughnut'`)
- **Rule**: No pie charts, no doughnut charts anywhere. Replace all with bar charts, line charts, or radar charts using D3.js.

### BUG-02: Chart.js Used Without Real Data
- **Location**: `UNMEIstudentsportal/dashboard.html` lines 13-14 (CDN), lines 853, 942, 969, 1001 (`new Chart`)
- **Location**: `UNMEIadminportal/admin-dashboard.html` line 9 (CDN), lines 721, 769, 910 (`new Chart`)
- **Rule**: Replace ALL Chart.js with D3.js (`https://d3js.org/d3.v7.min.js`). All charts must read from Firebase RTDB, never from hardcoded arrays.

### BUG-03: Logout Available Outside Settings
- **Location**: `logout()` function exists in every student portal page: `courses.html:1037`, `payments.html:1042`, `schedules.html:874`, `profile.html:785`, `announcements.html:654`, `app-download.html:446`, `dashboard.html` (via header sync)
- **Rule**: Logout/Sign-Out button must ONLY exist in `settings.html` and in the sidebar (bottom). Remove logout from all topbar/header areas across all pages.

### BUG-04: Payment Upload Modal 'X' Button Inside Content Box
- **Location**: `UNMEIstudentsportal/payments.html`
- **Problem**: When a payment receipt is successfully uploaded, the close ('X') button is positioned inside the content box, obscuring the receipt content.
- **Fix**: Move the 'X' button to the top-right corner of the modal overlay, outside the content area, with `position: absolute; top: 16px; right: 16px; z-index: 10;` on the modal wrapper.

### BUG-05: Admin Student View Modal — UI Only, No Data Visualization
- **Location**: `UNMEIadminportal/admin-students.html` lines 760-783 (`viewStudent()`)
- **Problem**: The view modal shows only static text fields (Student ID, Course, Schedule, Status, Payment). No performance data, no progress tracking, no data visualization. This is the core panel complaint.
- **Fix**: See PHASE 3 below.

### BUG-06: Hardcoded Demo Data in Courses Page
- **Location**: `UNMEIstudentsportal/courses.html` line 549 (`Demo/hardcoded account UIDs`)
- **Problem**: Read-only demo UIDs are hardcoded. Real students hitting these paths get no data.
- **Fix**: Remove hardcoded UID guards. All data must flow from Firebase for the logged-in student's UID.

### BUG-07: Admin Login Hardcoded Credentials
- **Location**: `UNMEIadminportal/admin-login.html` — multiple references to `hardcoded` auth mode
- **Problem**: Admin login uses `admin@unmei-ph.com` / `Admin@2026` hardcoded. While acceptable for demo, the panel may flag this.
- **Fix**: Keep the hardcoded fallback for demo mode but add a Firebase Auth path for production. Suppress the `hardcoded` label from any user-visible UI.

### BUG-08: Terminal Output Exposes Internal Labels
- **Location**: `scripts/start-all.ps1`
- **Problem**: Terminal shows `PREREQ_PASS`, `SYNC_CHECK_PASS`, `START_ALL_PASS`, `STATIC_URL=...`, `FIREBASE_URL=SKIPPED_FALLBACK` — panel will see this during defense.
- **Fix**: Add a `-QuietMode` flag to `start-all.ps1` that suppresses all internal labels and shows clean output:
  ```
  Unmei Nihongo Center — Portal System
  Starting services...
  Portal is ready at http://localhost:5000/
  ```

### BUG-09: Section Model Is Obsolete
- **Location**: Admin sidebar in all admin pages: "SECTIONS" nav group with "Class Sections" and "Build New Section"
- **Location**: `UNMEIadminportal/admin-sections.html`, `admin-build-section.html`, `admin-section-view.html`
- **Location**: Firebase nodes: `sections/`
- **Problem**: Sections like "JLPT N5-A" are no longer used. Each course IS the section. One course = one section, one instructor.
- **Fix**: See PHASE 4 below.

### BUG-10: No Instructor Data in Firebase Structure JSON
- **Location**: `UNMEIregis/firebase-database-structure.json`
- **Problem**: The registration-side Firebase structure has no `professors` or `instructors` node. The live export has `professors` with 6 entries but no credentials fields (education, certifications, yearsExperience).
- **Fix**: See PHASE 2 below.

### BUG-11: professorRatings Node Is Template-Only
- **Location**: Live export `professorRatings` contains only `rating_template_001` with all empty fields.
- **Problem**: No actual ratings exist. The rating system is non-functional.
- **Fix**: See PHASE 2 below.

### BUG-12: Student Registration Does Not Redirect to Dashboard
- **Problem**: After a student registers, they do NOT get redirected to their student dashboard with an onboarding experience.
- **Fix**: See PHASE 5 below.

### BUG-13: No Email Verification on Registration
- **Location**: `UNMEIregis/src/RegisterPage.jsx`
- **Problem**: No check for duplicate email or name. No email format validation with real-time feedback.
- **Fix**: See PHASE 5 below.

### BUG-14: Country and Contact Number Fields Not Validated
- **Location**: `UNMEIregis/src/RegisterPage.jsx`
- **Problem**: Country picker and contact number fields lack proper validation. No country code auto-detection, no phone format enforcement.
- **Fix**: See PHASE 5 below.

### BUG-15: Complete Address Not Verified
- **Location**: `UNMEIregis/src/RegisterPage.jsx`
- **Problem**: Address field has no completeness check (must include street, city, province/state, zip code).
- **Fix**: See PHASE 5 below.

### BUG-16: App Download Page Missing Stylus Pen Requirement
- **Location**: `UNMEIstudentsportal/app-download.html`
- **Problem**: The kanji stroke practice in the mobile app requires a stylus pen, but this is not mentioned.
- **Fix**: Add a prominent "Requirements" section before the download button: "A stylus pen is required for Japanese stroke practice exercises."

### BUG-17: FDD Missing Instructor Portal Column
- **Location**: `unmei_webportal_fdd.xml`
- **Problem**: FDD only has Student Portal and Admin Portal columns. Missing: Instructor Portal.
- **Fix**: Add a third column for Instructor Portal with nodes matching the features in PHASE 2.

---

## PHASE 1: FIREBASE JSON CLEANUP + D3.js MIGRATION

### 1A. Firebase JSON Cleanup

**Target**: `UNMEIregis/firebase-database-structure.json`

Update this file to be a clean, production-ready schema. Remove all `SAMPLE_` prefixes and template-only records. The structure must include every node the system actually uses:

```json
{
  "admins": { "_schema": { "displayName": "", "email": "", "role": "", "permissions": {}, "createdAt": 0 } },
  "announcements": { "_schema": { "title": "", "message": "", "category": "", "priority": "", "active": true, "pinned": false, "postedBy": "", "postedByUid": "", "targetAudience": "", "createdAt": 0, "updatedAt": 0 } },
  "courses": {
    "jlpt_n5": { "name": "JLPT N5 (Beginner)", "description": "...", "duration": "3 months", "price": 8000, "requiresAssessment": false, "active": true, "instructorId": "prof_001" },
    "jlpt_n4": { "name": "JLPT N4 (Intermediate)", "description": "...", "duration": "3 months", "price": 10000, "requiresAssessment": true, "active": true, "instructorId": "prof_002" },
    "jlpt_n3": { "name": "JLPT N3 (Advanced)", "description": "...", "duration": "4 months", "price": 12000, "requiresAssessment": true, "active": true, "instructorId": "prof_003" },
    "jlpt_n2": { "name": "JLPT N2 (Expert)", "description": "...", "duration": "5 months", "price": 15000, "requiresAssessment": true, "active": true, "instructorId": "prof_004" },
    "bundle_n5_n4": { "name": "Bundle N5 and N4", "description": "...", "duration": "6 months", "price": 16000, "requiresAssessment": false, "active": true, "instructorId": "prof_001" },
    "bundle_n5_n3": { "name": "Bundle N5-N3", "description": "...", "duration": "10 months", "price": 25000, "requiresAssessment": false, "active": true, "instructorId": "prof_001" }
  },
  "instructors": {
    "prof_001": {
      "fullName": "Aiko Tanaka", "email": "aiko.tanaka@unmei.edu", "active": true,
      "specialization": "JLPT N5-N4 Foundation",
      "bio": "Certified Japanese language educator with 8 years of experience in foundation-level JLPT preparation.",
      "credentials": {
        "education": "B.A. in Japanese Language Education, University of the Philippines",
        "certifications": ["JLPT N1 Certified", "TESOL Certificate", "Japanese Language Teaching License (Japan Foundation)"],
        "yearsExperience": 8,
        "languagesSpoken": ["Japanese", "English", "Filipino"]
      },
      "coursesAssigned": ["jlpt_n5", "bundle_n5_n4", "bundle_n5_n3"],
      "averageRating": 4.7, "totalRatings": 0,
      "createdAt": 0, "updatedAt": 0
    }
  },
  "instructorRatings": {
    "_schema": {
      "instructorId": "", "studentUid": "", "courseId": "",
      "ratings": {
        "teachingEffectiveness": 0,
        "communicationSkills": 0,
        "subjectMastery": 0,
        "classroomManagement": 0,
        "professionalism": 0,
        "supportiveness": 0,
        "punctuality": 0,
        "overallSatisfaction": 0
      },
      "comment": "", "isAnonymous": false, "createdAt": 0
    }
  },
  "students": {
    "_schema": {
      "profile": { "fullName": "", "email": "", "mobileNumber": "", "address": "", "country": "", "avatarUrl": "", "avatarInitials": "", "avatarColor": "", "createdAt": 0, "updatedAt": 0 },
      "enrollment": { "courseId": "", "course": "", "scheduleDays": "", "scheduleTimeSlot": "", "status": "", "enrolledAt": 0, "instructorId": "" },
      "performance": {
        "courseProgress": 0,
        "modulesCompleted": 0,
        "totalModules": 0,
        "quizScores": [],
        "averageScore": 0,
        "attendanceRate": 0,
        "lastActivityAt": 0,
        "weeklyProgress": [],
        "skillBreakdown": { "reading": 0, "writing": 0, "listening": 0, "speaking": 0, "grammar": 0, "vocabulary": 0 },
        "areasOfImprovement": [],
        "streakDays": 0,
        "totalPracticeMinutes": 0
      },
      "isRevoked": false, "isDeleted": false, "onboardingComplete": false
    }
  },
  "enrollments": { "_schema": { "fullName": "", "email": "", "course": "", "courseId": "", "scheduleDays": "", "scheduleTimeSlot": "", "status": "", "createdAt": 0, "updatedAt": 0 } },
  "payments": { "_schema": { "studentUid": "", "studentEmail": "", "studentName": "", "amount": 0, "status": "", "adminApprovalStatus": "", "receiptUrl": "", "createdAt": 0 } },
  "assessments": {},
  "answer_keys": {},
  "enrollment_rules": {},
  "class_setups": {},
  "settings": { "enrollment_open": true, "max_students_per_class": 15 },
  "config": {},
  "app_download": {}
}
```

> **IMPORTANT**: When updating the live Firebase RTDB, use `safe-reimport.ps1` or the manual firebase CLI. Do NOT overwrite existing live data — merge schema additions only. The `_schema` keys above are structural documentation; they should not be imported as actual records.

### 1B. Chart.js to D3.js Migration

**Files to modify**:
1. `UNMEIstudentsportal/dashboard.html` — Remove Chart.js CDN (line 14), replace all `new Chart(...)` calls (lines 853, 942, 969, 1001) with D3.js SVG renderers
2. `UNMEIadminportal/admin-dashboard.html` — Remove Chart.js CDN (line 9), replace all `new Chart(...)` calls (lines 721, 769, 910) with D3.js SVG renderers

**Chart replacements**:
| Old Chart | Old Type | New Type (D3.js) | Data Source |
|-----------|----------|-------------------|-------------|
| Character mastery gauges | `doughnut` | Radial progress arc (SVG) | `students/{uid}/performance/skillBreakdown` |
| Skill breakdown | `radar` | Radar/spider chart (SVG) | `students/{uid}/performance/skillBreakdown` |
| Score trend | `line` | Line chart (SVG) | `students/{uid}/performance/weeklyProgress` |
| Module progress | `bar` | Horizontal bar (SVG) | `students/{uid}/performance/modulesCompleted` |
| Enrollment trend (admin) | `line` | Area chart (SVG) | Computed from `enrollments/` timestamps |
| Revenue trend (admin) | `bar` | Grouped bar chart (SVG) | Computed from `payments/` with approved amounts |
| Course breakdown (admin) | `doughnut` | Horizontal stacked bar (SVG) | Computed from `students/` grouped by courseId |

**D3.js CDN**: `<script src="https://d3js.org/d3.v7.min.js"></script>`

**Design rules for all charts**:
- No pie charts, no doughnut charts
- Color palette: `#C0392B` (primary red), `#2563EB` (blue), `#16A34A` (green), `#F59E0B` (amber), `#8B5CF6` (purple), `#EC4899` (pink)
- All charts must have proper axes labels, tooltips on hover, smooth transitions
- All data must come from Firebase RTDB queries, never from hardcoded arrays
- Mobile responsive: charts must resize with container
- No emoji in labels or tooltips
- Professional, clean look

---

## PHASE 2: INSTRUCTOR PORTAL (UNMEIinstructorportal) + RATINGS REVAMP

### 2A. Instructor Portal — New Module

**Create directory**: `UNMEIinstructorportal/`

**Pages to create**:

| Page | File | Purpose |
|------|------|---------|
| Login | `instructor-login.html` | Firebase Auth login for instructors |
| Dashboard | `instructor-dashboard.html` | Overview of assigned courses, student count, recent activity |
| My Students | `instructor-students.html` | List of students enrolled in instructor's courses |
| Student Performance | `instructor-student-view.html` | Detailed view of individual student performance (D3.js charts) |
| Ratings and Feedback | `instructor-ratings.html` | View ratings received from students, aggregated analytics |
| Settings | `instructor-settings.html` | Profile, account settings, sign-out |

**Shared files**:
- `instructorportal.css` — Styled consistently with admin/student portals. Sidebar color accent: use `#1E3A5F` (dark navy) to distinguish from admin (dark) and student (red) portals.
- `firebase-config.js` — Same as other portals
- `session-guard.js` — Modified for instructor role check
- `instructor-header-sync.js` — Header sync for instructor data

**Sidebar nav structure**:
```
OVERVIEW
  - Dashboard
  - My Students
ACADEMIC
  - Ratings and Feedback
PORTAL SETTINGS
  - Settings (contains Sign Out)
```

**Firebase Auth for instructors**: Create Firebase Auth accounts for each instructor. The instructor record in `instructors/{profId}` must have an `authUid` field linking to the Firebase Auth UID.

**Instructor credentials**: The Firebase must contain at least **10 accessible instructors** with full credentials. Expand the current 6 `professors` to 10+ under the `instructors` node. Each must have:
- `fullName`, `email`, `active`, `specialization`, `bio`
- `credentials.education` (degree + university)
- `credentials.certifications` (array, at least 2-3 per instructor)
- `credentials.yearsExperience`
- `credentials.languagesSpoken`
- `coursesAssigned` (array of course IDs)
- `averageRating`, `totalRatings`

**At least 3 instructors must have full credential display** (showing education, all certifications, years, languages). The rest must be retrievable from Firebase but can have minimal data.

**Instructors must be assigned per course**. Since there are more instructors than courses, some courses may have multiple instructors (e.g., JLPT N5 may have 3 instructors for different schedules). The `courses/{courseId}/instructorIds` field should be an array.

### 2B. Instructor Ratings Revamp — Full Evaluation Modal

**Location**: `UNMEIstudentsportal/courses.html` (rating panel)

**Current state**: Simple star rating with a comment field. Adviser says this is insufficient.

**New design**: A **full-screen modal** evaluation form, similar to university faculty evaluation forms. The modal must be large (min 600px wide on desktop, full-screen on mobile).

**Rating categories** (each 1-5 scale, rendered as radio buttons or a slider):
1. **Teaching Effectiveness** — "The instructor explains lessons clearly and effectively."
2. **Communication Skills** — "The instructor communicates in a way that is easy to understand."
3. **Subject Mastery** — "The instructor demonstrates deep knowledge of the subject matter."
4. **Classroom Management** — "The instructor maintains an organized and productive learning environment."
5. **Professionalism** — "The instructor is professional in conduct and appearance."
6. **Supportiveness** — "The instructor is approachable and willing to help students."
7. **Punctuality** — "The instructor starts and ends classes on time."
8. **Overall Satisfaction** — "Overall, I am satisfied with this instructor."

**Additional fields**:
- Text comment (optional, 500 char max)
- Anonymous toggle (default: off)

**Firebase write path**: `instructorRatings/{autoId}` with structure:
```json
{
  "instructorId": "prof_001",
  "studentUid": "student_001",
  "courseId": "jlpt_n5",
  "ratings": {
    "teachingEffectiveness": 5,
    "communicationSkills": 4,
    "subjectMastery": 5,
    "classroomManagement": 4,
    "professionalism": 5,
    "supportiveness": 5,
    "punctuality": 4,
    "overallSatisfaction": 5
  },
  "comment": "Great instructor!",
  "isAnonymous": false,
  "createdAt": 1723987200000
}
```

**After submission**: Recalculate `instructors/{profId}/averageRating` and `totalRatings` by reading all `instructorRatings` where `instructorId` matches.

**Student can only rate once per instructor per course**. Check before showing the "Rate" button.

**Finished look**: The modal must look polished, professional, no rough edges. Use proper typography, consistent spacing, subtle shadows. No emoji.

---

## PHASE 3: STUDENT VIEW REVAMP (Admin + Instructor)

### 3A. Admin — Student View Modal Upgrade

**Location**: `UNMEIadminportal/admin-students.html`, `viewStudent()` function (line 761)

**Current state**: Shows only: Student ID, Course, Schedule, Status, Payment. Pure UI, no real data.

**New design**: Replace the simple view modal with a comprehensive student profile panel that includes:

**Section 1: Profile Header**
- Avatar, full name, email, student ID
- Status badge, payment badge
- Course name, schedule, instructor name

**Section 2: Course Progress** (D3.js)
- Horizontal progress bar showing `performance.courseProgress` (0-100%)
- Modules completed vs total: `performance.modulesCompleted / performance.totalModules`
- Last activity timestamp

**Section 3: Performance Analytics** (D3.js)
- Radar chart of skill breakdown (reading, writing, listening, speaking, grammar, vocabulary) — data from `students/{uid}/performance/skillBreakdown`
- Line chart of weekly quiz score trend — data from `students/{uid}/performance/weeklyProgress`
- Average score, attendance rate

**Section 4: Areas of Improvement**
- List generated from `performance.areasOfImprovement` array
- Each item displayed as a tag/chip

**Section 5: Actions**
- Edit button (opens existing edit modal)
- Remove button (existing)

### 3B. Admin — Student Edit Revamp

**Location**: `UNMEIadminportal/admin-students.html`, `editStudent()` function (line 786)

**Current state**: Basic form with name, email, course, schedule, payment dropdown, status dropdown.

**Fix**: Update the edit form to also allow updating:
- Course assignment (dropdown from `courses/` Firebase node)
- Instructor assignment (dropdown from `instructors/` filtered by course)
- Schedule (from available slots)
- Status

### 3C. Admin — Add Student and New Enrollment Revamp

**Location**: `UNMEIadminportal/admin-add-student.html`, `admin-new-enrollment.html`

**Fix**: These forms must also:
- Auto-generate student ID in format `UNC-{YEAR}-{SEQUENCE}`
- Validate email uniqueness against existing `students/` and `users/` nodes
- Set initial `performance` object with zeroed values
- Set `onboardingComplete: false`

### 3D. Instructor — Student Performance View

**Location**: `UNMEIinstructorportal/instructor-student-view.html` (NEW)

The instructor must be able to:
- View any student enrolled in their courses
- See the same performance analytics as admin (radar chart, progress, scores)
- See potential areas of improvement
- NOT be able to edit student profile or remove students (read-only)

---

## PHASE 3 — RECTIFICATION LOG (2026-08-24, verified on disk)

Phase 3 was found partially complete on audit. The gaps below were identified by reading the actual code (not assumed) and rectified in this pass. All five edited files passed inline-JS syntax validation, `sync-to-public.ps1`, `check-sync.ps1`, and `smoke-test.ps1` (SMOKE_TEST_PASS).

### 3A. Admin Student View Modal (`UNMEIadminportal/admin-students.html`)
- FIXED: fabricated fallback analytics removed. The loader previously injected fake skill scores (75/68/80/65/72/78), a fake weekly trend `[65..91]`, fake courseProgress 68 / averageScore 84 / attendance 92, and fake areas of improvement for any student without a `performance` node. All charts/KPIs now render real Firebase values only, with explicit "No ... recorded yet" empty states.
- ADDED: instructor name chip in the view-modal profile header (resolved via `enrollment/instructorId`, then `courses/{courseId}/instructorIds` -> `instructors/{id}/fullName`).
- ADDED: "Last activity" timestamp line under the KPI grid (reads `performance/lastActivityAt`; shows "No activity recorded yet" when absent).
- FIXED: displayed Student ID now prefers the stored `enrollment/studentId`; the fallback derivation is stable per-uid (no longer shifts with table row order).

### 3B. Admin Student Edit Modal (`UNMEIadminportal/admin-students.html`)
- FIXED (data-corruption bug): `saveEdit()` previously wrote display strings such as "MWF" into `enrollment/scheduleDays` (canonical value is "Monday - Wednesday - Friday"), silently corrupting schedules. The edit modal now works with canonical dataset values end-to-end.
- REPLACED: hardcoded course `<option>` list with a dropdown populated from the Firebase `courses/` node.
- ADDED: Instructor dropdown, populated from `courses/{courseId}/instructorIds` (plus legacy `instructorId`) joined with `instructors/` full names; re-filters when the course changes; "-- Unassigned --" allowed.
- ADDED: schedule select built from the canonical slot pairs used by the seed dataset (MWF/TTh/Mon-Fri/Sat Only x 8am-12nn / 1pm-5pm / 8am-5pm Sat Only).
- `saveEdit()` now persists `enrollment/courseId`, `enrollment/instructorId`, and canonical `scheduleDays`/`scheduleTimeSlot` alongside name/email/status.

### 3C. Add Student / New Enrollment record invariants
- `UNMEIadminportal/admin-add-student.html`: new student writes now include the zeroed `performance` object (schema-conformant: courseProgress, modulesCompleted, totalModules, quizScores, averageScore, attendanceRate, lastActivityAt, weeklyProgress, 6-key skillBreakdown, areasOfImprovement, streakDays, totalPracticeMinutes), `onboardingComplete: false`, `isDeleted: false`, and a stored `enrollment/studentId` in `UNC-{YEAR}-{SEQ}` format (sequence = student count + 100, matching the display convention). Email uniqueness (Firebase Auth + `users/` + `students/`) was already present and verified.
- `UNMEIadminportal/admin-new-enrollment.html`: backfills the zeroed `performance` object and `onboardingComplete: false` only when absent (never overwrites existing progress), and assigns a `UNC-{YEAR}-{SEQ}` `enrollment/studentId` when missing.
- `UNMEIadminportal/admin-dashboard.html`: quick-add writer upgraded with the same invariants (stored studentId, zeroed performance, onboardingComplete false, isDeleted false); duplicate-email check verified in place.
- DUPLICATION REMOVED: the legacy quick-add modal in `admin-students.html` (which created records missing studentId/performance/onboardingComplete and had no uniqueness check) was deleted; the "+ Add Student" button now routes to the canonical `admin-add-student.html` wizard.
- DEAD CODE REMOVED from `admin-dashboard.html`: the unreferenced 4-step wizard block (`addStudentWizard`, `wizardNav`, `loadSectionsForWizard`, `isStrongPassword`, `checkPasswordStrength`) referenced DOM elements that do not exist in the page and would have crashed if invoked.

### 3D. Instructor Student Performance View (`UNMEIinstructorportal/instructor-student-view.html`)
- ADDED: ownership check. The page now loads `instructors/{instructorId}` and the `courses/` node, builds the instructor's assigned-course set (`coursesAssigned` plus courses listing the instructor in `instructorIds`/`instructorId`), and renders an access-restricted panel with a link back to My Students when the requested student's course is not assigned to the signed-in instructor. Read-only behavior and D3 analytics (radar, weekly trend, progress) were already present and verified.

### Verification evidence (2026-08-24)
- Inline `<script>` blocks of all 5 touched files pass `vm.Script` syntax validation.
- `sync-to-public.ps1` + `check-sync.ps1`: "Source and public mirror are aligned for tracked modules."
- `smoke-test.ps1` against the live static server: `SMOKE_TEST_PASS` (all routes 200, including instructor portal).
- Zero leftover references: `addStudentModal`/`ns_*` in admin-students.html = 0; `wizStep`/`addStudentWizard`/`checkPasswordStrength` in admin-dashboard.html = 0.

---

## PHASE 4: SECTION-TO-COURSE MIGRATION

### Current State
- Admin sidebar has "SECTIONS" group with "Class Sections" and "Build New Section"
- Firebase has `sections/` node
- Old model: multiple sections per course (e.g., JLPT N5-A, JLPT N5-B)

### New Model
- One course = one section
- No sub-sections (no JLPT N5-A, JLPT N5-B)
- Each course has one or more assigned instructors
- "Class Sections" becomes "Courses"
- "Build New Section" becomes "Build New Course"

### Changes Required

**Admin sidebar** (all admin pages):
```
SECTIONS -> COURSES
  Class Sections -> Course List
  Build New Section -> Build New Course
```

**File renames**:
- `admin-sections.html` -> `admin-courses.html` (or update in-place)
- `admin-build-section.html` -> `admin-build-course.html` (or update in-place)
- `admin-section-view.html` -> `admin-course-view.html` (or update in-place)

**Content changes**:
- "Build New Course" page: fields for course name, description, price, duration, assigned instructor(s), schedule slots, active status
- "Course List" page: shows each course with its assigned instructor, student count, schedule
- "Course View" page: shows course details with enrolled students list and instructor info

**Firebase**: Read from `courses/` node. The `sections/` node can remain for backward compat but should not be the primary data source.

---

## PHASE 4 — RECTIFICATION LOG (2026-08-24, verified on disk)

Phase 4's structural migration (file renames, sidebar relabel, course pages) was already in place; this pass removed every remaining runtime dependency on the obsolete `sections/` node so `courses/` is the sole primary data source in the admin portal. All eight edited files passed inline-JS `vm.Script` syntax validation, `sync-to-public.ps1`, `check-sync.ps1` ("Source and public mirror are aligned"), and `smoke-test.ps1` (`SMOKE_TEST_PASS`).

### admin-dashboard.html
- REMOVED: dead legacy "Class Sections" modal (`#sectionsModal`) and "Build New Section" modal (`#addSectionModal`) — both were unreachable (no opener existed) and referenced DOM-only hardcoded course options.
- REMOVED: the `addSection()` writer (pushed new records to `sections/`) and the dashboard sections-table loader (`database.ref('sections')`). Zero `sections/` reads/writes remain on this page.

### admin-add-student.html
- REPLACED: the "-- Select class section --" dropdown (populated from `sections/`) with a canonical **Class Schedule** select (`#ns_schedule`, value-encoded as `days|slot`) built from the dataset's canonical slot pairs (MWF/TTh/Mon-Fri × 8am-12nn/1pm-5pm plus Saturday Only · 8am - 5pm), which enforces the Saturday pairing rule by construction.
- CHANGED: wizard no longer loads or writes `sections/`; new students get `enrollment.scheduleDays` / `enrollment.scheduleTimeSlot`, `classSetup: 'assigned'` when a schedule is chosen, and `sectionId: ''`.
- Step-3 validation now requires the class schedule (`err_schedule`); review summary label changed from "Section:" to "Schedule:"; log metadata records `scheduleDays`/`scheduleTimeSlot`/`scheduleLabel`.

### admin-new-enrollment.html
- Same conversion as add-student: `#ne_section` replaced by canonical Class Schedule select (`#ne_schedule`); `sections/` read and roster writes (`studentUids`, `enrolledCount`) removed; enrollment + student records carry schedule fields with `sectionId: ''`; classIds no longer pushed with section ids; review label "Schedule:".

### admin-post-notice.html
- Audience radio "Specific Class Section Only" → "Specific Course Only" (value `course`); picker now loads live options from the `courses/` node (`loadCourseOptions()`), replacing the hardcoded section list.
- Targeting rewritten: notifications resolve recipients from `students/{uid}/enrollment/courseId === targetCourse` (isDeleted-safe) instead of `sections/{id}/studentUids`. Announcement records write `targetCourse` (with `targetSectionId: null` kept for schema stability). Preview map updated.

### admin-portal-settings.html
- "ACTIVE SECTIONS" stat card → "ACTIVE COURSES"; both counters now count the `courses/` node (previously one counter read `sections/` against a non-existent `.stat-sections` selector — fixed to `#statSections`).

### Student portal backward compatibility (UNMEIstudentsportal)
- `dashboard.html` `loadDashboardSchedules(enrollment)`: renders the student's real schedule from `enrollment.scheduleDays`/`scheduleTimeSlot` when no section record exists; falls back to `sections/{sectionId}` (legacy seeded accounts) before the orientation placeholder.
- `schedules.html` `loadSchedules(database, enrollment, hasPayment)`: synthesizes the schedule view from enrollment-level schedule fields when `sectionId` is empty; legacy section-based rendering unchanged when a section exists.
- `announcements.html` `shouldShowForStudent()`: added `audience === 'course'` branch matching `announcement.targetCourse` vs `currentEnrollment.courseId`; legacy `'section'` branch retained for older records.

### Verification evidence (2026-08-24)
- Inline `<script>` blocks of all 8 touched files pass `vm.Script` syntax validation.
- Leftover scan of active admin pages: zero `ref('sections')` occurrences; remaining `sectionId` mentions are empty-string/preserved backward-compat fields only.
- `sync-to-public.ps1` + `check-sync.ps1`: "SYNC_CHECK_PASS".
- `smoke-test.ps1` against the static server: `SMOKE_TEST_PASS` (all routes 200).
- Note: `scripts/p4-audit.cjs` is a leftover Phase 3 audit script despite its name (it greps chart/analytics/contact-pref patterns, not sections).

---

## PHASE 5: REGISTRATION FLOW + WEBSITE REPLICA SYNC

### 5A. Student Registration to Dashboard Onboarding

**Location**: `UNMEIregis/src/RegisterPage.jsx`

**After successful registration**:
1. Create Firebase Auth account
2. Write to `students/{uid}` with initial profile, enrollment, and zeroed performance
3. Write to `enrollments/{autoId}`
4. Write to `users/{uid}` with email, role: "student", uid
5. Set `onboardingComplete: false`
6. Redirect to `UNMEIstudentsportal/dashboard.html`

**Onboarding behavior on dashboard**:
- If `onboardingComplete === false`, show a welcome overlay/tour:
  - Step 1: "Welcome to Unmei Nihongo Center!" with student name
  - Step 2: "Here is your dashboard — track your progress here"
  - Step 3: "Check your courses and schedules"
  - Step 4: "Download the mobile app to practice kanji strokes"
  - "Got it" button sets `onboardingComplete: true` in Firebase

### 5B. Email Verification

**On registration form**:
- Real-time email validation as user types (debounced 500ms):
  - Format check (valid email regex)
  - Duplicate check against `users/` node (query by email)
  - Show green checkmark or red alert inline
- Duplicate name check against `students/` node (warn, don't block)
- Alert box appears immediately when duplicate detected — no waiting for submit

### 5C. Country + Contact Number Validation

- Country dropdown with auto-detected country code prefix
- Phone number field: auto-format based on country code
- Real-time validation: show alert if number format is invalid
- Use international phone format detection (E.164)

### 5D. Complete Address Verification

- Address field must detect completeness:
  - Must contain at least: street/block, city/municipality, province/state
  - Show inline alert: "Please enter a complete address (street, city, province)"
  - Optional: zip code detection
- Prevent submission if address is too short (less than 15 characters) or lacks comma-separated parts

### 5E. React.js Registration Page Header

**Header image**: Inspect the header from `https://docs.google.com/forms/d/e/1FAIpQLSdTytnKEBm4_5RTuFh0_Qw3IoCV0AI00I0sekdhOPsO8dHEnA/viewform`
- If extractable, use it as the registration page header background
- If not extractable (CORS/auth issues), skip this — do not use a broken placeholder

### 5F. Website Replica Sync (UNMEIwebsite)

**Source of truth**: https://unmei-ph.com/ (live website as of August 2026)

**Changes detected from live site vs local replica**:
1. **New "Beginner Course" link** on hero section — add to local replica
2. **Navigation update**: Live site has `Home, About Us, Services, Posts, Contact Us`
3. **Pre-Enroll section**: Currently only at bottom of page. Must ALSO be visible near the top (after hero) and in Contact/Services pages
4. **Pre-Enroll link** must point to the React.js registration form at `/register/`
5. **"View Courses" removal**: No longer a separate link — courses are now under Services
6. **Services page** must include the Pre-Enroll access link to `/register/`

**Image updates**: Save any new images from the live site to `UNMEIwebsite/assets/`. Replace outdated images. Do NOT use external hotlinks to unmei-ph.com for images.

**Replica pages to update**:
- `UNMEIwebsite/index.html` — Hero section, Beginner course link, Pre-Enroll placement
- `UNMEIwebsite/services.html` — Add Pre-Enroll access, remove "View Courses" if present
- `UNMEIwebsite/contact.html` — Add Pre-Enroll access
- `UNMEIwebsite/about.html` — Sync with latest live content
- `UNMEIwebsite/study-in-japan.html` — Sync with latest live content

---

## PHASE 6: UI/UX POLISH AND COMPLIANCE

### 6A. Fully Responsive Mobile Layout

ALL portals (student, admin, instructor) must be fully responsive:
- Sidebar collapses to hamburger menu on mobile (already implemented)
- Tables convert to card layout on screens less than 768px
- Modals become full-screen on mobile
- Charts resize with viewport
- Touch-friendly tap targets (min 44px)

### 6B. No AI Look, No Emoji

- Remove ALL emoji from UI text, labels, buttons, notifications, tooltips
- Typography must be clean and professional (Inter, system fonts)
- No gratuitous gradients, no neon colors
- Use the existing design language: clean white backgrounds, subtle borders, muted accent colors

### 6C. Logout Consolidation

**Student Portal**: Remove `logout()` function from all pages except `settings.html`. Add a "Sign Out" link to the sidebar bottom (after the user section).

**Admin Portal**: Same — logout only in `admin-portal-settings.html` and sidebar bottom.

**Instructor Portal**: Build with logout only in settings and sidebar from the start.

### 6D. App Download — Stylus Pen Requirement

**Location**: `UNMEIstudentsportal/app-download.html`

Add a "Requirements" card before the download section:
```html
<div class="requirement-card">
  <h3>Requirements</h3>
  <ul>
    <li>Android device (version 8.0 or higher)</li>
    <li>A stylus pen is required for Japanese stroke practice exercises</li>
    <li>Stable internet connection for progress syncing</li>
  </ul>
</div>
```

---

## PHASE 7: FDD DIAGRAM UPDATE

**Location**: `unmei_webportal_fdd.drawio` / `unmei_webportal_fdd.xml`

### Add Third Column: Instructor Portal

Add these nodes under a new "Instructor Portal" column (use blue color scheme `#1E3A5F`):

| Node | Label |
|------|-------|
| inst_node_1 | Instructor login and authentication |
| inst_node_2 | Dashboard with assigned courses overview |
| inst_node_3 | View enrolled students per course |
| inst_node_4 | View individual student performance analytics |
| inst_node_5 | View instructor ratings and feedback |
| inst_node_6 | Manage instructor profile and settings |

### Update Student Portal Nodes

Ensure these nodes exist (yellow nodes for new features):
- s_node_9: "Students can evaluate the professor" (already exists, yellow)
- s_node_10: "Score tab shows performance analytics" (already exists, yellow)

### Update Admin Portal Nodes

Ensure these nodes exist:
- adm_node_9: "Generate student performance reports" (already exists, yellow)
- adm_node_10: "Manage instructor accounts and credentials" (NEW, replaces "Automated tuition balance reminders")

---

## PHASE 8: LOCALHOST AND CROSS-IDE COMPATIBILITY

### 8A. Terminal Output Cleanup

**File**: `scripts/start-all.ps1`

Add a `-QuietMode` switch. When enabled:
- Suppress all `PREREQ_PASS`, `SYNC_CHECK_PASS`, `START_ALL_PASS`, `START_ALL_INFO` messages
- Show only:
  ```
  Unmei Nihongo Center - Portal System v1.0
  Initializing...
  All services started successfully.

  Portal: http://localhost:5000/

  Press Ctrl+C to stop.
  ```
- Default behavior (without `-QuietMode`) remains unchanged for automated testing

### 8B. Cross-IDE Compatibility

The system must work with:
- VS Code with Antigravity
- VS Code without extensions
- WebStorm / IntelliJ
- Any terminal running `powershell -ExecutionPolicy Bypass -File .\scripts\start-all.ps1`

**Verify**:
- No VS Code-specific extensions required for runtime
- `public/` mirror sync works from any terminal
- `npx serve public/` fallback always works
- React registration app builds with `npm run build` in `UNMEIregis/`

### 8C. Firebase JSON + Hosting Configuration Update

**File**: `firebase.json`

Add rewrites for the new instructor portal:
```json
{
  "hosting": {
    "public": "public",
    "rewrites": [
      { "source": "/register/**", "destination": "/register/index.html" }
    ]
  }
}
```

Update `scripts/start-all.ps1`, `check-sync.ps1`, and `sync-to-public.ps1` to include `UNMEIinstructorportal` in the sync and smoke-test target list.

Update `STARTGUIDE.md` demo URLs to include:
- `http://localhost:5000/UNMEIinstructorportal/instructor-login.html` — Instructor login

---

## SCOPE BOUNDARY — COMPLETION STATUS (2026-08-22 Full Audit)

All work listed for "THIS AGENT" and "NEXT AGENT" below has been implemented and verified in the 2026-08-22 full audit pass:

1. D3.js chart migration — DONE (self-hosted `assets/d3.v7.min.js` + `assets/unmei-charts.js` in all three portals; zero Chart.js references; no pie/doughnut)
2. Instructor Portal — DONE (login, dashboard, students, student-view analytics, ratings, settings)
3. Instructor ratings 8-category evaluation modal — DONE (`UNMEIstudentsportal/courses.html`)
4. Student view upgrade with performance analytics — DONE (admin `admin-students.html` + instructor `instructor-student-view.html`)
5. Section-to-Course migration — DONE (`admin-courses.html`, `admin-build-course.html`, `admin-course-view.html`; obsolete section pages deleted)
6. Email/address verification — DONE (real-time duplicate email check vs `users/`, name warning vs `students/`, strict address completeness)
7. Onboarding flow — DONE (`onboardingComplete:false` on registration; Get Started agreement modal on dashboard shown once)
8. Terminal output cleanup — DONE (`start-all.ps1 -QuietMode`)
9. Payment modal fix, logout consolidation, FDD instructor column, mobile responsiveness, app download stylus note — DONE
10. Canonical dataset consolidation — DONE 2026-08-22: single generator `scripts/build-seed-dataset.cjs`, single payload `firebase-database-structure.json` (repo root), validator gate inside `safe-reimport.ps1`; obsolete generators (`build-36-students-json.js`, `generate-full-reimport.ps1`) deleted; payload no longer mirrored to `public/` (credential leak fixed)
11. Iconify 100% — DONE 2026-08-24 (Phase 6 rectification): the original claim was inaccurate for the registration app; lucide-react fully removed and replaced with bundled `iconify-icon` (mdi icons) in `UNMEIregis`, verified in the deployed single-file build. Portals use self-hosted `assets/iconify-icon.min.js`.
12. Custom sign-out confirmation modals (no browser `confirm()`) — DONE in all three portals (student red / admin dark / instructor navy)
13. Demo account lockdown — DONE: demo link removed from official login; `demo-login.html` gated to localhost/LAN presentation hosts
14. Registration contact preference — DONE: `wantCall` Yes/No column + manage-modal detail in `admin-enrollments.html`, `contact_leads/` written on Yes
15. Saturday class rule — DONE: "Saturday Only" days and "8am - 5pm (Sat Only)" slot auto-pair and validate exclusively in the registration form
16. Post-registration flow — DONE: single "Go to Student Login" button; no auto-login session; onboarding shows once at first sign-in

---

## VERIFICATION CHECKLIST (Audited 2026-08-22 — READY FOR PANEL DEFENSE)

- [x] All charts are D3.js — zero Chart.js references remain (audit scan 2026-08-22; D3 v7 self-hosted per portal)
- [x] No pie/doughnut charts anywhere (audit scan)
- [x] All charts read from Firebase RTDB, not hardcoded data
- [x] Student dashboard shows real performance data with D3.js visualizations
- [x] Admin student view shows performance analytics with D3.js charts (radar + progress + trend)
- [x] Instructor portal is functional with login, dashboard, student list, ratings view
- [x] Instructor ratings modal is full evaluation form (8 categories)
- [x] Firebase JSON is clean — no `SAMPLE_` records, no template-only nodes (validator-enforced)
- [x] 10 instructors in Firebase with credentials (all 10 fully detailed; `unmei-ph.com` domain)
- [x] Registration redirects with onboarding (single "Go to Student Login" button; Get Started shows once on first sign-in)
- [x] Email verification works in real-time on registration (debounced duplicate check vs `users/`)
- [x] Address completeness check works on registration (street, city, province required)
- [x] Website replica matches latest unmei-ph.com (pre-enroll + login in nav on all pages)
- [x] Pre-Enroll visible at top of website AND in Services/Contact
- [x] Sections renamed to Courses throughout admin portal (obsolete section pages deleted)
- [x] Logout only in Settings and sidebar — with custom confirmation modal (no browser confirm/alert anywhere)
- [x] Terminal output is clean in `-QuietMode`
- [x] App download mentions stylus pen requirement
- [x] No emoji in any UI text (full-tree scan clean, including React build; re-verified 2026-08-24)
- [x] Iconify used across 100% of the system (portals + React registration app; lucide fully removed 2026-08-24 — see PHASE 6 RECTIFICATION LOG)
- [x] Fully responsive on mobile
- [x] System works from any IDE terminal, not just VS Code
- [x] `start-all.ps1` runs cleanly (`-ForceNoFirebase -IncludeWebsiteSync`)
- [x] Smoke test passes all routes (including instructor portal and register)
- [x] Admin can view student performance data (not just UI labels) + contact preference (wantCall) column
- [x] Instructor can view student performance (read-only)
- [x] Instructor account management accessible from admin portal (course-view instructor credentials)
- [x] Dataset standard: 30 students (10 full / 10 partial / 10 minimal), 41 users, 30 payments, 20 ratings — validated by `scripts/validate-seed-dataset.cjs` inside `safe-reimport.ps1`
- [x] Students cannot access demo accounts (demo login gated to localhost/LAN; no demo link on official login)
- [x] Saturday-only schedule rule enforced in registration (days and slot pair exclusively)

---

> **Domain**: unmei-ph.com
> **Firebase Project**: unmei-nihongo-center
> **Last Updated**: 2026-08-24 (Phases 5-9 executed and logged; Phase 9 final verification ALL GREEN, reimport armed awaiting GO. Interim Phase 10: admin-students silent-failure loader hardened + course-view fabricated fallbacks removed. GLM Phases 10-14 full plan text still pending from owner.)


## PHASE 5 — RECTIFICATION LOG (2026-08-24, verified on disk)

Full re-audit of the registration flow and website replica. Items 5A-5E verified complete from source with no changes required; item 5F had two placement gaps plus a broken website sync pipeline, both rectified.

### Verified complete (evidence)
- **5A post-registration writes** (`RegisterPage.jsx`): Firebase Auth account → `students/{uid}` (profile, enrollment w/ courseId mapping + canonical schedules, zeroed performance, `onboardingComplete:false`, registrationAgreement) → `users/{uid}` → `enrollments/{uid}` → `contact_leads/{uid}` on wantCall=Yes.
- **5A onboarding chain**: single "Go to Student Login" button (no auto-session); `login.html` arms first-visit only when `onboardingComplete===false`; dashboard Get Started modal once, acceptance writes `profile/portalAgreement` + `onboardingComplete:true`.
- **5B**: debounced 500ms email format + duplicate scan of `users/` with inline status; duplicate-name warning vs `students/`.
- **5C/5D**: country dial codes; PH `9XXXXXXXXX` else international 7-15 digits; address >=15 chars + comma guard.
- **5E**: stable-version `preenroll-header.jpg` banner rendered above top-of-page sign-in band.

### Rectified (5F + tooling)
- index.html: post-hero Pre-Enroll band added; contact.html: body-level Pre-Enroll band added; unmei-portal.css: `.unmei-preenroll-band` styles (#fd534d family, Open Sans, 2px radius).
- `sync-to-public.ps1 -IncludeWebsite`: FIXED crash on phantom `style.css`; stale list replaced (added jlpt-n4-course.html, unmei-portal.css; mirrors wp-content/, wp-includes/, register/). `check-sync.ps1`: same fix.
- Flagged honestly: doc's "Iconify converted" claim did not match RegisterPage.jsx source (resolved in Phase 6).

### Verification
Mirror hashes matched; SYNC_CHECK_PASS (-IncludeWebsite); SMOKE_TEST_PASS; register build byte-identical across dist / UNMEIwebsite/register / public/register.

---

## PHASE 6 — RECTIFICATION LOG (2026-08-24, verified on disk)

Full compliance re-audit of all portal trees plus the registration app.

- **6A responsive**: hamburger sidebar (≤700px), table→card conversions, narrow-viewport modal rules verified present in studentportal/adminportal/instructorportal CSS. No changes needed.
- **6B emoji/AI look**: Unicode emoji scan across all portal/website/regis files incl. deployed dist: 0 hits; zero Chart.js/doughnut references. No changes needed.
- **6C logout consolidation — FIXED**: raw browser `prompt()` x2 found in `admin-portal-settings.html` (display-name edit, password change). Replaced with custom in-page input modal (`#inputOverlay`) matching the dark confirm-overlay design language; password masking, required-value validation, focus management. Raw-dialog scan now 0 across all portals.
- **6D stylus requirement**: already present in app-download.html (Android APK / Android 8.0+ / stylus pen for Kanji practice). No changes needed.
- **Iconify reconciliation (the flagged discrepancy)**: lucide-react REMOVED (deps + node_modules); bundled `iconify-icon` added (`main.jsx` side-effect import); RegisterPage.jsx 21-icon import replaced with thin `<iconify-icon>` wrapper components (mdi equivalents) mirroring lucide's size/className API so all 33 call sites stayed untouched; alignment rule added to index.css. Rebuilt (`npm run build` exit 0): deployed build has 0 lucide refs; byte-identical across dist / UNMEIwebsite/register / public/register (653302 bytes).

### Verification
SYNC_CHECK_PASS (-IncludeWebsite); SMOKE_TEST_PASS; raw-dialog scan 0; emoji scans 0; build clean.

---

## PHASE 7 — VERIFICATION LOG (2026-08-24, verified on disk)

Full structural re-audit of `unmei_webportal_fdd.xml` (257 lines, mxfile) against every Phase 7 requirement. All requirements already satisfied — zero modifications needed. Verified via purpose-built parser (`scripts/p7-fdd-validate.cjs`, kept as a permanent audit gate): parses all 61 mxCells, checks ids/labels/styles/edge topology.

- Instructor Portal third column (`#1E3A5F`) with `inst_node_1..6`, exact spec labels.
- `s_node_9` / `s_node_10` yellow feature nodes present; `adm_node_9` / `adm_node_10` ("Manage instructor accounts and credentials") yellow; obsolete "Automated tuition balance reminders" absent.
- Connector topology verified: root→3 columns + complete sequential chains per column (30 edges).
- Result: **FDD_VALIDATION_PASS**.

---

## PHASE 8 — RECTIFICATION LOG (2026-08-24, verified on disk)

Cross-IDE and localhost compatibility re-audit; one real defect found and fixed.

- **8A QuietMode — FIXED**: `-QuietMode` existed but the child `check-sync.ps1` still leaked `SYNC_CHECK_*:` labels into quiet output (Write-Host bypasses parent guards). Fixed by running check-sync as a suppressed subprocess in QuietMode (explicit arg list; output shown only on failure). Live test `-QuietMode -ForceNoFirebase -IncludeWebsiteSync` → exactly the spec banner, exit 0. Default mode re-tested unchanged (full labels, START_ALL_PASS).
- **8B cross-IDE**: `.vscode/` holds only optional settings (no runtime extensions); sync/check/smoke all run from plain `powershell -ExecutionPolicy Bypass -File`; `npx serve public/` fallback proven live; `npm run build` exit 0 (installs need `--legacy-peer-deps` due to pre-existing vite@4/singlefile@2 peer conflict — documented).
- **8C**: firebase.json `/register/**` rewrite present; sync mirrors UNMEIinstructorportal; smoke-test covers register + instructor routes. GAP FIXED: STARTGUIDE.md §2 demo URLs missing instructor login — added `.../UNMEIinstructorportal/instructor-login.html — Instructor login` to route list and open-all command.

### Verification
Live QuietMode + default-mode runs clean; SMOKE_TEST_PASS; SYNC_CHECK_PASS.

---

## PHASE 9 — FINAL VERIFICATION & REIMPORT READINESS (2026-08-24, verified on disk)

Full-system final sweep executed; the destructive RTDB import is **armed but NOT executed** — per the phased plan it runs only on the owner's explicit GO.

### Final verification gates — ALL GREEN
| Gate | Result |
|------|--------|
| `validate-seed-dataset.cjs` | SEED_DATASET_VALID — students=30 (perf=20), instructors=10 (creds=10), users=41, payments=30, enrollments=30, sections=6, ratings=20 |
| `safe-reimport.ps1 -SkipImport` | SAFE_REIMPORT_VALIDATE_PASS (BOM normalize + Firebase-invalid-key scan clean) |
| `p7-fdd-validate.cjs` | FDD_VALIDATION_PASS |
| `check-sync.ps1 -IncludeWebsite` | SYNC_CHECK_PASS |
| `smoke-test.ps1` | SMOKE_TEST_PASS |
| `start-all.ps1 -QuietMode -ForceNoFirebase -IncludeWebsiteSync` | Clean banner only, exit 0 |
| `firebase-config.js` x3 portals + `UNMEIregis/src/firebase.js` | Identical to the official Unmei-PH config |

### Live RTDB vs payload deep comparison (`scripts/p9-live-diff.cjs`)
Pre-import backup taken first (read-only): **`firebase-backup-20260824-173045.json`** (112,233 bytes, JSON-valid). Order-independent node-by-node diff:

- IDENTICAL: announcements, app_download, config, contact_leads, courses, enrollments, instructorRatings, instructors, logs, messages, notifications, portal_config, schedules, settings, users
- DIFFERS (4 nodes), root-caused:
  1. **students — CRITICAL**: payload has `appSyncData` + `progressHistory` on 20 data-tier students; LIVE is missing both on **19** (student_002..student_020). These feed the dashboard D3 visualizations (`initDataViz`) and admin/instructor analytics — the live system currently renders empty/partial charts for them. The reimport restores this data.
  2. payments / sections: explicit `null` values in payload vs absent keys live — RTDB deletes nulls on write; functionally equivalent.
  3. admins: runtime `lastLogin` stamp present live, absent in payload — reimport resets it (cosmetic).

### Reimport execution plan (ON YOUR GO)
1. Backup secured: `firebase-backup-20260824-173045.json`.
2. Run `safe-reimport.ps1` full mode (`firebase database:set / --force`). Accepted side effects: resets admin lastLogin; null keys stay absent.
3. Post-import: fresh `firebase database:get /` → re-run `p9-live-diff.cjs` → expect LIVE_MATCHES_PAYLOAD.
4. Spot-check student_002+ dashboards render restored progressHistory/appSyncData.

---

## PHASE 10 — INTERIM OPEN-ITEM FIXES (2026-08-24)

GLM's Phases 10-14 batch was referenced but its full text was not received; the two concrete open items it named were rectified from source:

### admin-students table showing "0" (hidden `.catch` error) — FIXED
- `loadStudentsFromFirebase()` used `Promise.all` with a trailing `.catch` that silently blanked the whole table when ANY of five reads failed (students/payments/enrollments/courses/instructors).
- Now uses `Promise.allSettled`: students read is critical (explicit failure toast + console.error with resource name and reason); the other four degrade to safe empty-snapshot fallbacks so the roster still renders with available data; partial failures surface via toast + console.error. The old silent-blanking catch now only handles rendering bugs without wiping rows.
- Remove-student flow's silent `.catch` also gained console.error diagnostics.

### Courses view (`admin-course-view.html`) completeness — FIXED
- Removed ALL fabricated fallbacks: fake 65% progress for students without performance data (now "No progress recorded"), fake "JLPT N1 Certified" / "B.A. in Japanese Language" / "6 years" / "4.7 rating" credential defaults (real values only, explicit empty states), hardcoded static "4.8 / 5.0" stat (now computed from assigned instructors' averageRating + totalRatings; "--" / "No ratings yet" when absent).
- Multi-instructor support: renders ALL instructorIds (+ legacy instructorId) instead of only the first.
- Error handling added: .catch with console.error + toast (page previously had none); missing #admToast element added.
- Status badge colors per status (active/completed/pending/assessment_required/inactive) instead of always-green.
- HTML-escaping for all DB-derived strings injected via innerHTML.

### Verification
Inline-JS vm.Script syntax OK both files; SYNC_CHECK_PASS; SMOKE_TEST_PASS.

---

New and Last batch of Phases created bg GLM 5.3
Here's the **Finalization Batch — Phases 10-14** (plan only, dito lang sa chat, walang gagawin hangga't walang GO). Kasama rito ang mga bukas na items na nahanap ko sa kasalukuyang Phase 4 verification (yung admin students table na "0" — may tinatago itong error sa `.catch` na kailangang buksan at ayusin, at ang Courses view na sinabi mong hindi pa tapos).

---

---

> âš ï¸ **RESTORATION NOTICE (2026-08-26)**: The master file was accidentally truncated during a log append (editor/OneDrive glitch) and restored from the pre-finalization backup. Sections below were FAITHFULLY RECONSTRUCTED from session evidence; wording of some subsections may differ slightly, but all results/counts/PASS verdicts are real recorded values.

## PHASE 10 â€” SAFETY BACKUP + FILE-STRUCTURE CLEANUP â€” COMPLETE (2026-08-24)
- Full backup: ..\Unmei Unified Module - BACKUP pre-finalization (1,358 files, 76.9 MB) + zip 39.8 MB; canonical payload + firebase backup verified inside.
- AI-artifact purge: 0 hits across known patterns; deleted .zcode/ plan artifact.
- Clutter purge (verified unreferenced): p3/p4-audit.cjs, tmp-appsync pusher+data, _old_replica (13.3 MB), scripts/legacy generators, scripts/rebuild toolchain (191 files).
- Owner decision executed: UNMEI ORIGINAL WEBSITE + Unmei-stable-org DELETED (backup-covered); unmei-reference was empty on disk.
- Post-cleanup gates green (SYNC / SMOKE / SEED).

## PHASE 9 â€” REIMPORT EXECUTED & VERIFIED (2026-08-24, owner GO)
SAFE_REIMPORT_PASS; post-import diff = RTDB null/[] storage semantics only, zero missing records; appSyncData 20/20 + progressHistory 20/20 â€” dashboards live-backed.

## PHASE 11 â€” BUG SQUASH & DATA INTEGRITY â€” COMPLETE (2026-08-24)
STUDENTS_LOADER_TEST_PASS (30 rows live-resolved, full field chain); P4/P5 backlog closed (view analytics, CONTACT column, instructor flows end-to-end); NAV_CHECK_PASS 353 targets zero-dead; SCHEMA_COVERAGE_PASS 183 refs.

## PHASE 12 â€” ADMIN COURSES OVERHAUL â€” COMPLETE (2026-08-24)
Course List: all instructors from instructorIds, schedule from real enrollments, live counts+price. Course View roster deep-links to performance view (?student=UID auto-open). Legacy non-canonical enrollment modal deleted -> canonical wizard pointer. SYNTAX/NAV gates passed.

## PHASE 13 â€” GLOBAL SEARCH (MS TEAMS-STYLE) â€” COMPLETE (2026-08-24)
Per-portal assets/global-search.js injected on 24 content pages; Ctrl+K overlay with grouped results; role-scoped (admin records w/ deep-links; instructor own-scope; student pages-only privacy). HTML-escaped; debounced live reads.

## PHASE 14 â€” FDD DELIVERABLES â€” COMPLETE (2026-08-24)
File A unmei_webportal_fdd.xml FDD_VALIDATION_PASS (61 cells, topology verified). File B unmei_webportal_fdd_print.xml STRUCTURE_IDENTICAL (61=61), white/black print-friendly. Interface picture-style XMLs later relabeled per owner: outcome chips Accept->Backend, Decline->Frontend (student/admin 10+10, instructor 6+6); canonical/print contain no such chips.

## PHASE 15 â€” IDENTITY, ANTI-AI & RESPONSIVE POLISH â€” COMPLETE (2026-08-24)
Tagline: official site footer slogan retained (replica fidelity); misuse as inline form helper on Pre-Enroll removed -> real instruction text; register rebuilt + deployed hash-parity x3. Emoji sweep: 221 files 0 hits (incl seed JSON); quarantined _legacy admin-section-view.html deleted source+mirror. Responsive re-verified. Admin vs Instructor performance visibility verified (both D3-backed; instructor ownership-scoped read-only).

## PHASE 16 â€” SCHEMA FREEZE & REIMPORT VERIFICATION â€” COMPLETE (2026-08-25)
SEED_DATASET_VALID reconfirmed; dataset FROZEN. Fresh remote export diff: 16/19 identical, remaining paths pure []/null semantics â€” ZERO drift since Phase 9; remote counts match canonical (courses 6, instructors 10, users 41, payments 30, enrollments 30, ratings 20). Rollback assets intact.

## PHASE 17 â€” COMPILE & DEPLOY READINESS â€” COMPLETE (2026-08-26)
FIXED: 4 live window.prompt() calls in cash-payment flows replaced with custom modals; raw-dialog scan 0. Audit suite green (emoji/Chart.js/dialogs/nav/schema/syntax/loader/seed). SYNC_CHECK_PASS (-IncludeWebsite), SMOKE_TEST_PASS 16/16, QuietMode clean banner. Demo handoff summary appended.

## PHASE 18 â€” ULTIMATE FULL RE-AUDIT â€” COMPLETE (2026-08-26)
Validation ALL GREEN (FDD x2, syntax 28 pages, nav zero-dead, schema coverage, seed valid, sync, smoke 9/9). Artifact purge with evidence-before-delete (p18-fdd-word orphan, p13-inject applied, audit-student-portal superseded, sync-to-public.js duplicate); post-purge suite still green. Deep code audit: plaintext Admin@2026 removed (SHA-256 login, 5/5 vectors); stuck-button hardening; eval/raw-dialog/document.write=0; demo-login gated; jQuery refs are local WP-replica bundles. Redundancy double-check: 20 distinct-purpose scripts; shared assets MD5-identical; FIXED instructor unmei-charts.js stale copy (silent yMax breakage on 4 charts). Website fidelity diff vs live unmei-ph.com: original 100% intact, invented bands removed, sanctioned header Pre-Enroll+Login only. CSS lint: 9 empty style attributes removed. Portability PASS (0 machine-bound paths; check-sync proven from C:\ root; STARTGUIDE Â§0 new-PC guide). Search dedup + settings-style upgrade (ONE bar; instructor search ReferenceError fixed). Receipt verification gate (OCR + quality checks; GCash/bank screenshots PASS, blurry/non-payment REJECT; admin final verifier). Security: instructor passwords SHA-256 in payload+login; RTDB rules LOCKED (401/401 live-proven) post-Firestore-primary. Performance enrichment: students 021-030 realistic profiles (mean 80.4, SD 10.0, zero zero-records).

## FINALIZATION OVERHAUL P1â€“P7 â€” COMPLETE (2026-08-26)
P1 Email validation: placeholder yourname@gmail.com; 8 disposable domains blocked; strict TLD regex; triple-node duplicate scan (users/students/enrollments) real-time + pre-create race guard; @email.com explicit rejection; yahoo/gmail/outlook valid. EMAIL_POLICY_PASS 11/11; rebuilt+deployed hash-parity x3. â€” P2 Portal Agreement: owner-tuned GENERAL version, 11 clean sections, no RA citations/license language/emoji/Yokoso; acceptance flow intact. â€” P3 Data viz: instructor +trend/+distribution/+rating radar (normalizeWeekly array|object); admin #statPending id-based hardening + aggregate skill radar. â€” P4 Fable-5 CSS: radius split 10/14/16, shadow personalities+hovers, backdrop-blur, asymmetric gaps, gradient buttons, thin scrollbars x3 portals (plan's "warm neutral instructor" overridden by owner RED mandate). â€” P5 Page wiring: LIVE RTDB verification 23/23 pre-migration; admin-courses .catch hardening; coverage allow-list += payment_receipts. â€” P6 Redundancy: sync-to-public.js confirmed gone; documented scripts only; JSON integrity clean; extension artifacts 0; first-party console.log 0. â€” P7 Docs: STARTGUIDE FINALIZED status + Â§12.5 + Â§13 Firestore mapping; full-reimport-guide FROZEN workflow + Â§8 migration + rules template.

## PHASE 8 â€” CLOUD FIRESTORE MIGRATION â€” COMPLETE (2026-08-26)
Data: fresh RTDB export â‰¡ canonical (19 entities); migrated WITH original IDs; dry-run 236 planned -> 236 committed; post-inspect 19/19 collections PASS (2 junk users docs reported+deleted); relationships 12/12; RTDB untouched (rollback). Code: firestore-shim.js adapter per portal (zero page-logic changes; 187 ref() calls now Firestore); 28/28 pages wired, RTDB SDK tags fully removed; SHIM_E2E 13/13 vs live; UNMEIregis converted (modular) -> rebuilt -> deployed byte-identical x3, zero firebasedatabase.app refs. Rules: whitelist lockdown deployed (junk denied live-proven); RTDB rule-locked afterwards (401/401). Incoming realtime registration simulated end-to-end: LANDED + portal-readable + cleaned. Same-round UX: instructor portal recolored RED (#C0392B family); chip-row flex-gap fix; Firebase email verification on signup; schedules chain verified complete.

## POST-MIGRATION FIX ROUND (2026-08-26, evidence-based)
1. ADMIN LOGIN "failed unexpectedly" ROOT-CAUSED & FIXED: sha256Hex() synchronous but chained with .then() (regression of Phase-18 stuck-button fix) -> TypeError before credential check. Now direct sync call in try/catch/finally. Hash re-verified exact vs Admin@2026 (earlier mismatch was test-regex quoting error). Instructor/student login audited clean.
2. CONNECTIVITY PROVEN: rebuilt p8-shim-live.cjs runner (firebase@9.22.2 compat) executing the REAL shim vs LIVE locked Firestore -> SHIM_LIVE_E2E PASS 13/13 incl queries+writes; non-whitelisted DENIED correctly; admins.lastLogin whitelist-write OK. Blank '--' pages were stale browser cache of pre-migration JS â€” Ctrl+F5 resolves (disk+served cache-busted clean).
3. DUPLICATE SEARCH BARS ELIMINATED: legacy topbar inputs (#globalSearch/#topSearch + bare decorative) removed from 10 pages; ONE global search per portal remains (header button + Ctrl+K, now also exposed via window.__unmeiOpenGlobalSearch hook). Content filters KEPT (annSearch, inlineSearch, paymentSearch, studentSearchModal, instructor studentSearch). JS refs neutralized exactly. First codemod attempt broke 3 files (glued-comment brace miscount) â€” RESTORED from mirror baseline, redone with exact-match edits, syntax verified per batch.
GATES FINAL: SYNTAX_CHECK_PASS Â· NAV_CHECK_PASS Â· SYNC_CHECK_PASS Â· DEAD_BARS=0 (disk+served cache-busted) Â· SHIM_LIVE_E2E 13/13 Â· INCOMING_USER simulation PASS Â· FIRESTORE 16/16 collections CLEAN vs canonical Â· RTDB locked 401/401.

---

> **Domain**: unmei-ph.com Â· **Firebase Project**: unmei-nihongo-center Â· **Datastore**: Cloud Firestore (RTDB = locked rollback source)
> **Last Updated**: 2026-08-26 â€” All phases complete; system UAT-ready.
