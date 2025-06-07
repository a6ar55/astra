/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#1E293B',
        'secondary': '#334155',
        'accent': '#3B82F6',
        'accent-dark': '#2563EB',
        'danger': '#EF4444',
        'warning': '#F59E0B',
        'success': '#10B981',
        'info': '#06B6D4',
        'background': '#0F172A',
        'foreground': '#F8FAFC',
      },
      fontFamily: {
        'sans': ['Inter', 'ui-sans-serif', 'system-ui'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
} 