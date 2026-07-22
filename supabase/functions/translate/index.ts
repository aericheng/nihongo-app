// Supabase Edge Function：translate
// 用途：接收中文詞彙/句子，呼叫 OpenAI 產生日文、假名讀音與簡短解析。
// 部署：supabase functions deploy translate
// 金鑰：supabase secrets set OPENAI_API_KEY=sk-...
// 安全：verify_jwt 預設開啟 → 僅登入使用者可呼叫；OpenAI key 只存在伺服器端。

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TranslateResult {
  japanese: string // 日文（自然表記，含漢字）
  kana: string     // 全假名讀音（平假名為主；外來語用片假名）
  notes: string    // 詞性與一句話解析（繁體中文）
}

const RESPONSE_SCHEMA = {
  type: 'json_schema',
  json_schema: {
    name: 'translation',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        japanese: { type: 'string', description: '最自然的日文譯法，使用一般日文表記（含漢字）' },
        kana: { type: 'string', description: 'japanese 的完整假名讀音。和語漢語用平假名，外來語用片假名' },
        notes: { type: 'string', description: '繁體中文的一句話解析：詞性、使用場合或近義辨析' },
      },
      required: ['japanese', 'kana', 'notes'],
      additionalProperties: false,
    },
  },
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { chinese } = await req.json()
    if (typeof chinese !== 'string' || chinese.trim().length === 0 || chinese.length > 200) {
      return json({ error: '請提供 1–200 字的中文內容' }, 400)
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) return json({ error: '伺服器未設定 OPENAI_API_KEY' }, 500)

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        response_format: RESPONSE_SCHEMA,
        messages: [
          {
            role: 'system',
            content:
              '你是日語教學助手。使用者給一個繁體中文詞彙或短句，' +
              '你要給出最常用、最自然的日文對應說法（JLPT 學習用），' +
              '並附上完整假名讀音與一句話解析。只輸出 JSON。',
          },
          { role: 'user', content: chinese.trim() },
        ],
      }),
    })

    if (!res.ok) {
      const detail = await res.text()
      console.error('OpenAI error:', res.status, detail)
      return json({ error: `OpenAI 呼叫失敗 (${res.status})` }, 502)
    }

    const data = await res.json()
    const result: TranslateResult = JSON.parse(data.choices[0].message.content)
    return json(result, 200)
  } catch (err) {
    console.error(err)
    return json({ error: '翻譯失敗，請稍後再試' }, 500)
  }
})

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
