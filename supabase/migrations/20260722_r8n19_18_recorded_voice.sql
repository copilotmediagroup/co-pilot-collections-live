-- R8N19.18 Recorded Voice Messages

alter table public.voice_broadcast_campaigns
  add column if not exists message_type text not null default 'text',
  add column if not exists live_audio_url text;

alter table public.voice_broadcast_settings
  add column if not exists message_type text not null default 'text',
  add column if not exists live_audio_url text;

do $$
begin
  if not exists (select 1 from storage.buckets where id = 'voice-broadcast-audio') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('voice-broadcast-audio','voice-broadcast-audio',true,10485760,array['audio/wav','audio/mpeg','audio/mp3']);
  else
    update storage.buckets set public=true,file_size_limit=10485760,allowed_mime_types=array['audio/wav','audio/mpeg','audio/mp3'] where id='voice-broadcast-audio';
  end if;
end $$;

drop policy if exists "voice broadcast audio authenticated upload" on storage.objects;
create policy "voice broadcast audio authenticated upload" on storage.objects for insert to authenticated with check (bucket_id='voice-broadcast-audio');

drop policy if exists "voice broadcast audio authenticated update" on storage.objects;
create policy "voice broadcast audio authenticated update" on storage.objects for update to authenticated using (bucket_id='voice-broadcast-audio') with check (bucket_id='voice-broadcast-audio');

drop policy if exists "voice broadcast audio authenticated delete" on storage.objects;
create policy "voice broadcast audio authenticated delete" on storage.objects for delete to authenticated using (bucket_id='voice-broadcast-audio');

select column_name,data_type from information_schema.columns where table_schema='public' and table_name='voice_broadcast_campaigns' and column_name in ('message_type','live_audio_url') order by column_name;
