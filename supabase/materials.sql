-- Private teacher material files. Apply after schema.sql and platform.sql.
-- Reuses existing school approvals; no anonymous or family file access.
begin;
insert into storage.buckets(id,name,public,file_size_limit)
values('pp-materials','pp-materials',false,26214400)
on conflict(id) do update set public=false,file_size_limit=26214400;

create or replace function public.pp_material_school(p_path text) returns uuid
language sql immutable set search_path='' as $$
 select case when split_part(p_path,'/',1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 then split_part(p_path,'/',1)::uuid else null end;
$$;
revoke all on function public.pp_material_school(text) from public,anon;
grant execute on function public.pp_material_school(text) to authenticated;

drop policy if exists pp_materials_read on storage.objects;
create policy pp_materials_read on storage.objects for select to authenticated
using(bucket_id='pp-materials' and public.pp_material_school(name) is not null
 and public.pp_has_school(public.pp_material_school(name)));
drop policy if exists pp_materials_upload on storage.objects;
create policy pp_materials_upload on storage.objects for insert to authenticated
with check(bucket_id='pp-materials' and public.pp_material_school(name) is not null
 and public.pp_has_school(public.pp_material_school(name))
 and name ~* '^[0-9a-f-]{36}/[0-9a-f-]{36}/[A-Za-z0-9._-]+\.(pptx?|pdf|docx|png|jpe?g|webp|mp3|mp4|txt|csv)$');
-- Archiving changes the library entry. Files are retained; no browser overwrite/delete policy.
commit;
