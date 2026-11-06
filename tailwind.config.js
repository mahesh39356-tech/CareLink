/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          900: '#062E27',
          800: '#083830',
          700: '#0B463B',
          600: '#0E5A4D',
          500: '#147A69',
          100: '#E6F4F1',
          50: '#F2F9F7',
        },
        terracotta: {
          DEFAULT: '#DE6C38',
          hover: '#C85A27',
          light: '#FEF3EC',
          border: '#FCD9BD',
          text: '#C25E2E',
        },
        mint: {
          DEFAULT: '#10B981',
          light: '#E6F4F1',
          border: '#CCECE5',
          dark: '#059669',
        },
        clinical: {
          bg: '#F7F9F9',
          card: '#FFFFFF',
          text: '#0F2823',
          muted: '#5C736F',
          border: '#E3EBE8',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 10px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02)',
        elevated: '0 10px 25px -5px rgba(11, 70, 59, 0.1), 0 8px 10px -6px rgba(11, 70, 59, 0.05)',
      }
    },
  },
  plugins: [],
}
