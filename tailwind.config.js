/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fdf8f3',
          100: '#fbeee3',
          200: '#f7d9c4',
          300: '#f2c09c',
          400: '#eba06f',
          500: '#e4824a',
          600: '#d66a3a',
          700: '#b25230',
          800: '#8e432d',
          900: '#733928',
        },
        warm: {
          50: '#fefdfb',
          100: '#fdf9f3',
          200: '#f9f0e3',
          300: '#f3e2ce',
          400: '#ebcfb2',
          500: '#e0b894',
        },
      },
      fontFamily: {
        sans: ['Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Meiryo', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
