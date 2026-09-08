# 日語帳（にほんごちょう）— JLPT 單字學習 Web App

支援跨裝置同步的日文單字學習 App：N1–N5 四層導覽、單字測驗（選擇題／拼寫題）、
錯題自動星星標記、AI 自動翻譯（中文 → 日文＋假名）。

- 前端：React 18 + TypeScript + Vite + Tailwind CSS
- 後端：Supabase（PostgreSQL + Auth + Row Level Security + Edge Functions）
- AI 翻譯：OpenAI gpt-4o-mini（API key 只存在 Edge Function 伺服器端，不會進到瀏覽器）

架構細節見 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

---

## 環境需求

- Node.js 18+（開發機已驗證 v24）
- 一個 [Supabase](https://supabase.com) 免費帳號
- 一把 [OpenAI API key](https://platform.openai.com/api-keys)（只有 AI 自動翻譯需要）

## 安裝步驟

### 1. 建立 Supabase 專案

1. 到 <https://supabase.com/dashboard> → **New project**（免費方案即可）。
2. 專案建好後，到 **Settings → API** 記下兩個值：
   - `Project URL`（形如 `https://xxxx.supabase.co`）
   - `anon public` key
3. （建議）到 **Authentication → Providers → Email**：開發階段可先關閉
   **Confirm email**，註冊後即可直接登入；正式上線再開啟。

### 2. 建立資料庫（執行 migration）

到 Supabase Dashboard → **SQL Editor** → New query，
把 [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) 整份貼上執行。

這會建立 6 張資料表（levels / study_sets / folders / flashcards / user_progress / quiz_sessions）、
所有索引與 RLS 安全政策，並填入 N1–N5 種子資料。

### 3. 部署 AI 翻譯 Edge Function

需要 [Supabase CLI](https://supabase.com/docs/guides/cli)：

```bash
# 登入並連結專案（project-ref 在 Dashboard 網址列可見）
supabase login
supabase link --project-ref <你的-project-ref>

# 設定 OpenAI key（只存在伺服器端）
supabase secrets set OPENAI_API_KEY=sk-你的key

# 部署
supabase functions deploy translate
```

> 沒有 OpenAI key 也能用整個 App——只是「AI 自動翻譯」按鈕會失敗，
> 日文與假名改為手動輸入即可。

### 4. 設定前端環境變數

```bash
cp .env.example .env.local
```

編輯 `.env.local`，填入步驟 1 記下的兩個值：

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### 5. 啟動

```bash
npm install
npm run dev        # 開發模式 http://localhost:5173
npm run build      # 產出正式版到 dist/
```

第一次使用：註冊帳號 → 首頁選級別（如 N5）→ 新增資料集（如「動詞篇」）→
新增資料夾（單字 1-50）→ 進入資料夾新增詞卡、開始測驗。

## 跨裝置同步怎麼運作

所有資料（詞卡、星星標記、測驗紀錄）都存在 Supabase 的 PostgreSQL，
前端不留本機資料。任何裝置用同一組 Email/密碼登入，看到的就是同一份資料；
Row Level Security 保證每個使用者只能讀寫自己的資料列。

## License

MIT — see [LICENSE](LICENSE).
