/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /* shadcn/ui tokens — maps to CSS vars */
        border:      'hsl(var(--tw-border, 220 13% 91%))',
        input:       'hsl(var(--tw-input, 220 13% 91%))',
        ring:        'hsl(var(--tw-ring, 242 80% 60%))',
        background:  'hsl(var(--tw-background, 0 0% 100%))',
        foreground:  'hsl(var(--tw-foreground, 222 47% 11%))',
        primary: {
          DEFAULT:    '#6366f1',
          foreground: '#ffffff',
          50:  '#eef2ff',
          100: '#e0e7ff',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
        muted: {
          DEFAULT:    '#f3f4f6',
          foreground: '#6b7280',
        },
        accent: {
          DEFAULT:    '#eef2ff',
          foreground: '#4f46e5',
        },
        destructive: {
          DEFAULT:    '#ef4444',
          foreground: '#ffffff',
        },
        card: {
          DEFAULT:    '#ffffff',
          foreground: '#111827',
        },
        popover: {
          DEFAULT:    '#ffffff',
          foreground: '#111827',
        },
        secondary: {
          DEFAULT:    '#f3f4f6',
          foreground: '#374151',
        },
        /* financial semantic */
        emerald: {
          50:  '#ecfdf5',
          100: '#d1fae5',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        rose: {
          50:  '#fff1f2',
          100: '#ffe4e6',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
        },
        violet: {
          50:  '#f5f3ff',
          100: '#ede9fe',
          500: '#8b5cf6',
          600: '#7c3aed',
        },
        amber: {
          50:  '#fffbeb',
          500: '#f59e0b',
          600: '#d97706',
        },
        /* chart palette */
        chart: {
          1: '#6366f1',
          2: '#10b981',
          3: '#f59e0b',
          4: '#f43f5e',
          5: '#8b5cf6',
          6: '#06b6d4',
        },
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '8px',
        md: '10px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
        '3xl': '24px',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        xs:        '0 1px 2px rgba(0,0,0,0.04)',
        sm:        '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        DEFAULT:   '0 4px 6px -1px rgba(0,0,0,0.06), 0 2px 4px -1px rgba(0,0,0,0.04)',
        md:        '0 10px 20px -3px rgba(0,0,0,0.07), 0 4px 8px -2px rgba(0,0,0,0.04)',
        lg:        '0 24px 40px -8px rgba(0,0,0,0.10), 0 8px 16px -4px rgba(0,0,0,0.05)',
        'glow':    '0 0 0 1px rgba(99,102,241,0.2), 0 4px 16px rgba(99,102,241,0.15)',
        'card':    '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 8px 24px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
      },
      keyframes: {
        'fade-in':   { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'none' } },
        'slide-up':  { from: { opacity: 0, transform: 'translateY(14px)' }, to: { opacity: 1, transform: 'none' } },
        'shimmer':   { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        'pulse-dot': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } },
      },
      animation: {
        'fade-in':   'fade-in 0.25s cubic-bezier(0.16,1,0.3,1) both',
        'slide-up':  'slide-up 0.3s cubic-bezier(0.16,1,0.3,1) both',
        'shimmer':   'shimmer 1.8s linear infinite',
        'pulse-dot': 'pulse-dot 2.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
