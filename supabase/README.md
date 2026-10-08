# Online school access

Run schema.sql, then platform.sql in a Supabase project you can administer. Follow the root README to configure email codes, production SMTP, the publishable key, and the verified global admin.

Teachers require an invitation and global admin approval. Database rules limit them to approved schools.

Family links expose one child through a restricted RPC, never the full school
state. Parent links are read-only. Student links submit published assignments
and quizzes. platform.sql contains the verified owner-email bootstrap, linked
seat protection, submission grading, and revocation rules. Both migrations are
transactional. Back up an existing production database before applying changes.
