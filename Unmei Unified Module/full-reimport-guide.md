# Firebase Reimport Guide (Single Canonical Payload)

One payload file, one validator. No duplicates.

- Payload: `firebase-database-structure.json` (repository root) -- **FROZEN canonical dataset**
- Validator: `scripts/validate-seed-dataset.cjs` (runs automatically inside safe-reimport)

The payload is never synced to `public/`: it contains credential data used by the
instructor portal login fallback and must not be web-accessible. Passwords in the payload
are SHA-256 digests (instructors) or verified against hash at sign-in (admin); plaintext
credentials live only in STARTGUIDE.md for demo purposes.

> **Status (2026-08-26)**: PHASE 8 MIGRATION COMPLETE — Cloud Firestore is now the primary datastore. RTDB is preserved untouched as rollback source AND is now rule-locked (read/write denied publicly) - see database.rules.json. RTDB re-import instructions below remain valid only if you intentionally roll back.
>
> **Portable paths**: All commands below assume your terminal is inside the project folder (`cd` into `Unmei Unified Module` wherever you placed it). No drive letter or username is hardcoded - the project runs identically from any folder or machine. RTDB re-import instructions below remain valid only if you intentionally roll back.
> The Cloud Firestore migration is the NEXT phase -- see section 8 below.

## 1) Dataset Changes

The seed dataset is FROZEN as of 2026-08-25 (30 students enriched with realistic performance
data, zero zero-records; class mean 80.4 / SD 10.0). The retired `build-seed-dataset.cjs`
generator has been removed -- do NOT regenerate. If the school requests data changes, edit
the JSON directly, then always re-validate:

```powershell
cd "<project-folder>"   # example: cd "Unmei Unified Module"
node scripts\validate-seed-dataset.cjs
```

Expected marker: `SEED_DATASET_VALID`.

## 2) Import (Preferred Path)

Validation (BOM, Firebase-invalid keys, dataset integrity) runs first; the import
only proceeds when everything passes:

```powershell
cd "<project-folder>"   # example: cd "Unmei Unified Module"
.\scripts\safe-reimport.ps1
```

Markers: `SEED_DATASET_VALID`, `SAFE_REIMPORT_VALIDATE_PASS`, `SAFE_REIMPORT_PASS`.

Validate only (no import):

```powershell
.\scripts\safe-reimport.ps1 -SkipImport
```

## 3) Manual Fallback (CLI)

```powershell
firebase database:set / firebase-database-structure.json --project unmei-nihongo-center --force
```

## 4) Backup Current Database First (Before Any Overwrite)

```powershell
firebase database:get / --project unmei-nihongo-center > backup-before-reimport.json
```

## 5) Rollback

```powershell
firebase database:set / backup-before-reimport.json --project unmei-nihongo-center --force
```

## 6) Standard Seeded Dataset Counts

| Node | Count | Notes |
|------|-------|-------|
| students | 30 | 10 full performance data, 10 partial, 10 minimal (fresh) |
| instructors | 10 | all with full credentials (education, certifications, languages) |
| users | 41 | 3 admins + 10 instructors + 30 students, role-tagged |
| payments | 30 | approved / pending / rejected mix |
| enrollments | 30 | includes wantCall (contact preference) |
| sections / schedules | 6 / 6 | one course = one section model |
| instructorRatings | 20 | averages recomputed to stay consistent |
| announcements | 4 | academic, finance, event |
| notifications / messages | 8 / 4 | header dropdown demo data |
| contact_leads | 4 | call-request records for the admin portal |

Demo accounts (stable, used by the localhost-gated demo login):

- student_001 â€” Liam Reyes â€” liam.reyes1@unmei-ph.com
- student_002 â€” Noah Santos â€” noah.santos2@unmei-ph.com
- student_003 â€” Ethan Cruz â€” ethan.cruz3@unmei-ph.com

Instructor portal credential fallback: `instructors/{id}/loginPassword` stores a **SHA-256
hash** of Unmei@Prof01 through Unmei@Prof10 (plaintext passwords are listed in STARTGUIDE.md
section 3.6 only; they are never stored in the database). Admin portal: admin@unmei-ph.com /
Admin@2026, verified via SHA-256 hash in the page code.

## 7) Runtime Verification

```powershell
.\scripts\start-all.ps1 -ForceNoFirebase -IncludeWebsiteSync
.\scripts\smoke-test.ps1 -IncludeWebsiteRoutes
.\scripts\stop-all.ps1
```

Expected markers: `START_ALL_PASS`, `SMOKE_TEST_PASS`, `STOP_ALL_PASS`.

## 8) Cloud Firestore Migration (NEXT PHASE)

Executed via Cline MCP (`firebase-tools@latest mcp`); the Ox Alpha agent performs the
migration after UAT acceptance. Until then, everything above stays authoritative for RTDB.

### Collection mapping (RTDB -> Firestore)
| RTDB | Firestore |
|------|-----------|
| students/{uid} | students collection, doc id = uid |
| instructors/{id} | instructors |
| users/{uid} | users |
| payments/{id} | payments |
| enrollments/{uid} | enrollments |
| courses/{id} | courses |
| sections/{id}, schedules/{id} | sections, schedules |
| announcements/{id}, instructorRatings/{id} | announcements, instructorRatings |
| settings, config, portal_config, app_download | single-doc config collections |
| contact_leads, logs, messages, notifications | runtime collections (same names) |

### Execution outline
1. Read firebase-database-structure.json (canonical source of truth).
2. Create collections with matching document structure; preserve demo data alongside real data.
3. Update every portal firebase-config.js to the Firestore SDK; convert database.ref() calls
   to collection()/doc() queries; rebuild UNMEIregis against Firestore.
4. Point the mobile app (APK) at the same Firestore project so app-side progress lands in the
   same student documents the portal reads.

### Post-migration verification
- All three portals functional on Firestore; realtime sync confirmed.
- Demo accounts accessible; new registrations create Firestore documents.
- Zero database.ref() references remaining in production code.
- Run smoke-test.ps1 route checks plus manual login/CRUD per role.

### Firestore security rules template (starting point)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() { return request.auth != null; }
    function role() { return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role; }
    match /students/{uid} {
      allow read: if signedIn() && (request.auth.uid == uid || role() in ['admin','instructor']);
      allow write: if signedIn() && role() == 'admin';
    }
    match /instructors/{id} {
      allow read: if signedIn();
      allow write: if signedIn() && role() == 'admin';
    }
    match /users/{uid} {
      allow read, write: if signedIn() && request.auth.uid == uid;
    }
    match /payments/{id} {
      allow read: if signedIn();
      allow create: if signedIn() && role() == 'student';
      allow update, delete: if signedIn() && role() == 'admin';
    }
    match /courses/{id} {
      allow read: if true;
      allow write: if signedIn() && role() == 'admin';
    }
    match /announcements/{id} {
      allow read: if signedIn();
      allow write: if signedIn() && role() == 'admin';
    }
  }
}
```
