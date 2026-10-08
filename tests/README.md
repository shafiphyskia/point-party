# Regression tests

From the repository root, run npm ci --ignore-scripts, then npm test.

party.test.cjs checks learning-skill awards, absence handling, and shared-data validation. access.test.cjs runs the SQL migration in PGlite PostgreSQL and checks invitation, approval, school isolation, revocation, and save conflicts.

portal.test.cjs checks score/attendance normalization, zero versus missing
grades, resource URLs, quiz parsing, and email error messages.
family-access.test.cjs runs both migrations against PostgreSQL roles, checking
verified owner identity, private child feeds, hidden quiz answers, server grading,
teacher review, linked roster protection, revoked access, and anonymous denial.
Real Supabase OTP delivery and browser account flows remain deployment checks.
