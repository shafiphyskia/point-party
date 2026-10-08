# Class materials

Each online school has a shared teacher hub with lesson plans, an ordered lesson sequence,
resource attachments, and co-teacher suggestions. Plans are scoped to a class; resources
can be class-specific or shared across classes. Refresh reloads the latest online school;
existing revision checks reject simultaneous stale writes.

PPT/PPTX, PDF, DOCX, images, MP3, MP4 and text/CSV uploads go to the private `pp-materials`
Supabase bucket. Apply `supabase/materials.sql` before publishing. Files are 25 MB maximum,
kept under the school UUID, and only existing approved school teachers/admins can read or
upload. File contents never enter the public GitHub repository. Library entries hold paths,
not signed/public links. Download requires current authentication. Archived files are retained.

YouTube/Vimeo links play on screen. PowerPoint files download for PowerPoint; Canva and
Google Slides links open the web presentation. External game/Padlet links open on their own
sites and can be displayed as QR codes. The hub includes Gimkit, Wordwall, Padlet, Blooket,
Kahoot, Wayground, Baamboozle, Flippity, PhET and Wheel of Names.

The built-in screen quiz uses existing class quizzes and adds correct-answer points once
per seat/question/game, recording the source. Absent seats are excluded. It is a teacher-run
screen activity, not an anonymous student response service. External reports require a
teacher export/paste and review; awards are calculated automatically after matching seats.
Exact duplicate report awards in the same class/day/session label are blocked for the last
500 imports. New rounds should have distinct session labels. Padlet participation is reviewed
by the teacher; posts alone are not a scored game report.

The lesson structure helper is deterministic, free and does not call an AI provider. No agent
receives student data or hidden access. Production co-teacher sign-in still requires SMTP.

Validation: `npm test` plus live plan,
file upload/download, video/QR, quiz points and reload checks. Do not leave test awards in
the real student roster.
