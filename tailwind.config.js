/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        jp: ['"Hiragino Kaku Gothic ProN"', '"Noto Sans JP"', '"Yu Gothic"', 'Meiryo', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
