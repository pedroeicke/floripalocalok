
-- Run this in Supabase SQL Editor to add analytics column
alter table public.listings 
add column if not exists analytics jsonb default '{}'::jsonb;

-- Function to safely increment counters inside JSONB
create or replace function increment_listing_counter(listing_id uuid, counter_type text)
returns void
language plpgsql
security definer
as $$
declare
  key_name text;
begin
  if counter_type = 'view' then
    key_name := 'views';
  elsif counter_type = 'whatsapp' then
    key_name := 'whatsapp_clicks';
  elsif counter_type = 'email' then
    key_name := 'email_clicks';
  else
    return;
  end if;

  update public.listings 
  set analytics = jsonb_set(
    coalesce(analytics, '{}'::jsonb),
    array[key_name],
    (coalesce((analytics->>key_name)::int, 0) + 1)::text::jsonb
  )
  where id = listing_id;
end;
$$;
