-- dooing 계정 데이터 (Supabase SQL Editor에 통째로 붙여넣고 Run)
-- 사용자 한 명당 한 줄: 할 일·일정·카테고리(data)와 프로필·화면 설정(prefs)을 JSON으로 저장

create table if not exists public.user_data (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  prefs      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 남의 데이터는 절대 못 보게: 로그인한 본인 줄만 읽고 쓰기
alter table public.user_data enable row level security;

drop policy if exists "본인 데이터 읽기" on public.user_data;
create policy "본인 데이터 읽기" on public.user_data
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "본인 데이터 만들기" on public.user_data;
create policy "본인 데이터 만들기" on public.user_data
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "본인 데이터 고치기" on public.user_data;
create policy "본인 데이터 고치기" on public.user_data
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "본인 데이터 지우기" on public.user_data;
create policy "본인 데이터 지우기" on public.user_data
  for delete to authenticated using ((select auth.uid()) = user_id);

-- 회원 탈퇴: 본인 계정을 지우면 user_data도 같이 지워짐 (on delete cascade)
create or replace function public.delete_my_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = auth.uid();
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
