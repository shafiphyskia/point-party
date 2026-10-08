-- Apply after schema.sql, as postgres. Safe to re-run this migration.
begin;
create table if not exists public.pp_owner_bootstrap(
 singleton boolean primary key default true check(singleton), email text not null
);
insert into public.pp_owner_bootstrap(singleton,email) values(true,'shafiphysika@gmail.com') on conflict do nothing;
alter table public.pp_owner_bootstrap enable row level security;
revoke all on public.pp_owner_bootstrap from public,anon,authenticated;
create or replace function public.pp_claim_owner() returns boolean language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from auth.users u join public.pp_owner_bootstrap b on lower(u.email)=b.email where u.id=auth.uid() and u.email_confirmed_at is not null) then return false; end if;
 insert into public.pp_admins(user_id) values(auth.uid()) on conflict do nothing;
 return true;
end;$$;

create table if not exists public.pp_family_invitations(
 id uuid primary key default gen_random_uuid(),school_id uuid not null references public.pp_schools(id),
 class_id text not null,seat integer not null check(seat between 1 and 60),email text not null,seat_name text not null default '',
 kind text not null check(kind in ('parent','student')),invited_by uuid not null references auth.users(id),
 expires_at timestamptz not null default now()+interval '7 days',redeemed_at timestamptz,
 unique(school_id,class_id,seat,email,kind)
);
alter table public.pp_family_invitations add column if not exists seat_name text not null default '';
create table if not exists public.pp_family_links(
 id uuid primary key default gen_random_uuid(),school_id uuid not null references public.pp_schools(id),
 class_id text not null,seat integer not null check(seat between 1 and 60),user_id uuid not null references auth.users(id),
 email text not null,kind text not null check(kind in ('parent','student')),active boolean not null default true,
 unique(school_id,class_id,seat,user_id,kind)
);
create table if not exists public.pp_submissions(
 id uuid primary key default gen_random_uuid(),school_id uuid not null references public.pp_schools(id),
 class_id text not null,seat integer not null,lesson_id text not null,user_id uuid not null references auth.users(id),
 body text not null default '',answers jsonb not null default '[]',submitted_at timestamptz not null default now(),
 score numeric,maximum numeric,feedback text not null default '',reviewed_by uuid references auth.users(id),reviewed_at timestamptz,
 unique(school_id,class_id,seat,lesson_id),check(length(body)<=8000),check(length(feedback)<=1000)
);
create index if not exists pp_family_user on public.pp_family_links(user_id,active);
alter table public.pp_family_invitations enable row level security;
alter table public.pp_family_links enable row level security;
alter table public.pp_submissions enable row level security;
revoke all on public.pp_family_invitations,public.pp_family_links,public.pp_submissions from public,anon,authenticated;
grant select on public.pp_family_invitations,public.pp_family_links,public.pp_submissions to authenticated;
drop policy if exists family_invites_read on public.pp_family_invitations;
create policy family_invites_read on public.pp_family_invitations for select to authenticated using(public.pp_has_school(school_id));
drop policy if exists family_links_read on public.pp_family_links;
create policy family_links_read on public.pp_family_links for select to authenticated using(public.pp_has_school(school_id) or (user_id=auth.uid() and active));
drop policy if exists submissions_read on public.pp_submissions;
create policy submissions_read on public.pp_submissions for select to authenticated using(public.pp_has_school(school_id));

