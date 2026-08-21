-- ============================================================
-- こばかいアプリ — Cloudflare D1 (SQLite) スキーマ
-- Cloudflare ダッシュボード → D1 → pino-db → Console に貼り付けて実行
-- または: wrangler d1 execute pino-db --file=supabase/schema-d1.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS projects (
  id                TEXT PRIMARY KEY,
  customer_name     TEXT NOT NULL,
  phone             TEXT NOT NULL DEFAULT '',
  address           TEXT NOT NULL DEFAULT '',
  memo              TEXT,
  status            TEXT NOT NULL DEFAULT 'new_inquiry',
  last_contact_date TEXT,
  next_action_date  TEXT,
  drawing_url       TEXT,
  work_type         TEXT NOT NULL DEFAULT 'reform',
  target_month      TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS construction_details (
  id                  TEXT PRIMARY KEY,
  project_id          TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  description         TEXT,
  construction_period TEXT,
  start_date          TEXT,
  planned_end_date    TEXT,
  completion_date     TEXT,
  site_memo           TEXT,
  is_contracted       INTEGER NOT NULL DEFAULT 0,
  contract_date       TEXT,
  contract_amount     REAL,
  subcontractor_cost  REAL,
  material_cost       REAL,
  other_cost          REAL,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(project_id)
);

CREATE TABLE IF NOT EXISTS project_images (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  image_url   TEXT NOT NULL,
  r2_key      TEXT,
  category    TEXT NOT NULL DEFAULT 'other',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS work_items (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category    TEXT NOT NULL DEFAULT '',
  name        TEXT NOT NULL DEFAULT '',
  detail      TEXT NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS app_settings (
  id                          INTEGER PRIMARY KEY DEFAULT 1,
  email_company_name          TEXT,
  email_person_name           TEXT,
  email_department            TEXT,
  email_template_inquiry      TEXT,
  email_template_estimate     TEXT,
  email_template_construction TEXT,
  notif_progress              INTEGER DEFAULT 1,
  notif_task                  INTEGER DEFAULT 1,
  notif_profit                INTEGER DEFAULT 1,
  monthly_goals               TEXT DEFAULT '{}',
  updated_at                  TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK(id = 1)
);

CREATE INDEX IF NOT EXISTS idx_projects_status       ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_target_month ON projects(target_month);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at   ON projects(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_construction_project  ON construction_details(project_id);
CREATE INDEX IF NOT EXISTS idx_images_project        ON project_images(project_id);
CREATE INDEX IF NOT EXISTS idx_work_items_project    ON work_items(project_id, sort_order);
