# Regression tests

From the repository root, run npm ci --ignore-scripts, then npm test.

party.test.cjs checks learning-skill awards, absence handling, and shared-data validation. access.test.cjs runs the SQL migration in PGlite PostgreSQL and checks invitation, approval, school isolation, revocation, and save conflicts.
