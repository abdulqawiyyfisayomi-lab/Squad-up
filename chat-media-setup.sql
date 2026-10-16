-- Run once in Supabase SQL Editor before uploading messages.html.
begin;
alter table public.direct_messages add column if not exists attachment jsonb;
alter table public.direct_messages drop constraint if exists direct_messages_body_check;
alter table public.direct_messages add constraint direct_messages_body_check
 check (char_length(body) <= 300 and (char_length(trim(body)) > 0 or attachment is not null));
alter table public.direct_messages drop constraint if exists direct_messages_attachment_check;
alter table public.direct_messages add constraint direct_messages_attachment_check check (
 attachment is null or (
  jsonb_typeof(attachment) = 'object'
  and coalesce(attachment->>'type','') in ('image','audio')
  and coalesce(length(attachment->>'dataUrl'),0) between 1 and 1450000
  and (
   (attachment->>'type' = 'image' and attachment->>'dataUrl' ~ '^data:image/(jpeg|png|webp);base64,')
   or (attachment->>'type' = 'audio' and attachment->>'dataUrl' ~ '^data:audio/(webm|ogg|mp4|mpeg)[^,]*;base64,')
  )
 )
);
commit;
