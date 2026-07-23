-- ============================================================
-- 0002：新使用者自動配發起始單字庫
-- 執行方式：Supabase Dashboard → SQL Editor 貼上執行。
-- 機制：
--   1. 建立 template_* 三張範本表，內容從既有帳號的 8 個精選資料集複製一次。
--   2. auth.users 的 AFTER INSERT trigger 在每次註冊時，把範本複製成
--      該使用者自己的資料（新 id、綁 user_id，之後各自獨立編輯互不影響）。
--   3. 複製失敗時吞掉例外（絕不能因為種子失敗擋住註冊）。
-- 停用方式：drop trigger on_auth_user_created on auth.users;
-- ============================================================

-- ---------- 1. 範本表（無對外存取：開 RLS 但不建 policy，只有 definer 函式讀得到） ----------
create table if not exists public.template_study_sets (
  id       uuid primary key,
  level_id smallint not null,
  name     text not null
);
create table if not exists public.template_folders (
  id           uuid primary key,
  study_set_id uuid not null,
  name         text not null,
  position     integer not null
);
create table if not exists public.template_flashcards (
  id        uuid primary key,
  folder_id uuid not null,
  japanese  text not null,
  kana      text not null,
  chinese   text not null,
  notes     text not null,
  position  integer not null
);

alter table public.template_study_sets  enable row level security;
alter table public.template_folders    enable row level security;
alter table public.template_flashcards enable row level security;

-- ---------- 2. 從既有帳號複製精選資料集進範本（可重複執行：先清空） ----------
truncate public.template_flashcards, public.template_folders, public.template_study_sets;

insert into public.template_study_sets (id, level_id, name)
select s.id, s.level_id, s.name
from public.study_sets s
join auth.users u on u.id = s.user_id
where u.email = 'aericheng+test@gmail.com'
  and s.name in ('N5 常用單字', '數字與時間', '人體與家庭', '形容詞與副詞',
                 '生活動詞', '片假名外來語', '日常會話', 'N4 常用單字');

insert into public.template_folders (id, study_set_id, name, position)
select f.id, f.study_set_id, f.name, f.position
from public.folders f
where f.study_set_id in (select id from public.template_study_sets);

insert into public.template_flashcards (id, folder_id, japanese, kana, chinese, notes, position)
select c.id, c.folder_id, c.japanese, c.kana, c.chinese, c.notes, c.position
from public.flashcards c
where c.folder_id in (select id from public.template_folders);

-- ---------- 3. 註冊 trigger ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ts record;
  tf record;
  new_set uuid;
  new_folder uuid;
begin
  for ts in select * from template_study_sets order by level_id desc, name loop
    insert into study_sets (user_id, level_id, name)
    values (new.id, ts.level_id, ts.name)
    returning id into new_set;

    for tf in select * from template_folders where study_set_id = ts.id order by position loop
      insert into folders (study_set_id, user_id, name, position)
      values (new_set, new.id, tf.name, tf.position)
      returning id into new_folder;

      insert into flashcards (folder_id, user_id, japanese, kana, chinese, notes, position)
      select new_folder, new.id, japanese, kana, chinese, notes, position
      from template_flashcards
      where folder_id = tf.id;
    end loop;
  end loop;
  return new;
exception when others then
  -- 種子失敗不可擋註冊；使用者仍可正常使用（單字庫為空而已）
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
