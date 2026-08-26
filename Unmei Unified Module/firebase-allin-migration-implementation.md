FINAL MIGRATION SOURCE — IMPORTANT

The final source dataset for this migration is:

firebase-database-structure.json

This is the FINAL version of the dataset.

Use this file as the reference structure for the Firebase migration.

The data represented by this final JSON file is the data that must
exist in Firebase after the migration.

SOURCE:
Firebase Realtime Database

TARGET:
Cloud Firestore

Firebase Project ID:
unmei-nihongo-center

Project Directory:
C:\Users\John Raphael\OneDrive\Documents\Unmei Unified Module

==================================================
SOURCE OF TRUTH
==================================================

Treat the FINAL JSON structure and the actual imported Realtime
Database data as the source of truth.

Do NOT:

- use the older firebase-database-structure.json if it conflicts
  with firebase-database-structure(1).json
- generate dummy data
- replace records with sample data
- skip existing records without reporting them
- delete data from Realtime Database
- mark the migration complete when Firestore is empty
- stop after generating only a migration script

The FINAL expected structure includes the actual top-level entities
present in the final dataset, including:

admins
announcements
app_download
config
contact_leads
courses
enrollments
instructors
instructorRatings
logs
messages
notifications
payments
portal_config
schedules
sections
settings
students
users

Before migration, verify these against the ACTUAL Realtime Database.

==================================================
MIGRATION REQUIREMENT
==================================================

Perform an actual migration from Firebase Realtime Database to
Cloud Firestore.

The final result MUST satisfy:

1. Read the actual existing data from Realtime Database.

2. Compare the RTDB structure with:
   firebase-database-structure(1).json

3. Design the Firestore schema based on:
   - the actual data
   - existing relationships
   - the application's source code and queries

4. Preserve existing IDs whenever possible.

Examples:

student_001
prof_001
jlpt_n5
section_01
payment_001

5. Generate a safe and idempotent migration process.

6. Perform a dry run first.

7. Execute the REAL migration.

8. Write the actual data into Cloud Firestore.

9. Directly inspect Firestore after migration.

10. Verify that Firestore contains actual populated documents.

==================================================
MANDATORY POST-MIGRATION VERIFICATION
==================================================

For every migrated top-level entity, report:

SOURCE RTDB PATH:
SOURCE RECORD COUNT:

TARGET FIRESTORE COLLECTION/PATH:
TARGET DOCUMENT COUNT:

STATUS:
PASS or FAIL

Verify that the final Firestore database contains the migrated data.

Randomly verify actual records and IDs from:

students
courses
instructors
enrollments
sections
payments
users

Verify important relationships such as:

- student → course
- student → section
- student → instructor
- enrollment → student/course/section
- payment → student/course
- course → instructor(s)
- notifications/messages → users

==================================================
APPLICATION CONVERSION
==================================================

After Firestore data is successfully migrated and verified:

1. Inspect the entire application.

2. Find all Firebase Realtime Database usage.

3. Replace the migrated application features with Cloud Firestore.

4. Update:
   - reads
   - writes
   - updates
   - deletes
   - queries
   - real-time listeners

5. Test all affected features.

6. Build and run the application.

7. Verify there are no critical Firebase or Firestore errors.

==================================================
FINAL SUCCESS CONDITION
==================================================

DO NOT say "MIGRATION COMPLETE" unless:

[ ] The actual Realtime Database data was read.
[ ] The final dataset structure was respected.
[ ] Realtime Database source data remains untouched.
[ ] Cloud Firestore contains actual migrated documents.
[ ] Firestore is not empty.
[ ] Record/document counts were verified.
[ ] Important IDs were preserved.
[ ] Relationships work correctly.
[ ] The application now reads migrated features from Firestore.
[ ] CRUD operations work.
[ ] The application builds successfully.
[ ] The application runs successfully.
[ ] No critical Firebase errors remain.

If any of these fail, report:

MIGRATION INCOMPLETE

Then list the exact failed:
- collection
- document
- record
- relationship
- source code file
- application feature

Do not claim success until every critical requirement is verified.