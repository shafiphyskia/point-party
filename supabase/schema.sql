-- Run once in a NEW Supabase project, through the SQL editor as postgres.
begin;
create table public.pp_admins(user_id uuid primary key references auth.users(id));
create table public.pp_schools(id uuid primary key default gen_random_uuid(),name text not null check(length(name) between 1 and 60));
create table public.pp_school_state(school_id uuid primary key references public.pp_schools(id),data jsonb not null default '{}'::jsonb,revision bigint not null default 0);
create table public.pp_memberships(
 id uuid primary key default gen_random_uuid(),school_id uuid not null references public.pp_schools(id),
 user_id uuid not null references auth.users(id),email text not null,
 status text not null default 'pending' check(status in ('pending','approved','rejected','revoked')),
 reviewed_by uuid references auth.users(id),reviewed_at timestamptz,unique(school_id,user_id)
);
create table public.pp_invitations(
 id uuid primary key default gen_random_uuid(),school_id uuid not null references public.pp_schools(id),email text not null,
 invited_by uuid not null references auth.users(id),expires_at timestamptz not null default now()+interval '7 days',
 redeemed_at timestamptz,unique(school_id,email)
);
create index pp_member_access on public.pp_memberships(user_id,school_id,status);
create function public.pp_is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.pp_admins where user_id=(select auth.uid()));
$$;
create function public.pp_has_school(p_school uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.pp_is_admin() or exists(select 1 from public.pp_memberships where school_id=p_school and user_id=(select auth.uid()) and status='approved');
$$;
alter table public.pp_admins enable row level security;
alter table public.pp_schools enable row level security;
alter table public.pp_school_state enable row level security;
alter table public.pp_memberships enable row level security;
alter table public.pp_invitations enable row level security;
revoke all on public.pp_admins,public.pp_schools,public.pp_school_state,public.pp_memberships,public.pp_invitations from anon,authenticated;
grant select on public.pp_schools,public.pp_school_state,public.pp_memberships,public.pp_invitations to authenticated;
create policy schools_read on public.pp_schools for select to authenticated using(public.pp_has_school(id));
create policy state_read on public.pp_school_state for select to authenticated using(public.pp_has_school(school_id));
create policy memberships_read on public.pp_memberships for select to authenticated using(public.pp_is_admin() or user_id=(select auth.uid()));
create policy invitations_read on public.pp_invitations for select to authenticated using(public.pp_is_admin() or invited_by=(select auth.uid()));

create function public.pp_create_school(p_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare school uuid;
begin
 if not public.pp_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 if length(trim(p_name)) not between 1 and 60 then raise exception 'INVALID_NAME'; end if;
 insert into public.pp_schools(name) values(trim(p_name)) returning id into school;
 insert into public.pp_school_state(school_id) values(school);
 return school;
end;
$$;
create function public.pp_invite(p_school uuid,p_email text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.pp_has_school(p_school) then raise exception 'SCHOOL_ACCESS_REQUIRED'; end if;
 if p_email is null or length(p_email)>254 or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'INVALID_EMAIL'; end if;
 insert into public.pp_invitations(school_id,email,invited_by) values(p_school,lower(trim(p_email)),auth.uid())
 on conflict(school_id,email) do update set invited_by=auth.uid(),expires_at=now()+interval '7 days',redeemed_at=null;
end;
$$;
create function public.pp_accept_invitations() returns void language plpgsql security definer set search_path='' as $$
declare email_verified text;
begin
 -- Match the server's confirmed email; never accept a client-supplied email or role.
 select lower(email) into email_verified from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if email_verified is null then raise exception 'VERIFIED_EMAIL_REQUIRED'; end if;
 insert into public.pp_memberships(school_id,user_id,email)
 select school_id,auth.uid(),email_verified from public.pp_invitations where email=email_verified and expires_at>now() and redeemed_at is null
 on conflict(school_id,user_id) do nothing;
 update public.pp_invitations set redeemed_at=now() where email=email_verified and expires_at>now() and redeemed_at is null;
end;
$$;
create function public.pp_review_member(p_member uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.pp_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 if p_status is null or p_status not in ('approved','rejected','revoked') then raise exception 'INVALID_STATUS'; end if;
 update public.pp_memberships set status=p_status,reviewed_by=auth.uid(),reviewed_at=now() where id=p_member;
 if not found then raise exception 'MEMBER_NOT_FOUND'; end if;
end;
$$;
create function public.pp_save_school(p_school uuid,p_revision bigint,p_data jsonb) returns bigint language plpgsql security definer set search_path='' as $$
declare next_revision bigint;
begin
 if not public.pp_has_school(p_school) then raise exception 'SCHOOL_ACCESS_REQUIRED'; end if;
 if p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>2000000 then raise exception 'INVALID_SCHOOL_DATA'; end if;
 update public.pp_school_state set data=p_data,revision=revision+1 where school_id=p_school and revision=p_revision returning revision into next_revision;
 if not found then raise exception 'SCHOOL_CONFLICT'; end if;
 return next_revision;
end;
$$;
-- PostgreSQL grants function execution to PUBLIC by default. Revoke it explicitly.
revoke all on function public.pp_is_admin(),public.pp_has_school(uuid),public.pp_create_school(text),public.pp_invite(uuid,text),public.pp_accept_invitations(),public.pp_review_member(uuid,text),public.pp_save_school(uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.pp_is_admin(),public.pp_has_school(uuid),public.pp_create_school(text),public.pp_invite(uuid,text),public.pp_accept_invitations(),public.pp_review_member(uuid,text),public.pp_save_school(uuid,bigint,jsonb) to authenticated;
commit;
