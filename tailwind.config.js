/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        roboto: ['Roboto', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        // Paleta Refinada Material Design 3 (Harmonia Visual e Acessibilidade WCAG AA/AAA)
        brand: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#2563EB', // Android Dynamic Sapphire Blue
          600: '#1D4ED8',
          700: '#1E40AF',
          800: '#1E3A8A',
          900: '#172554',
        },
        primary: {
          DEFAULT: '#1D4ED8',
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#2563EB',
          600: '#1D4ED8',
          700: '#1E40AF',
          800: '#1E3A8A',
          900: '#172554',
          container: '#DBEAFE',
          'on-container': '#1E3A8A',
        },
        surface: {
          DEFAULT: '#F8FAFC', // Canvas claro arejado
          card: '#FFFFFF',     // Cartões brancos nítidos
          container: '#F1F5F9', // Superfície tonal suave
          'container-high': '#E2E8F0',
          dark: '#0B0F19',     // Canvas escuro obsidiana
          'dark-card': '#131B2B', // Cartão escuro elevado
          'dark-container': '#182234', // Superfície tonal escura
        },
        'on-surface': {
          DEFAULT: '#0F172A', // Slate 900 de alto contraste
          variant: '#475569', // Slate 600 para textos secundários
          'dark-default': '#F8FAFC',
          'dark-variant': '#94A3B8',
        },
        outline: {
          DEFAULT: '#CBD5E1', // Borda sutil e elegante
          variant: '#E2E8F0',
          'dark-default': '#2A3854',
          'dark-variant': '#1E293B',
        },
        // Semânticos com tons suaves e agradáveis
        status: {
          success: '#059669',
          'success-bg': '#ECFDF5',
          'success-text': '#065F46',
          'success-border': '#A7F3D0',
          warning: '#D97706',
          'warning-bg': '#FFFBEB',
          'warning-text': '#92400E',
          'warning-border': '#FDE68A',
          error: '#DC2626',
          'error-bg': '#FEF2F2',
          'error-text': '#991B1B',
          'error-border': '#FECACA',
        },
        coca: '#DC2626',
        monster: '#059669',
      },
      borderRadius: {
        '3xl': '1.75rem', // 28px - canônico Android M3 Card / Dialog
        '4xl': '2rem',
      },
      boxShadow: {
        'm3-1': '0px 1px 3px 0px rgba(15, 23, 42, 0.08), 0px 1px 2px -1px rgba(15, 23, 42, 0.06)',
        'm3-2': '0px 4px 6px -1px rgba(15, 23, 42, 0.08), 0px 2px 4px -2px rgba(15, 23, 42, 0.04)',
        'm3-3': '0px 10px 15px -3px rgba(15, 23, 42, 0.08), 0px 4px 6px -4px rgba(15, 23, 42, 0.03)',
      }
    },
  },
  plugins: [],
}
