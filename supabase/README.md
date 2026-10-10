# Online school access

Run schema.sql, platform.sql, materials.sql, then permissions.sql in a Supabase
project you can administer. Apply permissions.sql last, including after later
reruns of the older migrations. Follow the root README to configure email links
or optional codes, production SMTP, allowed redirect URLs, the publishable key,
and the verified global admin.

Teachers require an invitation and global admin approval. Database rules limit them to approved schools.

Family links expose one child through a restricted RPC, never the full school
state. Parent links are read-only. Student links submit published assignments
and quizzes. platform.sql contains the verified owner-email bootstrap, linked
seat protection, submission grading, and revocation rules. Both migrations are
transactional. Back up an existing production database before applying changes.

permissions.sql adds five per-school membership permissions. Existing approval
status and explicitly configured permissions are preserved. If the permissions
column is new, only points defaults to enabled; activities, materials, roster,
and invitations default to disabled. Only a verified global administrator may
set these values. Setting permissions does not approve a pending or revoked
membership, create accounts, send emails, or grant an administrator role.

School JSON saves compare changed domains on the server, including direct RPC
attempts. Activities covers teams, dice picks, mystery boxes, saved game links,
lessons, grades, announcements, and quiz results. Points covers student/team
points, logs, imports, weekly totals, and quiz results; screen quizzes therefore
need both activities and points. Materials covers shared plans/resources and
suggestions plus private uploads. Roster covers names/seats, absence and
attendance records, and unrecognized state keys. Creating/removing a class can
affect multiple domains; grant those deliberately or let the administrator do
it. Invitation permission covers co-teacher and family invitations/revocation;
approval and permission assignment remain administrator-only.

Revision conflict checks, family linked-seat safeguards, approved-school RLS,
and private file reads remain enforced. Revocation prevents every capability.
The UI permission panel is a convenience; PostgreSQL is the authority.
