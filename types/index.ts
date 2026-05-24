// -----------------------------------------------
// Enums / Union types
// -----------------------------------------------

export type SalesStatus =
  | "new_inquiry"        // 新規問い合わせ
  | "survey_scheduled"   // 現地調査予定
  | "survey_done"        // 現地調査完了
  | "estimating"         // 見積作成中
  | "estimate_sent"      // 見積提出済
  | "considering"        // 検討中
  | "contracted"         // 契約済
  | "in_progress"        // 施工中
  | "completed";         // 完工

export type WorkType =
  | "reform"    // リフォーム
  | "exterior"  // 外構
  | "interior"; // 内装

export type ImageCategory =
  | "before"      // ビフォー
  | "after"       // アフター
  | "in_progress" // 施工中
  | "other";      // その他

// -----------------------------------------------
// Table: projects（顧客・案件）
// -----------------------------------------------

export interface Project {
  id: string;
  customer_name: string;           // 顧客名
  phone: string;                   // 電話番号
  address: string;                 // 施工場所（住所）
  memo: string | null;             // メモ
  status: SalesStatus;             // 営業ステータス
  last_contact_date: string | null; // 最終接触日 (ISO date)
  next_action_date: string | null;  // 次回アクション日 (ISO date)
  drawing_url: string | null;       // 図面ファイルURL
  work_type: WorkType;             // 工種
  target_month: string | null;     // 対象月 (YYYY-MM)
  created_at: string;              // 作成日時 (ISO)
  updated_at: string;              // 更新日時 (ISO)
}

export type ProjectInsert = Omit<Project, "id" | "created_at" | "updated_at">;
export type ProjectUpdate = Partial<ProjectInsert>;

// -----------------------------------------------
// Table: construction_details（工事・契約・原価）
// -----------------------------------------------

export interface ConstructionDetails {
  id: string;
  project_id: string;             // 案件ID（FK）
  description: string | null;     // 施工内容
  construction_period: string | null; // 工期（テキスト: "2ヶ月" など）
  start_date: string | null;      // 着工日 (ISO date)
  planned_end_date: string | null; // 完工予定日 (ISO date)
  completion_date: string | null;  // 完成立会い日 (ISO date)
  site_memo: string | null;        // 現場状況メモ

  // 契約
  is_contracted: boolean;          // 請負契約書締結フラグ
  contract_date: string | null;    // 契約日 (ISO date)
  contract_amount: number | null;  // 請負金額（円）

  // 原価
  subcontractor_cost: number | null; // 下請支払予定（円）
  material_cost: number | null;      // 材料費（円）
  other_cost: number | null;         // その他経費（円）

  created_at: string;
  updated_at: string;
}

export type ConstructionDetailsInsert = Omit<
  ConstructionDetails,
  "id" | "created_at" | "updated_at"
>;
export type ConstructionDetailsUpdate = Partial<ConstructionDetailsInsert>;

// -----------------------------------------------
// Table: project_images（写真）
// -----------------------------------------------

export interface ProjectImage {
  id: string;
  project_id: string;         // 案件ID（FK）
  image_url: string;          // 画像URL
  category: ImageCategory;    // カテゴリ
  created_at: string;         // 登録日時 (ISO)
}

export type ProjectImageInsert = Omit<ProjectImage, "id" | "created_at">;

// -----------------------------------------------
// Computed: 利益情報
// -----------------------------------------------

export interface ProfitSummary {
  contract_amount: number; // 請負金額
  total_cost: number;      // 原価合計
  profit: number;          // 利益額
  profit_rate: number;     // 利益率 (%)
}

// -----------------------------------------------
// View: 案件 + 工事詳細 + 利益（一覧表示用）
// -----------------------------------------------

export interface ProjectWithDetails extends Project {
  construction?: ConstructionDetails;
  images?: ProjectImage[];
  profit?: ProfitSummary;
}

// -----------------------------------------------
// Dashboard 集計用
// -----------------------------------------------

export interface MonthlyProfit {
  year: number;
  month: number;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  profit_rate: number;
  project_count: number;
}

export interface WorkTypeProfit {
  work_type: WorkType;
  total_revenue: number;
  total_profit: number;
  profit_rate: number;
  project_count: number;
}

// -----------------------------------------------
// UI helper maps
// -----------------------------------------------

export const SALES_STATUS_LABEL: Record<SalesStatus, string> = {
  new_inquiry: "新規問い合わせ",
  survey_scheduled: "現地調査予定",
  survey_done: "現地調査完了",
  estimating: "見積作成中",
  estimate_sent: "見積提出済",
  considering: "検討中",
  contracted: "契約済",
  in_progress: "施工中",
  completed: "完工",
};

export const SALES_STATUS_COLOR: Record<SalesStatus, string> = {
  new_inquiry: "bg-gray-100 text-gray-700",
  survey_scheduled: "bg-blue-100 text-blue-700",
  survey_done: "bg-cyan-100 text-cyan-700",
  estimating: "bg-yellow-100 text-yellow-700",
  estimate_sent: "bg-orange-100 text-orange-700",
  considering: "bg-purple-100 text-purple-700",
  contracted: "bg-green-100 text-green-700",
  in_progress: "bg-teal-100 text-teal-700",
  completed: "bg-emerald-100 text-emerald-700",
};

export const WORK_TYPE_LABEL: Record<WorkType, string> = {
  reform: "リフォーム",
  exterior: "外構",
  interior: "内装",
};

export const IMAGE_CATEGORY_LABEL: Record<ImageCategory, string> = {
  before: "ビフォー",
  after: "アフター",
  in_progress: "施工中",
  other: "その他",
};

export const SALES_STATUS_ORDER: SalesStatus[] = [
  "new_inquiry",
  "survey_scheduled",
  "survey_done",
  "estimating",
  "estimate_sent",
  "considering",
  "contracted",
  "in_progress",
  "completed",
];