create or replace function public.pp_invite_family(p_school uuid,p_class text,p_seat integer,p_email text,p_kind text) returns void language plpgsql security definer set search_path='' as $$
declare school_data jsonb;
begin
 if not public.pp_has_school(p_school) then raise exception 'SCHOOL_ACCESS_REQUIRED';end if;
 if p_email is null or length(p_email)>254 or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or p_kind is null or p_kind not in ('parent','student') or p_seat is null or p_seat not between 1 and 60 then raise exception 'INVALID_INVITATION';end if;
 select data into school_data from public.pp_school_state where school_id=p_school;
 if coalesce(school_data#>>array['roster',p_class,'names',(p_seat-1)::text],'')='' then raise exception 'STUDENT_REQUIRED';end if;
 insert into public.pp_family_invitations(school_id,class_id,seat,email,kind,invited_by,seat_name) values(p_school,p_class,p_seat,lower(trim(p_email)),p_kind,auth.uid(),school_data#>>array['roster',p_class,'names',(p_seat-1)::text])
 on conflict(school_id,class_id,seat,email,kind) do update set invited_by=auth.uid(),expires_at=now()+interval '7 days',redeemed_at=null,seat_name=excluded.seat_name;
end;$$;
create or replace function public.pp_accept_family() returns void language plpgsql security definer set search_path='' as $$
declare verified text;
begin
 select lower(email) into verified from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if verified is null then raise exception 'VERIFIED_EMAIL_REQUIRED';end if;
 insert into public.pp_family_links(school_id,class_id,seat,user_id,email,kind)
 select i.school_id,i.class_id,i.seat,auth.uid(),verified,i.kind from public.pp_family_invitations i join public.pp_school_state s on s.school_id=i.school_id
 where i.email=verified and i.expires_at>now() and i.redeemed_at is null and i.seat_name=s.data#>>array['roster',i.class_id,'names',(i.seat-1)::text]
 on conflict(school_id,class_id,seat,user_id,kind) do update set active=true;
 update public.pp_family_invitations set redeemed_at=now() where email=verified and expires_at>now() and redeemed_at is null;
end;$$;
create or replace function public.pp_revoke_family(p_link uuid) returns void language plpgsql security definer set search_path='' as $$
declare link public.pp_family_links;
begin
 select * into link from public.pp_family_links where id=p_link;
 if not found or not public.pp_has_school(link.school_id) then raise exception 'SCHOOL_ACCESS_REQUIRED';end if;
 update public.pp_family_links set active=false where id=p_link;
end;$$;

create or replace function public.pp_family_feed(p_link uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare link public.pp_family_links; school_data jsonb; materials jsonb; grades jsonb; days jsonb; work jsonb; news jsonb;
begin
 select * into link from public.pp_family_links where id=p_link and user_id=auth.uid() and active;
 if not found then raise exception 'LINK_REQUIRED';end if;
 select data into school_data from public.pp_school_state where school_id=link.school_id;
 select coalesce(jsonb_agg((l-'questions')||jsonb_build_object('questions',coalesce((select jsonb_agg(q-'answer') from jsonb_array_elements(coalesce(l->'questions','[]'::jsonb)) q),'[]'::jsonb))),'[]'::jsonb) into materials
 from jsonb_array_elements(coalesce(school_data#>'{portal,lessons}','[]'::jsonb)) l where l->>'classId'=link.class_id and l->>'published'='true';
 select coalesce(jsonb_agg(a||jsonb_build_object('grade',school_data#>array['portal','scores',a->>'id',link.seat::text])),'[]'::jsonb) into grades
 from jsonb_array_elements(coalesce(school_data#>'{portal,assessments}','[]'::jsonb)) a where a->>'classId'=link.class_id;
 select coalesce(jsonb_agg(jsonb_build_object('date',d.key,'status',d.value#>array[link.class_id,link.seat::text]) order by d.key desc),'[]'::jsonb) into days
 from jsonb_each(coalesce(school_data#>'{portal,attendance}','{}'::jsonb)) d where d.value#>array[link.class_id,link.seat::text] is not null;
 select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'lesson_id',s.lesson_id,'body',s.body,'submitted_at',s.submitted_at,'score',s.score,'maximum',s.maximum,'feedback',s.feedback,'reviewed_at',s.reviewed_at) order by s.submitted_at desc),'[]'::jsonb) into work
 from public.pp_submissions s where s.school_id=link.school_id and s.class_id=link.class_id and s.seat=link.seat;
 select coalesce(jsonb_agg(n),'[]'::jsonb) into news from jsonb_array_elements(coalesce(school_data#>'{portal,announcements}','[]'::jsonb)) n where n->>'classId'=link.class_id;
 return jsonb_build_object('id',link.id,'kind',link.kind,'classId',link.class_id,'seat',link.seat,
 'school',(select name from public.pp_schools where id=link.school_id),'name',school_data#>array['roster',link.class_id,'names',(link.seat-1)::text],
 'points',coalesce(school_data#>array['classes',link.class_id,'pts',link.seat::text],'0'::jsonb),
 'history',coalesce(school_data#>array['classes',link.class_id,'log',link.seat::text],'[]'::jsonb),
 'lessons',materials,'assessments',grades,'attendance',days,'submissions',work,'announcements',news);
end;$$;

create or replace function public.pp_submit_work(p_link uuid,p_lesson text,p_body text,p_answers jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare link public.pp_family_links; lesson jsonb; question jsonb; i integer:=0; earned numeric:=null; total numeric:=null; result public.pp_submissions;
begin
 select * into link from public.pp_family_links where id=p_link and user_id=auth.uid() and active;
 if not found then raise exception 'LINK_REQUIRED';end if;
 if link.kind<>'student' then raise exception 'STUDENT_REQUIRED';end if;
 if p_body is null or length(p_body)>8000 then raise exception 'INVALID_BODY';end if;
 select l into lesson from public.pp_school_state s cross join lateral jsonb_array_elements(coalesce(s.data#>'{portal,lessons}','[]'::jsonb)) l
 where s.school_id=link.school_id and l->>'id'=p_lesson and l->>'classId'=link.class_id and l->>'published'='true';
 if lesson is null or coalesce(lesson->>'kind','') not in ('quiz','assignment') then raise exception 'LESSON_REQUIRED';end if;
 if exists(select 1 from public.pp_submissions where school_id=link.school_id and class_id=link.class_id and seat=link.seat and lesson_id=p_lesson and reviewed_at is not null) then raise exception 'WORK_ALREADY_REVIEWED';end if;
 if lesson->>'kind'='quiz' then
  if p_answers is null or jsonb_typeof(p_answers)<>'array' or jsonb_array_length(p_answers)<>jsonb_array_length(lesson->'questions') or jsonb_array_length(p_answers) not between 1 and 30 then raise exception 'INVALID_ANSWERS';end if;
  earned:=0;total:=jsonb_array_length(p_answers);
  for question in select * from jsonb_array_elements(lesson->'questions') loop
   if (p_answers->>i) is null or (p_answers->>i) !~ '^[0-5]$' or (p_answers->>i)::integer>=jsonb_array_length(question->'choices') then raise exception 'INVALID_ANSWERS';end if;
   if (p_answers->>i)::integer=(question->>'answer')::integer then earned:=earned+1;end if;
   i:=i+1;
  end loop;
 else
  if length(trim(p_body))=0 then raise exception 'INVALID_BODY';end if;
  p_answers:='[]'::jsonb;
 end if;
 insert into public.pp_submissions(school_id,class_id,seat,lesson_id,user_id,body,answers,score,maximum,reviewed_at)
 values(link.school_id,link.class_id,link.seat,p_lesson,auth.uid(),p_body,p_answers,earned,total,case when earned is null then null else now() end)
 on conflict(school_id,class_id,seat,lesson_id) do update set body=excluded.body,answers=excluded.answers,submitted_at=now(),user_id=excluded.user_id
 where public.pp_submissions.reviewed_at is null
 returning * into result;
 if not found then raise exception 'WORK_ALREADY_REVIEWED';end if;
 return jsonb_build_object('id',result.id,'score',result.score,'maximum',result.maximum);
end;$$;
create or replace function public.pp_review_work(p_submission uuid,p_score numeric,p_maximum numeric,p_feedback text) returns void language plpgsql security definer set search_path='' as $$
declare submission public.pp_submissions;
begin
 select * into submission from public.pp_submissions where id=p_submission;
 if not found or not public.pp_has_school(submission.school_id) then raise exception 'SCHOOL_ACCESS_REQUIRED';end if;
 if p_maximum is null or p_score is null or p_score<0 or p_maximum<=0 or p_maximum>10000 or p_score>p_maximum or p_feedback is null or length(p_feedback)>1000 then raise exception 'INVALID_GRADE';end if;
 update public.pp_submissions set score=p_score,maximum=p_maximum,feedback=p_feedback,reviewed_by=auth.uid(),reviewed_at=now() where id=p_submission;
end;$$;
-- Linked seats cannot silently become a different child when a roster is edited.
create or replace function public.pp_save_school(p_school uuid,p_revision bigint,p_data jsonb) returns bigint language plpgsql security definer set search_path='' as $$
declare next_revision bigint;old_data jsonb;
begin
 if not public.pp_has_school(p_school) then raise exception 'SCHOOL_ACCESS_REQUIRED';end if;
 if p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>2000000 then raise exception 'INVALID_SCHOOL_DATA';end if;
 select data into old_data from public.pp_school_state where school_id=p_school for update;
 if exists(select 1 from public.pp_family_links l where l.school_id=p_school and l.active and (old_data#>array['roster',l.class_id,'names',(l.seat-1)::text]) is distinct from (p_data#>array['roster',l.class_id,'names',(l.seat-1)::text])) then raise exception 'ROSTER_LINKED';end if;
 update public.pp_school_state set data=p_data,revision=revision+1 where school_id=p_school and revision=p_revision returning revision into next_revision;
 if not found then raise exception 'SCHOOL_CONFLICT';end if;
 return next_revision;
end;$$;
revoke all on function public.pp_claim_owner(),public.pp_invite_family(uuid,text,integer,text,text),public.pp_accept_family(),public.pp_revoke_family(uuid),public.pp_family_feed(uuid),public.pp_submit_work(uuid,text,text,jsonb),public.pp_review_work(uuid,numeric,numeric,text) from public,anon,authenticated;
grant execute on function public.pp_claim_owner(),public.pp_invite_family(uuid,text,integer,text,text),public.pp_accept_family(),public.pp_revoke_family(uuid),public.pp_family_feed(uuid),public.pp_submit_work(uuid,text,text,jsonb),public.pp_review_work(uuid,numeric,numeric,text) to authenticated;
commit;
