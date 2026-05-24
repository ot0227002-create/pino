-- ================================================
-- 案件管理アプリ Supabase スキーマ
-- ================================================

create extension if not exists "uuid-ossp";

-- ------------------------------------------------
-- projects（顧客・案件）
-- ------------------------------------------------
create type sales_status as enum (
  'new_inquiry', 'survey_scheduled', 'survey_done',
  'estimating', 'estimate_sent', 'considering',
  'contracted', 'in_progress', 'completed'
);

create type work_type as enum ('reform', 'exterior', 'interior');

create table projects (
  id                uuid primary key default uuid_generate_v4(),
  customer_name     text not null,
  phone             text not null default '',
  address           text not null default '',
  memo              text,
  status            sales_status not null default 'new_inquiry',
  last_contact_date date,
  next_action_date  date,
  drawing_url       text,
  work_type         work_type not null default 'reform',
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
create table construction_details (
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
create type image_category as enum ('before', 'after', 'in_progress', 'other');

create table project_images (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid not null references projects(id) on delete cascade,
  image_url   text not null,
  category    image_category not null default 'other',
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------
-- Row Level Security（認証なしで全操作許可）
-- ※ 将来的に Supabase Auth を追加すれば絞り込み可能
-- ------------------------------------------------
alter table projects             enable row level security;
alter table construction_details enable row level security;
alter table project_images       enable row level security;

create policy "anon_all_projects"
  on projects for all to anon, authenticated using (true) with check (true);

create policy "anon_all_construction"
  on construction_details for all to anon, authenticated using (true) with check (true);

create policy "anon_all_images"
  on project_images for all to anon, authenticated using (true) with check (true);

-- ------------------------------------------------
-- Storage バケット（写真アップロード用）
-- ------------------------------------------------
insert into storage.buckets (id, name, public)
values ('project-images', 'project-images', true)
on conflict do nothing;

create policy "anon_upload_images"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'project-images');

create policy "anon_update_images"
  on storage.objects for update to anon, authenticated
  using (bucket_id = 'project-images');

create policy "public_read_images"
  on storage.objects for select to public
  using (bucket_id = 'project-images');

create policy "anon_delete_images"
  on storage.objects for delete to anon, authenticated
  using (bucket_id = 'project-images');
