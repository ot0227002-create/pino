-- ============================================================
-- こばかいアプリ — Supabase スキーマ定義
-- Supabase ダッシュボードの SQL Editor に貼り付けて実行してください
-- ============================================================

create extension if not exists "uuid-ossp";

-- ── 案件テーブル ─────────────────────────────────────────
create type if not exists sales_status as enum (
  'new_inquiry', 'survey_scheduled', 'survey_done',
  'estimating', 'estimate_sent', 'considering',
  'contracted', 'in_progress', 'completed'
);

create type if not exists work_type as enum ('reform', 'exterior', 'interior');

create table if not exists projects (
  id                uuid        primary key default uuid_generate_v4(),
  customer_name     text        not null,
  phone             text        not null default '',
  address           text        not null default '',
  memo              text,
  status            sales_status not null default 'new_inquiry',
  last_contact_date date,
  next_action_date  date,
  drawing_url       text,
  work_type         work_type   not null default 'reform',
  target_month      text,                      -- YYYY-MM 形式（例: "2026-05"）
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger projects_updated_at
  before update on projects
  for each row execute procedure update_updated_at();

-- ------------------------------------------------
-- construction_details（工事・契約・原価）
-- ------------------------------------------------
create table if not exists construction_details (
  id                  uuid primary key default uuid_generate_v4(),
  project_id          uuid not null references projects(id) on delete cascade,
  description         text,
  construction_period text,
  start_date          date,
  planned_end_date    date,
  completion_date     date,
  site_memo           text,
  is_contracted       boolean not null default false,
  contract_date       date,
  contract_amount     numeric(12,0),
  subcontractor_cost  numeric(12,0),
  material_cost       numeric(12,0),
  other_cost          numeric(12,0),
  -- 自動計算列
  total_cost generated always as (
    coalesce(subcontractor_cost,0) + coalesce(material_cost,0) + coalesce(other_cost,0)
  ) stored,
  profit generated always as (
    coalesce(contract_amount,0) - (
      coalesce(subcontractor_cost,0) + coalesce(material_cost,0) + coalesce(other_cost,0)
    )
  ) stored,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (project_id)
);

create trigger construction_details_updated_at
  before update on construction_details
  for each row execute procedure update_updated_at();

-- ------------------------------------------------
-- project_images（写真）
-- ------------------------------------------------
create type if not exists image_category as enum ('before', 'after', 'in_progress', 'other');

create table if not exists project_images (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid not null references projects(id) on delete cascade,
  image_url   text not null,
  category    image_category not null default 'other',
  created_at  timestamptz not null default now()
);

-- ── アプリ設定テーブル（単一行 id=1） ────────────────────
create table if not exists app_settings (
  id                          integer     primary key default 1,
  email_company_name          text,
  email_person_name           text,
  email_department            text,
  email_template_inquiry      text,
  email_template_estimate     text,
  email_template_construction text,
  notif_progress              boolean     default true,
  notif_task                  boolean     default true,
  notif_profit                boolean     default true,
  monthly_goals               jsonb       default '{}'::jsonb,  -- { "2026-05": 500000, ... }
  updated_at                  timestamptz not null default now(),
  check (id = 1)
);

create trigger if not exists app_settings_updated_at
  before update on app_settings
  for each row execute procedure update_updated_at();

-- ── Row Level Security ────────────────────────────────────
-- API Routeはサービスロールキーを使用するためRLSを自動バイパス。
-- anonキーのみを使う場合はbelow policyが必要。
alter table projects             enable row level security;
alter table construction_details enable row level security;
alter table project_images       enable row level security;
alter table app_settings         enable row level security;

-- サービスロール（API Route）からのフルアクセス
do $$ begin
  if not exists (select 1 from pg_policies where tablename='projects' and policyname='service_role_all') then
    create policy "service_role_all" on projects for all to service_role using (true) with check (true);
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='construction_details' and policyname='service_role_all') then
    create policy "service_role_all" on construction_details for all to service_role using (true) with check (true);
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='project_images' and policyname='service_role_all') then
    create policy "service_role_all" on project_images for all to service_role using (true) with check (true);
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='app_settings' and policyname='service_role_all') then
    create policy "service_role_all" on app_settings for all to service_role using (true) with check (true);
  end if;
end $$;

-- anonキーを使う場合も全操作許可（既存ポリシーの置き換え）
do $$ begin
  if not exists (select 1 from pg_policies where tablename='projects' and policyname='anon_all_projects') then
    create policy "anon_all_projects" on projects for all to anon, authenticated using (true) with check (true);
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='construction_details' and policyname='anon_all_construction') then
    create policy "anon_all_construction" on construction_details for all to anon, authenticated using (true) with check (true);
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='project_images' and policyname='anon_all_images') then
    create policy "anon_all_images" on project_images for all to anon, authenticated using (true) with check (true);
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='app_settings' and policyname='anon_all_settings') then
    create policy "anon_all_settings" on app_settings for all to anon, authenticated using (true) with check (true);
  end if;
end $$;

-- ── Storage バケット（写真アップロード用） ────────────────
insert into storage.buckets (id, name, public)
values ('project-images', 'project-images', true)
on conflict do nothing;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='objects' and policyname='anon_upload_images') then
    create policy "anon_upload_images" on storage.objects for insert to anon, authenticated
      with check (bucket_id = 'project-images');
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='objects' and policyname='anon_update_images') then
    create policy "anon_update_images" on storage.objects for update to anon, authenticated
      using (bucket_id = 'project-images');
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='objects' and policyname='public_read_images') then
    create policy "public_read_images" on storage.objects for select to public
      using (bucket_id = 'project-images');
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='objects' and policyname='anon_delete_images') then
    create policy "anon_delete_images" on storage.objects for delete to anon, authenticated
      using (bucket_id = 'project-images');
  end if;
end $$;

-- ── インデックス ─────────────────────────────────────────
create index if not exists idx_projects_status       on projects(status);
create index if not exists idx_projects_target_month on projects(target_month);
create index if not exists idx_projects_updated_at   on projects(updated_at desc);
create index if not exists idx_construction_project  on construction_details(project_id);
create index if not exists idx_images_project        on project_images(project_id);
