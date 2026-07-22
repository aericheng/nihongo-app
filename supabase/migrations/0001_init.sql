-- ============================================================
-- 日文學習 App — 初始 Schema
-- 執行方式：Supabase Dashboard → SQL Editor 貼上執行，
--           或 supabase CLI：supabase db push
-- 設計原則：
--   1. 所有使用者資料表都帶 user_id（去正規化），讓 RLS policy
--      一律用 auth.uid() = user_id 判斷，不需跨表 join，效能好且不易寫錯。
--   2. 星星標記與測驗統計放 user_progress（與 flashcards 分離），
--      跨裝置同步靠資料庫本身，前端不留本機狀態。
-- ============================================================

-- ---------- 1. levels：JLPT 級別（靜態參照表） ----------
create table public.levels (
  id       smallint primary key,
  code     text not null unique,          -- 'N1' ~ 'N5'
  name     text not null,
  position smallint not null              -- 顯示順序
);

insert into public.levels (id, code, name, position) values
  (1, 'N1', 'JLPT N1', 1),
  (2, 'N2', 'JLPT N2', 2),
  (3, 'N3', 'JLPT N3', 3),
  (4, 'N4', 'JLPT N4', 4),
  (5, 'N5', 'JLPT N5', 5);

-- ---------- 2. study_sets：資料集（第二層） ----------
create table public.study_sets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  level_id   smallint not null references public.levels (id),
  name       text not null check (char_length(name) between 1 and 100),
  created_at timestamptz not null default now()
);

create index study_sets_user_level_idx on public.study_sets (user_id, level_id, created_at);

-- ---------- 3. folders：子資料夾（第三層，每 50 詞一夾） ----------
create table public.folders (
  id           uuid primary key default gen_random_uuid(),
  study_set_id uuid not null references public.study_sets (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 100),
  position     integer not null default 0,   -- 排序用（單字1-50 → 0、51-100 → 1…）
  created_at   timestamptz not null default now()
);

create index folders_set_idx on public.folders (study_set_id, position);
create index folders_user_idx on public.folders (user_id);

-- ---------- 4. flashcards：單字卡（第四層） ----------
create table public.flashcards (
  id         uuid primary key default gen_random_uuid(),
  folder_id  uuid not null references public.folders (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  japanese   text not null check (char_length(japanese) between 1 and 500),  -- 日文（漢字表記）
  kana       text not null default '',                                       -- 平假名／片假名讀音
  chinese    text not null check (char_length(chinese) between 1 and 500),   -- 中文翻譯
  notes      text not null default '',                                       -- 解析／備註（詞性、例句）
  position   integer not null default 0,
  created_at timestamptz not null default now()
);

create index flashcards_folder_idx on public.flashcards (folder_id, position);
create index flashcards_user_idx on public.flashcards (user_id);

-- ---------- 5. user_progress：星星標記與測驗統計（跨裝置同步核心） ----------
create table public.user_progress (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  flashcard_id   uuid not null references public.flashcards (id) on delete cascade,
  starred        boolean not null default false,   -- 星星標記（答錯自動 true，也可手動切換）
  correct_count  integer not null default 0,
  wrong_count    integer not null default 0,
  last_result    boolean,                          -- 最近一次作答對錯
  last_tested_at timestamptz,
  updated_at     timestamptz not null default now(),
  unique (user_id, flashcard_id)
);

create index user_progress_user_idx on public.user_progress (user_id);
create index user_progress_card_idx on public.user_progress (flashcard_id);
-- 「僅測驗星星錯題」的查詢走這條部分索引
create index user_progress_starred_idx on public.user_progress (user_id) where starred;

-- ---------- 6. quiz_sessions：測驗紀錄（歷史） ----------
create table public.quiz_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  folder_id       uuid not null references public.folders (id) on delete cascade,
  question_type   text not null check (question_type in ('choice', 'typing')),
  direction       text not null check (direction in ('jp2zh', 'zh2jp')),
  scope           text not null check (scope in ('all', 'starred')),
  total_questions integer not null,
  correct_count   integer not null,
  created_at      timestamptz not null default now()
);

create index quiz_sessions_user_idx on public.quiz_sessions (user_id, created_at desc);

-- ============================================================
-- Row Level Security：每個使用者只能讀寫自己的資料
-- ============================================================

alter table public.levels        enable row level security;
alter table public.study_sets    enable row level security;
alter table public.folders       enable row level security;
alter table public.flashcards    enable row level security;
alter table public.user_progress enable row level security;
alter table public.quiz_sessions enable row level security;

-- levels 是共用參照表：登入者皆可讀，不可寫
create policy "levels_select" on public.levels
  for select to authenticated using (true);

-- 其餘資料表：owner 全權（select / insert / update / delete）
create policy "study_sets_owner" on public.study_sets
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "folders_owner" on public.folders
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "flashcards_owner" on public.flashcards
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user_progress_owner" on public.user_progress
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "quiz_sessions_owner" on public.quiz_sessions
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
