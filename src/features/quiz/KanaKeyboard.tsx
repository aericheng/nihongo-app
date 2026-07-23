// 內嵌 50 音鍵盤：拼寫題專用，不喚起系統鍵盤（手機畫面不會被推動）。
// ゛/゜/小 三個修飾鍵作用在「最後一個字元」上（比照日文九宮格鍵盤的習慣）。
import { useState } from 'react'

// 50 音表直排（あ〜わ 十列），null 為表中空格
const COLS: (string | null)[][] = [
  ['あ', 'い', 'う', 'え', 'お'],
  ['か', 'き', 'く', 'け', 'こ'],
  ['さ', 'し', 'す', 'せ', 'そ'],
  ['た', 'ち', 'つ', 'て', 'と'],
  ['な', 'に', 'ぬ', 'ね', 'の'],
  ['は', 'ひ', 'ふ', 'へ', 'ほ'],
  ['ま', 'み', 'む', 'め', 'も'],
  ['や', null, 'ゆ', null, 'よ'],
  ['ら', 'り', 'る', 'れ', 'ろ'],
  ['わ', null, 'を', null, 'ん'],
]

const DAKUTEN: Record<string, string> = {
  か: 'が', き: 'ぎ', く: 'ぐ', け: 'げ', こ: 'ご',
  さ: 'ざ', し: 'じ', す: 'ず', せ: 'ぜ', そ: 'ぞ',
  た: 'だ', ち: 'ぢ', つ: 'づ', て: 'で', と: 'ど',
  は: 'ば', ひ: 'び', ふ: 'ぶ', へ: 'べ', ほ: 'ぼ',
  う: 'ゔ',
}
const HANDAKUTEN: Record<string, string> = { は: 'ぱ', ひ: 'ぴ', ふ: 'ぷ', へ: 'ぺ', ほ: 'ぽ' }
const SMALL: Record<string, string> = {
  あ: 'ぁ', い: 'ぃ', う: 'ぅ', え: 'ぇ', お: 'ぉ',
  や: 'ゃ', ゆ: 'ゅ', よ: 'ょ', つ: 'っ', わ: 'ゎ',
}

/** 平假名 Unicode 位移 0x60 即為對應片假名（ー 除外） */
function toKata(ch: string): string {
  return String.fromCharCode(ch.charCodeAt(0) + 0x60)
}

/** 把平假名轉換表擴充成同時涵蓋片假名 */
function withKatakana(hiraMap: Record<string, string>): Record<string, string> {
  const map: Record<string, string> = { ...hiraMap }
  for (const [from, to] of Object.entries(hiraMap)) map[toKata(from)] = toKata(to)
  return map
}
const DAKUTEN_MAP = withKatakana(DAKUTEN)
const HANDAKUTEN_MAP = withKatakana(HANDAKUTEN)
const SMALL_MAP = withKatakana(SMALL)

interface Props {
  value: string
  disabled?: boolean
  onChange: (next: string) => void
}

export function KanaKeyboard({ value, disabled = false, onChange }: Props) {
  const [kata, setKata] = useState(false)

  function append(ch: string) {
    onChange(value + ch)
  }

  function backspace() {
    onChange(Array.from(value).slice(0, -1).join(''))
  }

  function transformLast(map: Record<string, string>) {
    const chars = Array.from(value)
    const last = chars[chars.length - 1]
    if (!last || !map[last]) return
    chars[chars.length - 1] = map[last]
    onChange(chars.join(''))
  }

  const kanaKey =
    'rounded-md border border-slate-200 bg-white py-1.5 text-center font-jp text-base leading-none text-slate-800 transition-colors enabled:active:bg-indigo-100 enabled:hover:bg-indigo-50 disabled:opacity-40'
  const modKey =
    'rounded-md border border-slate-300 bg-slate-100 py-2 text-center text-sm font-medium leading-none text-slate-600 transition-colors enabled:active:bg-slate-300 enabled:hover:bg-slate-200 disabled:opacity-40'

  return (
    <div className="select-none space-y-1.5">
      <div className="grid grid-cols-10 gap-1">
        {[0, 1, 2, 3, 4].map((row) =>
          COLS.map((col, colIndex) => {
            const ch = col[row]
            if (!ch) return <span key={`${row}-${colIndex}`} />
            const shown = kata ? toKata(ch) : ch
            return (
              <button
                key={`${row}-${colIndex}`}
                type="button"
                disabled={disabled}
                onClick={() => append(shown)}
                className={kanaKey}
              >
                {shown}
              </button>
            )
          }),
        )}
      </div>
      <div className="grid grid-cols-6 gap-1">
        <button type="button" disabled={disabled} onClick={() => setKata((k) => !k)} className={modKey}>
          {kata ? 'ひら' : 'カタ'}
        </button>
        <button type="button" disabled={disabled} onClick={() => transformLast(DAKUTEN_MAP)} className={modKey}>
          ゛
        </button>
        <button type="button" disabled={disabled} onClick={() => transformLast(HANDAKUTEN_MAP)} className={modKey}>
          ゜
        </button>
        <button type="button" disabled={disabled} onClick={() => transformLast(SMALL_MAP)} className={modKey}>
          小
        </button>
        <button type="button" disabled={disabled} onClick={() => append('ー')} className={modKey}>
          ー
        </button>
        <button type="button" disabled={disabled} onClick={backspace} className={modKey} aria-label="退格">
          ⌫
        </button>
      </div>
    </div>
  )
}
