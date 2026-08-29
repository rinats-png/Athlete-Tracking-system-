-- =============================================================================
-- Storage-Buckets: PDF-Reports, Trainer-Logos, Avatare
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('reports',  'reports',  false, 26214400, array['application/pdf']),
  ('branding', 'branding', false,  2097152, array['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']),
  ('avatars',  'avatars',  true,   2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- Pfadkonvention: reports/{athlete_id}/{report_id}.pdf
create policy "reports_read_permitted" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'reports'
    and public.can_view_athlete(nullif(split_part(name, '/', 1), '')::uuid)
  );

create policy "reports_write_permitted" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'reports'
    and public.can_edit_athlete(nullif(split_part(name, '/', 1), '')::uuid)
    and public.has_entitlement((select auth.uid()), 'coach_pro')
  );

-- Pfadkonvention: branding/{coach_id}/logo.<ext>
create policy "branding_read_own_or_my_coach" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'branding'
    and (
      nullif(split_part(name, '/', 1), '')::uuid = (select auth.uid())
      or nullif(split_part(name, '/', 1), '')::uuid in (select public.my_coach_ids())
    )
  );

create policy "branding_write_own" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'branding'
    and nullif(split_part(name, '/', 1), '')::uuid = (select auth.uid())
  )
  with check (
    bucket_id = 'branding'
    and nullif(split_part(name, '/', 1), '')::uuid = (select auth.uid())
  );

-- Pfadkonvention: avatars/{user_id}.<ext>
create policy "avatars_public_read" on storage.objects
  for select to public using (bucket_id = 'avatars');

create policy "avatars_write_own" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'avatars'
    and nullif(split_part(name, '.', 1), '')::uuid = (select auth.uid())
  )
  with check (
    bucket_id = 'avatars'
    and nullif(split_part(name, '.', 1), '')::uuid = (select auth.uid())
  );
