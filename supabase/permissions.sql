-- Apply LAST: schema.sql -> platform.sql -> materials.sql -> permissions.sql.
-- Safe to rerun. Existing teachers receive only point-awarding permission.
begin;
alter table public.pp_memberships add column if not exists permissions jsonb not null
 default '{"points":true,"activities":false,"materials":false,"roster":false,"invite":false}'::jsonb;

create or replace function public.pp_permissions_version() returns integer
language sql stable security definer set search_path='' as $$select 1$$;
create or replace function public.pp_can_school(p_school uuid,p_permission text) returns boolean
language sql stable security definer set search_path='' as $$
 select p_permission in ('points','activities','materials','roster','invite') and
 (public.pp_is_admin() or exists(select 1 from public.pp_memberships m where m.school_id=p_school
  and m.user_id=auth.uid() and m.status='approved' and m.permissions->p_permission='true'::jsonb));
$$;
create or replace function public.pp_set_member_permissions(p_member uuid,p_permissions jsonb) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.pp_is_admin() then raise exception 'ADMIN_REQUIRED';end if;
 if p_permissions is null or jsonb_typeof(p_permissions)<>'object' then raise exception 'INVALID_PERMISSIONS';end if;
 if exists(select 1 from jsonb_each(p_permissions) x where x.key not in ('points','activities','materials','roster','invite') or jsonb_typeof(x.value)<>'boolean') then raise exception 'INVALID_PERMISSIONS';end if;
 update public.pp_memberships set permissions=jsonb_build_object(
  'points',coalesce(p_permissions->'points','false'::jsonb),'activities',coalesce(p_permissions->'activities','false'::jsonb),
  'materials',coalesce(p_permissions->'materials','false'::jsonb),'roster',coalesce(p_permissions->'roster','false'::jsonb),
  'invite',coalesce(p_permissions->'invite','false'::jsonb)),reviewed_by=auth.uid(),reviewed_at=now() where id=p_member;
 if not found then raise exception 'MEMBER_NOT_FOUND';end if;
end;$$;

