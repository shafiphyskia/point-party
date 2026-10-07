# Point Party

A colorful classroom point board with growing pets, 14 learning skills, teams,
mystery boxes, goals, game imports, and a separate workspace for each school.

## Device workspaces

The site works immediately without an account. Existing `pointparty-v1` classes
stay in **My first school**. Use **Schools** to rename it or add another school.
Each school has its own classes, points, links, teams, and records. Device
workspaces are organizational sections; they do not provide account security.
Backups contain the currently open school's classroom data. Keep a backup for
each school before clearing browser data or moving devices.

## Connect online teacher and admin accounts

Online login is disabled until a Supabase project is configured. No browser PIN,
role selector, or hidden button grants admin privileges.

1. Create a Supabase project and run `supabase/schema.sql` once in its SQL editor.
2. Enable email authentication and email sign-ups. Set the **Magic Link** email
   template to show `{{ .Token }}` so teachers can enter the OTP on the site.
   Set the site URL to `https://shafiphyskia.github.io/point-party/`. Configure
   production email delivery and the Auth email rate limits in Supabase.
3. Put the project URL and **publishable key** in `config.js`. Do not place a
   service-role key, password, or personal access token in this repository.
4. Sign in once with the intended global admin email. In the SQL editor, check
   the user's verified email and UUID, then designate that user:

   ```sql
   insert into public.pp_admins(user_id)
   select id from auth.users
   where email = 'YOUR_VERIFIED_ADMIN_EMAIL' and email_confirmed_at is not null;
   ```

5. Refresh approvals in **Teacher & admin**. The global admin can create schools.
   Open a school and add classes, or deliberately load that school's backup.
   Device workspaces are kept separately and are never automatically uploaded.
6. Create a co-teacher invitation for the school and their email. Share the site
   and sign-in instructions yourself; the invitation action records an invitation
   and does not send an email. Invitations expire in seven days. The invited
   teacher signs in and receives **pending** membership. The global admin approves
   or rejects the request. Approved teachers can invite partners to their own
   schools, but cannot approve them or open other schools.

Admin roles and school access are checked in PostgreSQL. Revocation blocks future
reads and writes. Only the global admin can access all schools. Sessions are kept
in memory, so a reload requires signing in again; cloud classroom data remains
on the server. Signing out returns to the device workspace.

School saves use a revision check. If another teacher saved first, the stale
save is rejected instead of overwriting their work. Download your unsaved backup,
reload the saved school, and reconcile your changes. This first version supports
shared school access but does not automatically merge simultaneous edits.

## Verification

```sh
npm ci --ignore-scripts
npm test
npm audit --audit-level=high
python -m http.server 8765 --bind 127.0.0.1
```

Tests use PGlite's PostgreSQL engine to exercise the actual SQL migration with
authenticated and anonymous roles, invitations, pending access, admin approval,
school isolation, direct-write denial, revocation, and conflicting revisions.
PGlite is a development dependency and is not loaded by the website. Production
email delivery and login must also be verified against your connected Supabase
project before using online classrooms.

Official references: [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security),
[email sign-in](https://supabase.com/docs/reference/javascript/auth-signinwithotp),
[OTP verification](https://supabase.com/docs/reference/javascript/auth-verifyotp).
