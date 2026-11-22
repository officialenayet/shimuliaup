-- শিমুলিয়া সনদ ব্যবস্থাপনা: Supabase SQL Editor-এ একবার চালান।
-- Public page শুধু get_public_certificate() RPC দিয়ে প্রকাশিত ক্ষেত্র পায়।
-- anon role-কে certificates table-এ সরাসরি কোনো privilege দেওয়া হয় না।

create table if not exists public.certificate_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  share_code text unique,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  certificate_type text not null check (certificate_type in ('citizen_rafiq','citizen_saidul','warish')),
  certificate_number text not null default '',
  issued_on date,
  holder_name text not null default '',
  father_name text not null default '',
  mother_name text not null default '',
  current_address jsonb not null default '{}'::jsonb,
  permanent_address jsonb not null default '{}'::jsonb,
  ward text not null default '',
  national_id text not null default '',
  include_nid boolean not null default false,
  statement text not null default '',
  heirs jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft','published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint published_needs_share_code check (status <> 'published' or share_code is not null)
);

create index if not exists certificates_status_updated_idx
  on public.certificates (status, updated_at desc);

alter table public.certificate_admins enable row level security;
alter table public.certificates enable row level security;
grant usage on schema public to anon, authenticated;

-- নিরাপত্তা-নির্ধারক সহায়কটি শুধু ব্যক্তিগত অনুমোদন-তালিকা পড়ে; কোনো ক্লায়েন্ট ওই টেবিল সম্পাদনা করতে পারে না।
create or replace function public.is_certificate_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.certificate_admins a
    where a.user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_certificate_admin() from public;
grant execute on function public.is_certificate_admin() to authenticated;

-- লগ-ইন করা ব্যবহারকারীকেও certificate_admins তালিকায় স্পষ্টভাবে যুক্ত থাকতে হবে।
drop policy if exists "admins can read certificate records" on public.certificates;
create policy "admins can read certificate records"
  on public.certificates for select to authenticated
  using ((select public.is_certificate_admin()));

drop policy if exists "admins can create certificate records" on public.certificates;
create policy "admins can create certificate records"
  on public.certificates for insert to authenticated
  with check ((select public.is_certificate_admin()) and created_by = (select auth.uid()));

drop policy if exists "admins can update certificate records" on public.certificates;
create policy "admins can update certificate records"
  on public.certificates for update to authenticated
  using ((select public.is_certificate_admin()))
  with check ((select public.is_certificate_admin()));

drop policy if exists "admins can delete certificate records" on public.certificates;
create policy "admins can delete certificate records"
  on public.certificates for delete to authenticated
  using ((select public.is_certificate_admin()));

revoke all on table public.certificate_admins from anon, authenticated;
revoke all on table public.certificates from anon, authenticated;
grant select, insert, update, delete on table public.certificates to authenticated;

-- প্রকাশ্য RPC শুধু প্রকাশিত preview-এর ক্ষেত্রগুলো ফেরত দেয়। NID কেবল তখনই ফেরত আসে, যখন
-- প্রশাসক রেকর্ডে include_nid স্পষ্টভাবে চালু করেন। এই RPC কোনো টেবিল API উন্মুক্ত করে না।
create or replace function public.get_public_certificate(p_share_code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'share_code', c.share_code,
    'certificate_type', c.certificate_type,
    'certificate_number', c.certificate_number,
    'issued_on', c.issued_on,
    'holder_name', c.holder_name,
    'father_name', c.father_name,
    'mother_name', c.mother_name,
    'current_address', c.current_address,
    'permanent_address', c.permanent_address,
    'ward', c.ward,
    'national_id', case when c.include_nid then c.national_id else null end,
    'statement', c.statement,
    'heirs', c.heirs,
    'status', c.status
  )
  from public.certificates c
  where c.share_code = p_share_code
    and c.status = 'published'
  limit 1;
$$;
revoke all on function public.get_public_certificate(text) from public;
grant execute on function public.get_public_certificate(text) to anon, authenticated;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists certificates_touch_updated_at on public.certificates;
create trigger certificates_touch_updated_at
  before update on public.certificates
  for each row execute function public.touch_updated_at();

-- Supabase Dashboard-এ Auth ব্যবহারকারী তৈরির পর নিচের ইমেইলটি বদলে
-- এই অনুমোদন-তালিকার SQL চালান। সাধারণ ব্যবহারকারীর public sign-up বন্ধ রাখুন।
-- insert into public.certificate_admins (user_id)
-- select id from auth.users where lower(email) = lower('admin@example.com')
-- on conflict (user_id) do nothing;
