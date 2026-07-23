import type { InputHTMLAttributes } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function TextInput({ label, id, className = '', ...rest }: Props) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-medium text-slate-600">{label}</span>}
      <input
        id={id}
        className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${className}`}
        {...rest}
      />
    </label>
  )
}
