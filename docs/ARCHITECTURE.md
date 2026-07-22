# 系統架構說明

## 整體架構

```
┌──────────────────────────────┐
│  瀏覽器（任何裝置）           │
│  React SPA (Vite + Tailwind) │
│  ├─ pages/      四層導覽頁    │
│  ├─ features/   詞卡/測驗模組 │
│  └─ lib/api.ts  資料存取層 ←──┼── 唯一出口，元件不直接碰 supabase client
└──────────────┬───────────────┘
               │ supabase-js（HTTPS + JWT）
┌──────────────▼───────────────┐
│  Supabase                     │
│  ├─ Auth（Email/Password）    │
│  ├─ PostgreSQL + RLS          │←─ 每列資料綁 user_id，政策強制 auth.uid() = user_id
│  └─ Edge Function: translate ─┼─→ OpenAI gpt-4o-mini（API key 僅存伺服器端）
└──────────────────────────────┘
```

**為什麼選 Supabase 而不是自建 API server**：本 App 的後端邏輯幾乎都是
「帶權限的 CRUD」，Supabase 的 RLS（Row Level Security，資料列層級的安全政策）
直接在資料庫層做完權限檢查，前端可以安全直連，省掉整層 REST API 的開發與部署。
唯一需要伺服器端邏輯的是 AI 翻譯（不能把 OpenAI key 暴露給瀏覽器），
所以只寫了一個 Edge Function。

## 目錄結構

```
DCC/
├── index.html / vite.config.ts / tailwind.config.js / tsconfig*.json
├── .env.example                  # VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
├── supabase/
│   ├── migrations/0001_init.sql  # 全部資料表 + 索引 + RLS + N1-N5 種子
│   └── functions/translate/      # 中文→日文+假名+解析（OpenAI, JSON Schema 輸出）
├── docs/ARCHITECTURE.md          # 本文件
└── src/
    ├── main.tsx                  # 進入點：BrowserRouter + AuthProvider
    ├── App.tsx                   # 路由表（四層 + auth）
    ├── context/AuthContext.tsx   # session 狀態、signIn/signUp/signOut
    ├── lib/
    │   ├── supabase.ts           # supabase client 單例
    │   ├── types.ts              # DB 對應型別、FOLDER_CAPACITY=50
    │   └── api.ts                # 資料存取層（所有查詢集中於此）
    ├── components/
    │   ├── layout/               # AppLayout（頁首）、ProtectedRoute
    │   └── ui/                   # Button / Modal / TextInput / Spinner / EmptyState
    ├── pages/                    # 四層導覽 + 登入註冊
    │   ├── HomePage.tsx          # 第一層：N1–N5 級別
    │   ├── LevelPage.tsx         # 第二層：資料集（Study Sets）
    │   ├── StudySetPage.tsx      # 第三層：子資料夾（每 50 詞）
    │   └── FolderPage.tsx        # 第四層：詞庫與學習區
    └── features/
        ├── flashcards/           # 新增/編輯詞卡 Modal（含 AI 翻譯）
        └── quiz/                 # 測驗模組（設定/出題/對錯/結果）
```

## 路由與四層導覽

| 層 | 路由 | 內容 |
|----|------|------|
| 1 | `/` | N1–N5 五個級別資料夾 |
| 2 | `/level/:levelCode` | 該級別的資料集列表＋新增資料集 |
| 3 | `/sets/:setId` | 資料集內的子資料夾（單字 1-50、51-100…）＋新增資料夾 |
| 4 | `/folders/:folderId` | 單字列表（日/假名/中/星星）＋測驗模式＋新增詞卡 |

全部包在 `ProtectedRoute` 內，未登入一律導向 `/login`。

## 資料模型（詳見 0001_init.sql）

```
levels (N1–N5, 靜態)
  └─ study_sets (user_id, level_id, name)          第二層
       └─ folders (user_id, study_set_id, name)    第三層，App 端限制 50 詞/夾
            └─ flashcards (user_id, folder_id,     第四層
                 japanese, kana, chinese, notes)
                  └─ user_progress (user_id, flashcard_id,
                       starred, correct/wrong_count, last_result)
quiz_sessions (user_id, folder_id, 題型/方向/範圍, 成績)   測驗歷史
```

設計重點：

1. **星星與統計獨立成 `user_progress`**，不塞在 `flashcards`——
   卡片內容與個人學習狀態分離，unique(user_id, flashcard_id) 保證一人一卡一列，
   跨裝置同步就是讀同一列資料。
2. **每張表都去正規化帶 `user_id`**，RLS 政策一律寫成
   `auth.uid() = user_id`，不需跨表 join，好懂、快、不易寫出漏洞。
3. **刪除採 cascade**：刪資料集 → 資料夾 → 卡片 → 進度一路連動清乾淨。
4. **50 詞上限是應用層規範**（`FOLDER_CAPACITY`），資料庫不硬性限制，
   保留未來調整彈性；第三層以「x / 50」顯示、滿了擋新增並引導開下一夾。

## 測驗流程

```
QuizLauncher（詞庫頁右上角按鈕）
  → 設定 Modal：題型(choice/typing) × 方向(jp2zh/zh2jp) × 範圍(all/starred)
  → 出題：範圍卡池洗牌；選擇題干擾項從同資料夾抽 3 張
  → 答對：recordAnswer(true) → 綠色動畫 → 自動下一題
  → 答錯：recordAnswer(false) → DB 自動加星 → 停留顯示正解+解析 → 手動下一題
  → 結果頁：答對率 + 錯題清單 → saveQuizSession() 寫入歷史
```

`recordAnswer` 的加星寫在資料層（api.ts）：答錯 upsert `starred = true`，
答對只加統計、不清星——清星是使用者在詞庫頁手動點星星的動作。

## AI 翻譯流程

```
AddCardModal 輸入中文 → supabase.functions.invoke('translate')
  → Edge Function（驗 JWT，未登入擋下）
  → OpenAI chat.completions（response_format: json_schema, strict）
  → { japanese, kana, notes } 回填表單 → 使用者微調 → createCard()
```

用 JSON Schema strict mode 保證回傳一定是三欄位的合法 JSON，前端不需要防解析失敗；
模型溫度 0.2 求穩定。換供應商（如 DeepL＋LLM 混合）只需要改這一個 function，
前端契約（`TranslateResult`）不變。
