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
        // わんライフ ダークテーマ
        dark: {
          900: '#0D1B2A', // ディープネイビー（背景）
          800: '#1B263B', // カームブルー（カード背景）
          700: '#243B53', // ミッドナイトブルー
          600: '#334E68', // スレートブルー
          500: '#486581', // ダスティブルー
          400: '#627D98', // ミストブルー
          300: '#829AB1', // ペールブルー
          200: '#9FB3C8', // ライトグレーブルー
          100: '#BCCCDC', // ソフトグレー
          50: '#D9E2EC',  // ニアホワイト
        },
        accent: {
          DEFAULT: '#E8AA42', // アンバー（アクセント）
          light: '#F5C96C',
          dark: '#C48F2E',
          50: '#FEF8E8',
          100: '#FCF0D1',
          200: '#F9E1A3',
          300: '#F5D275',
          400: '#F2C347',
          500: '#E8AA42',
          600: '#C48F2E',
          700: '#A0741A',
          800: '#7C5906',
          900: '#583E00',
        },
        // プレミアム機能用
        premium: {
          gold: '#FFD700',
          gradient: {
            from: '#FFD700',
            to: '#FFA500',
          },
        },
        // 機能別カラー
        feature: {
          voice: '#8B5CF6',    // 鳴き声翻訳：パープル
          health: '#10B981',   // 健康管理：グリーン
          walk: '#3B82F6',     // 散歩：ブルー
          food: '#F97316',     // 飲食店：オレンジ
          insurance: '#06B6D4', // 保険：シアン
          family: '#EC4899',   // 家族：ピンク
          goods: '#EF4444',    // グッズ：レッド
        },
        // 旧カラー（互換性）
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
      backgroundImage: {
        'gradient-premium': 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
        'gradient-dark': 'linear-gradient(180deg, #0D1B2A 0%, #1B263B 100%)',
        'gradient-accent': 'linear-gradient(135deg, #E8AA42 0%, #F5C96C 100%)',
      },
      boxShadow: {
        'glow-accent': '0 0 20px rgba(232, 170, 66, 0.3)',
        'glow-premium': '0 0 20px rgba(255, 215, 0, 0.4)',
        'card-dark': '0 4px 20px rgba(0, 0, 0, 0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(232, 170, 66, 0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(232, 170, 66, 0.6)' },
        },
      },
    },
  },
  plugins: [],
}
