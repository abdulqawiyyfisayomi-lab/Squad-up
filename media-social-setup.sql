begin;
create table if not exists public.squad_gameplay_posts(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,
 game text not null check(char_length(game) between 1 and 80),caption text not null default '' check(char_length(caption)<=300),
 storage_path text not null,created_at timestamptz not null default now());
create index if not exists squad_gameplay_posts_recent on public.squad_gameplay_posts(created_at desc);
alter table public.squad_gameplay_posts enable row level security;
grant select,insert,delete on public.squad_gameplay_posts to authenticated;
drop policy if exists "View gameplay" on public.squad_gameplay_posts;
create policy "View gameplay" on public.squad_gameplay_posts for select to authenticated using(true);
drop policy if exists "Post own gameplay" on public.squad_gameplay_posts;
create policy "Post own gameplay" on public.squad_gameplay_posts for insert to authenticated with check(user_id=auth.uid() and split_part(storage_path,'/',1)='gameplay' and split_part(storage_path,'/',2)=auth.uid()::text);
drop policy if exists "Remove own gameplay" on public.squad_gameplay_posts;
create policy "Remove own gameplay" on public.squad_gameplay_posts for delete to authenticated using(user_id=auth.uid());
create table if not exists public.squad_post_reactions(
 user_id uuid not null references public.profiles(id) on delete cascade,target_kind text not null check(target_kind in ('request','gameplay')),
 target_id text not null,reaction text not null check(reaction in ('like','repost')),created_at timestamptz not null default now(),primary key(user_id,target_kind,target_id,reaction));
create index if not exists squad_post_reactions_target on public.squad_post_reactions(target_kind,target_id,reaction);
alter table public.squad_post_reactions enable row level security;grant select,insert,delete on public.squad_post_reactions to authenticated;
drop policy if exists "View reactions" on public.squad_post_reactions;
create policy "View reactions" on public.squad_post_reactions for select to authenticated using(true);
drop policy if exists "React as yourself" on public.squad_post_reactions;
create policy "React as yourself" on public.squad_post_reactions for insert to authenticated with check(user_id=auth.uid() and (
 (target_kind='request' and exists(select 1 from public.squad_requests where id=target_id)) or
 (target_kind='gameplay' and exists(select 1 from public.squad_gameplay_posts where id::text=target_id))));
drop policy if exists "Remove own reaction" on public.squad_post_reactions;
create policy "Remove own reaction" on public.squad_post_reactions for delete to authenticated using(user_id=auth.uid());
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('squad-media','squad-media',false,52428800,array['video/mp4','video/webm','video/quicktime']) on conflict(id) do nothing;
drop policy if exists "Upload own squad videos" on storage.objects;
create policy "Upload own squad videos" on storage.objects for insert to authenticated with check(bucket_id='squad-media' and (storage.foldername(name))[2]=auth.uid()::text and (
 ((storage.foldername(name))[1]='gameplay') or ((storage.foldername(name))[1]='dm' and (storage.foldername(name))[3]<>auth.uid()::text and exists(select 1 from public.profiles where id::text=(storage.foldername(name))[3]))));
drop policy if exists "Read permitted squad videos" on storage.objects;
create policy "Read permitted squad videos" on storage.objects for select to authenticated using(bucket_id='squad-media' and (
 (storage.foldername(name))[1]='gameplay' or ((storage.foldername(name))[1]='dm' and auth.uid()::text in ((storage.foldername(name))[2],(storage.foldername(name))[3]))));
drop policy if exists "Delete own squad videos" on storage.objects;
create policy "Delete own squad videos" on storage.objects for delete to authenticated using(bucket_id='squad-media' and (storage.foldername(name))[2]=auth.uid()::text);
alter table public.direct_messages add column if not exists attachment jsonb;
alter table public.direct_messages drop constraint if exists direct_messages_body_check;
alter table public.direct_messages add constraint direct_messages_body_check check(char_length(body)<=300 and (char_length(trim(body))>0 or attachment is not null));
alter table public.direct_messages drop constraint if exists direct_messages_attachment_check;
alter table public.direct_messages add constraint direct_messages_attachment_check check(attachment is null or coalesce((
 jsonb_typeof(attachment)='object' and (
 (attachment->>'type' in ('image','audio') and coalesce(length(attachment->>'dataUrl'),0) between 1 and 1450000 and (
 (attachment->>'type'='image' and attachment->>'dataUrl' ~ '^data:image/(jpeg|png|webp);base64,') or
 (attachment->>'type'='audio' and attachment->>'dataUrl' ~ '^data:audio/(webm|ogg|mp4|mpeg)[^,]*;base64,'))) or
 (attachment->>'type'='video' and split_part(attachment->>'path','/',1)='dm' and split_part(attachment->>'path','/',2)=sender_id::text and split_part(attachment->>'path','/',3)=recipient_id::text)
 )),false));