-- Compare saved JSON by capability. UI preferences do not confer privileges.
-- Missing optional containers and their empty defaults are equivalent.
create or replace function public.pp_school_domain(p_data jsonb,p_domain text) returns jsonb
language plpgsql immutable set search_path='' as $$
declare result jsonb:='{}'; classes jsonb:='{}'; c record; fields text[]; k text; val jsonb; defaults jsonb;default_teams jsonb;team_count integer;
begin
 if p_domain='points' then
  fields:=array['pts','tscore','weekBase','weekStart','log','imports'];
  defaults:='{"pts":{},"tscore":[0,0,0,0],"weekBase":{},"weekStart":null,"log":{},"imports":[]}';
  result:=jsonb_build_object('results',coalesce(p_data#>'{materials,results}','[]'::jsonb),
   'gameImportReceipts',coalesce(p_data->'gameImportReceipts','[]'::jsonb));
 elsif p_domain='activities' then
  fields:=array['teamCount','teams','picked','last','active','goal','reward','boxes','msg'];
  defaults:='{"teamCount":4,"teams":null,"picked":[],"last":null,"active":0,"goal":300,"reward":"Game day!","boxes":null,"msg":""}';
  result:=jsonb_build_object('links',coalesce(p_data->'links','[]'::jsonb),
   'portal',(coalesce(p_data->'portal','{}'::jsonb)-'attendance')||jsonb_build_object(
    'lessons',coalesce(p_data#>'{portal,lessons}','[]'::jsonb),'assessments',coalesce(p_data#>'{portal,assessments}','[]'::jsonb),
    'scores',coalesce(p_data#>'{portal,scores}','{}'::jsonb),'announcements',coalesce(p_data#>'{portal,announcements}','[]'::jsonb)),
   'results',coalesce(p_data#>'{materials,results}','[]'::jsonb));
 elsif p_domain='materials' then
  return (coalesce(p_data->'materials','{}'::jsonb)-'results')||jsonb_build_object(
   'plans',coalesce(p_data#>'{materials,plans}','[]'::jsonb),'resources',coalesce(p_data#>'{materials,resources}','[]'::jsonb),
   'suggestions',coalesce(p_data#>'{materials,suggestions}','[]'::jsonb));
 elsif p_domain='roster' then
  fields:=array['absent'];defaults:='{"absent":{}}';
  result:=jsonb_build_object('roster',coalesce(p_data->'roster','{}'::jsonb),
   'attendance',coalesce(p_data#>'{portal,attendance}','{}'::jsonb),
   'extra',p_data-array['roster','classes','portal','materials','links','ui','gameImportReceipts']);
 else raise exception 'INVALID_PERMISSION';end if;
 for c in select * from jsonb_each(coalesce(p_data->'classes','{}'::jsonb)) loop
  val:='{}';
  foreach k in array fields loop val:=val||jsonb_build_object(k,coalesce(c.value->k,defaults->k));end loop;
  -- C() initializes deterministic teams when the point board first opens.
  -- Treat that precise default as equivalent to null, while detecting any shuffle.
  if p_domain='activities' and (val->'teams' is null or val->'teams'='null'::jsonb) then
   if coalesce(val->>'teamCount','4') not in ('2','3','4','5','6') then raise exception 'INVALID_SCHOOL_DATA';end if;
   team_count:=coalesce((val->>'teamCount')::integer,4);
   with seats as (
    select ord::integer seat,row_number() over(order by ord)-1 position,count(*) over() total
    from jsonb_array_elements(coalesce(p_data#>array['roster',c.key,'names'],'[]'::jsonb)) with ordinality n(name,ord)
    where name<>'null'::jsonb and name<>'""'::jsonb
   ), teams as (
    select t,coalesce((select jsonb_agg(s.seat order by s.seat) from seats s where floor(s.position::numeric*team_count/nullif(s.total,0))=t),'[]'::jsonb) members
    from generate_series(0,team_count-1) t
   ) select jsonb_agg(members order by t) into default_teams from teams;
   val:=val||jsonb_build_object('teams',default_teams);
  end if;
  if p_domain='roster' then val:=val||jsonb_build_object('extra',c.value-array['absent','pts','tscore','weekBase','weekStart','log','imports','teamCount','teams','picked','last','active','goal','reward','boxes','msg']);end if;
  classes:=classes||jsonb_build_object(c.key,val);
 end loop;
 return result||jsonb_build_object('classes',classes);
end;$$;

create or replace function public.pp_save_school(p_school uuid,p_revision bigint,p_data jsonb) returns bigint
language plpgsql security definer set search_path='' as $$
declare next_revision bigint;old_data jsonb;old_revision bigint;capability text;
begin
 if not public.pp_has_school(p_school) then raise exception 'SCHOOL_ACCESS_REQUIRED';end if;
 if p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>2000000 then raise exception 'INVALID_SCHOOL_DATA';end if;
 if exists(select 1 from jsonb_each(p_data) x where x.key in ('roster','classes','portal','materials','ui') and jsonb_typeof(x.value)<>'object') then raise exception 'INVALID_SCHOOL_DATA';end if;
 if exists(select 1 from jsonb_each(coalesce(p_data->'classes','{}'::jsonb)) x where jsonb_typeof(x.value)<>'object') then raise exception 'INVALID_SCHOOL_DATA';end if;
 select data,revision into old_data,old_revision from public.pp_school_state where school_id=p_school for update;
 if not found or old_revision is distinct from p_revision then raise exception 'SCHOOL_CONFLICT';end if;
 if not public.pp_is_admin() then
  foreach capability in array array['points','activities','materials','roster'] loop
   if public.pp_school_domain(old_data,capability) is distinct from public.pp_school_domain(p_data,capability)
    and not public.pp_can_school(p_school,capability) then raise exception 'PERMISSION_%_REQUIRED',upper(capability);end if;
  end loop;
 end if;
 if exists(select 1 from public.pp_family_links l where l.school_id=p_school and l.active and
  (old_data#>array['roster',l.class_id,'names',(l.seat-1)::text]) is distinct from (p_data#>array['roster',l.class_id,'names',(l.seat-1)::text])) then raise exception 'ROSTER_LINKED';end if;
 update public.pp_school_state set data=p_data,revision=revision+1 where school_id=p_school returning revision into next_revision;
 return next_revision;
end;$$;

create or replace function public.pp_invite(p_school uuid,p_email text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.pp_can_school(p_school,'invite') then raise exception 'PERMISSION_INVITE_REQUIRED';end if;
 if p_email is null or length(p_email)>254 or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'INVALID_EMAIL';end if;
 insert into public.pp_invitations(school_id,email,invited_by) values(p_school,lower(trim(p_email)),auth.uid())
 on conflict(school_id,email) do update set invited_by=auth.uid(),expires_at=now()+interval '7 days',redeemed_at=null;
end;$$;

-- Preserve the verified-family validation and linked-seat safeguards from platform.sql.
-- Patch the authorization checks only; fail this transaction if prerequisites are missing.
do $$declare definition text;
begin
 select pg_get_functiondef('public.pp_invite_family(uuid,text,integer,text,text)'::regprocedure) into definition;
 definition:=replace(definition,'not public.pp_has_school(p_school)','not public.pp_can_school(p_school,''invite'')');
 definition:=replace(definition,'''SCHOOL_ACCESS_REQUIRED''','''PERMISSION_INVITE_REQUIRED''');
 if position('public.pp_can_school(p_school, ''invite'')' in definition)=0 and position('public.pp_can_school(p_school,''invite'')' in definition)=0 then raise exception 'UNSUPPORTED_FAMILY_INVITE_DEFINITION';end if;execute definition;
 select pg_get_functiondef('public.pp_revoke_family(uuid)'::regprocedure) into definition;
 definition:=replace(definition,'not public.pp_has_school(link.school_id)','not public.pp_can_school(link.school_id,''invite'')');
 definition:=replace(definition,'''SCHOOL_ACCESS_REQUIRED''','''PERMISSION_INVITE_REQUIRED''');
 if position('pp_can_school(link.school_id' in definition)=0 then raise exception 'UNSUPPORTED_FAMILY_REVOKE_DEFINITION';end if;execute definition;
 select pg_get_functiondef('public.pp_review_work(uuid,numeric,numeric,text)'::regprocedure) into definition;
 definition:=replace(definition,'not public.pp_has_school(submission.school_id)','not public.pp_can_school(submission.school_id,''activities'')');
 definition:=replace(definition,'''SCHOOL_ACCESS_REQUIRED''','''PERMISSION_ACTIVITIES_REQUIRED''');
 if position('pp_can_school(submission.school_id' in definition)=0 then raise exception 'UNSUPPORTED_REVIEW_DEFINITION';end if;execute definition;
end;$$;

drop policy if exists pp_materials_upload on storage.objects;
create policy pp_materials_upload on storage.objects for insert to authenticated
with check(bucket_id='pp-materials' and public.pp_material_school(name) is not null
 and public.pp_can_school(public.pp_material_school(name),'materials')
 and name ~* '^[0-9a-f-]{36}/[0-9a-f-]{36}/[A-Za-z0-9._-]+\.(pptx?|pdf|docx|png|jpe?g|webp|mp3|mp4|txt|csv)$');

revoke all on function public.pp_permissions_version(),public.pp_can_school(uuid,text),public.pp_set_member_permissions(uuid,jsonb),public.pp_school_domain(jsonb,text) from public,anon,authenticated;
grant execute on function public.pp_permissions_version(),public.pp_can_school(uuid,text),public.pp_set_member_permissions(uuid,jsonb) to authenticated;
-- The existing save/invite/family RPCs retain their restricted authenticated grants.
commit;
