/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./App.{js,ts,tsx}', './components/**/*.{js,ts,tsx}', './src/**/*.{js,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      fontFamily: {
        display: ['Montserrat', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      colors: {
        border: '#dbe3ef',
        input: '#dbe3ef',
        ring: '#6d73ff',
        background: '#f7faff',
        foreground: '#27364b',
        primary: {
          DEFAULT: '#6d73ff',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#eef4ff',
          foreground: '#27364b',
        },
        muted: {
          DEFAULT: '#eef4ff',
          foreground: '#6b7a90',
        },
        accent: {
          DEFAULT: '#eef4ff',
          foreground: '#27364b',
        },
        success: {
          DEFAULT: '#10b981',
          foreground: '#ffffff',
        },
        warning: {
          DEFAULT: '#f59e0b',
          foreground: '#ffffff',
        },
        destructive: {
          DEFAULT: '#f25555',
          foreground: '#ffffff',
        },
        popover: {
          DEFAULT: '#ffffff',
          foreground: '#27364b',
        },
        card: {
          DEFAULT: '#ffffff',
          foreground: '#27364b',
        },
      },
      borderRadius: {
        lg: '16px',
        md: '14px',
        sm: '12px',
        xl: '20px',
        '2xl': '24px',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        shimmer: 'shimmer 2s linear infinite',
        'fade-in': 'fade-in 0.4s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