create table if not exists public.squad_live_sessions(id uuid primary key default gen_random_uuid(),host_id uuid not null references public.profiles(id) on delete cascade,title text not null check(char_length(title) between 1 and 100),active boolean not null default true,last_seen timestamptz not null default now(),created_at timestamptz not null default now());
alter table public.squad_live_sessions enable row level security;grant select,insert,update on public.squad_live_sessions to authenticated;
drop policy if exists "View live sessions" on public.squad_live_sessions;
create policy "View live sessions" on public.squad_live_sessions for select to authenticated using(true);
drop policy if exists "Start own live" on public.squad_live_sessions;
create policy "Start own live" on public.squad_live_sessions for insert to authenticated with check(host_id=auth.uid());
drop policy if exists "Update own live" on public.squad_live_sessions;
create policy "Update own live" on public.squad_live_sessions for update to authenticated using(host_id=auth.uid()) with check(host_id=auth.uid());
create table if not exists public.squad_live_signals(id bigint generated always as identity primary key,session_id uuid not null references public.squad_live_sessions(id) on delete cascade,sender_id uuid not null references auth.users(id) on delete cascade,recipient_id uuid not null references auth.users(id) on delete cascade,payload jsonb not null check(octet_length(payload::text)<65536),created_at timestamptz not null default now());
create index if not exists squad_live_signals_inbox on public.squad_live_signals(session_id,recipient_id,id);
alter table public.squad_live_signals enable row level security;grant select,insert on public.squad_live_signals to authenticated;grant usage on sequence public.squad_live_signals_id_seq to authenticated;
drop policy if exists "Read own live signals" on public.squad_live_signals;
create policy "Read own live signals" on public.squad_live_signals for select to authenticated using(auth.uid() in(sender_id,recipient_id));
drop policy if exists "Send live signals" on public.squad_live_signals;
create policy "Send live signals" on public.squad_live_signals for insert to authenticated with check(sender_id=auth.uid() and sender_id<>recipient_id and exists(select 1 from public.squad_live_sessions l where l.id=session_id and l.active and l.last_seen>now()-interval '90 seconds' and ((l.host_id=recipient_id)or(l.host_id=sender_id))));
do $$ declare t text;begin foreach t in array array['squad_gameplay_posts','squad_post_reactions','squad_live_sessions','squad_live_signals'] loop
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then execute format('alter publication supabase_realtime add table public.%I',t);end if;
end loop;end $$;
create table if not exists public.squad_live_comments (
 id bigint generated always as identity primary key,
 session_id uuid not null references public.squad_live_sessions(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 body text not null check(char_length(trim(body)) between 1 and 300),
 created_at timestamptz not null default now()
);
create index if not exists squad_live_comments_session on public.squad_live_comments(session_id,id desc);
alter table public.squad_live_comments enable row level security;
grant select,insert on public.squad_live_comments to authenticated;
grant usage on sequence public.squad_live_comments_id_seq to authenticated;
drop policy if exists "Read live comments" on public.squad_live_comments;
create policy "Read live comments" on public.squad_live_comments for select to authenticated using(true);
drop policy if exists "Comment on active streams" on public.squad_live_comments;
create policy "Comment on active streams" on public.squad_live_comments for insert to authenticated with check(
 user_id=auth.uid() and exists(select 1 from public.squad_live_sessions l where l.id=session_id and l.active and l.last_seen>now()-interval '90 seconds')
);
do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='squad_live_comments') then
 alter publication supabase_realtime add table public.squad_live_comments;
 end if;
end $$;
commit;
