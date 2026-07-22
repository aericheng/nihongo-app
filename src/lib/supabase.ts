import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !anonKey) {
  throw new Error(
    '缺少 Supabase 環境變數：請複製 .env.example 為 .env.local 並填入 VITE_SUPABASE_URL 與 VITE_SUPABASE_ANON_KEY',
  )
}

export const supabase = createClient(url, anonKey)
