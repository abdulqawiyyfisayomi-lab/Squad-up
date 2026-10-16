begin;
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
