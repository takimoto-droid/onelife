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
        // わんライフ パステルテーマ（主婦向け可愛いデザイン）
        cream: {
          50: '#FFFDFB',
          100: '#FFF9F5',
          200: '#FFF3EB',
          300: '#FFEDE0',
          400: '#FFE4D1',
          500: '#FFD9BF',
        },
        pink: {
          50: '#FFF5F5',
          100: '#FFE8E8',
          200: '#FFD1D1',
          300: '#FFB5B5',
          400: '#FF9B9B',
          500: '#FF8585',
          600: '#FF6B6B',
          700: '#E85555',
          800: '#CC4444',
          900: '#A33636',
        },
        mint: {
          50: '#F0FDF9',
          100: '#E0FAF0',
          200: '#C7F5E5',
          300: '#A7EED5',
          400: '#7DE4C2',
          500: '#5DD9B0',
          600: '#3DC79A',
          700: '#2BA87F',
          800: '#248A68',
          900: '#1E7056',
        },
        peach: {
          50: '#FFF8F5',
          100: '#FFF0EA',
          200: '#FFE1D5',
          300: '#FFD0BD',
          400: '#FFBB9F',
          500: '#FFA584',
          600: '#FF8A63',
          700: '#E87050',
          800: '#CC5A3D',
          900: '#A34830',
        },
        lavender: {
          50: '#FAF5FF',
          100: '#F3E8FF',
          200: '#E9D5FF',
          300: '#D8B4FE',
          400: '#C084FC',
          500: '#A855F7',
          600: '#9333EA',
          700: '#7E22CE',
          800: '#6B21A8',
          900: '#581C87',
        },
        brown: {
          50: '#FDFAF7',
          100: '#F9F1E9',
          200: '#F0DEC9',
          300: '#E5C9A8',
          400: '#D4AD82',
          500: '#C29464',
          600: '#A97B4F',
          700: '#8A6340',
          800: '#6E4F33',
          900: '#573F29',
        },
        // メインアクセントカラー（コーラルピンク）
        accent: {
          DEFAULT: '#FF8585',
          light: '#FFB5B5',
          dark: '#E86565',
          50: '#FFF5F5',
          100: '#FFE8E8',
          200: '#FFD1D1',
          300: '#FFB5B5',
          400: '#FF9B9B',
          500: '#FF8585',
          600: '#FF6B6B',
          700: '#E85555',
          800: '#CC4444',
          900: '#A33636',
        },
        // 機能別カラー（パステル版）
        feature: {
          voice: '#C084FC',    // 鳴き声翻訳：ラベンダー
          health: '#5DD9B0',   // 健康管理：ミント
          walk: '#7DD3FC',     // 散歩：スカイブルー
          food: '#FFA584',     // 飲食店：ピーチ
          insurance: '#67E8F9', // 保険：アクア
          family: '#F9A8D4',   // 家族：ピンク
          goods: '#FF8585',    // グッズ：コーラル
          vet: '#A7EED5',      // 動物病院：ミント
          community: '#FFD1D1', // コミュニティ：ライトピンク
          events: '#E9D5FF',   // イベント：ラベンダー
        },
        // プレミアム機能用
        premium: {
          gold: '#FFD700',
          gradient: {
            from: '#FFD700',
            to: '#FFAA00',
          },
        },
      },
      fontFamily: {
        sans: [
          'Hiragino Sans',
          'Hiragino Kaku Gothic ProN',
          '-apple-system',
          'BlinkMacSystemFont',
          'Meiryo',
          'sans-serif'
        ],
        rounded: [
          'Hiragino Maru Gothic ProN',
          'Hiragino Sans',
          'Meiryo',
          'sans-serif'
        ],
      },
      backgroundImage: {
        'gradient-cute': 'linear-gradient(135deg, #FFE8E8 0%, #FFF5F5 50%, #FFF0EA 100%)',
        'gradient-mint': 'linear-gradient(135deg, #E0FAF0 0%, #C7F5E5 100%)',
        'gradient-peach': 'linear-gradient(135deg, #FFE1D5 0%, #FFBB9F 100%)',
        'gradient-premium': 'linear-gradient(135deg, #FFD700 0%, #FFAA00 100%)',
        'gradient-card': 'linear-gradient(180deg, #FFFFFF 0%, #FFF9F5 100%)',
        'paw-pattern': 'radial-gradient(circle at 20% 30%, rgba(255, 133, 133, 0.1) 0%, transparent 8%), radial-gradient(circle at 80% 70%, rgba(255, 133, 133, 0.1) 0%, transparent 8%)',
      },
      boxShadow: {
        'soft': '0 4px 20px rgba(255, 133, 133, 0.15)',
        'soft-lg': '0 8px 30px rgba(255, 133, 133, 0.2)',
        'card': '0 2px 12px rgba(139, 90, 60, 0.08)',
        'card-hover': '0 4px 20px rgba(255, 133, 133, 0.2)',
        'button': '0 4px 14px rgba(255, 133, 133, 0.35)',
        'inner-soft': 'inset 0 2px 4px rgba(139, 90, 60, 0.06)',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      animation: {
        'bounce-soft': 'bounce-soft 2s ease-in-out infinite',
        'wiggle': 'wiggle 1s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'pulse-pink': 'pulse-pink 2s ease-in-out infinite',
      },
      keyframes: {
        'bounce-soft': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        'wiggle': {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-pink': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255, 133, 133, 0.4)' },
          '50%': { boxShadow: '0 0 0 10px rgba(255, 133, 133, 0)' },
        },
      },
    },
  },
  plugins: [],
}
