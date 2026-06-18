
-- CHAT SELF-MESSAGE / BADGE CLEANUP
-- Optional but recommended. Marks old self-sent messages as read so they stop showing as unread.

update public.team_messages
set read_at = coalesce(read_at, now()),
    status = 'Read',
    updated_at = now()
where lower(coalesce(from_email,'')) = lower(coalesce(to_email,''));

notify pgrst, 'reload schema';
