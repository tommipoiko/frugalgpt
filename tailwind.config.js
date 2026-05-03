/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class',
    content: ['./src/**/*.{js,jsx}'],
    theme: {
        extend: {
            colors: {
                brand: {
                    50: '#ecfdf5',
                    100: '#d1fae5',
                    200: '#a7f3d0',
                    300: '#6ee7b7',
                    400: '#34d399',
                    500: '#10b981',
                    600: '#059669',
                    700: '#047857'
                },
                surface: {
                    light: '#f7f7f8',
                    dark: '#0b0b0f',
                    paper: {
                        light: '#ffffff',
                        dark: '#15151b'
                    }
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'ui-monospace', 'monospace']
            },
            borderRadius: {
                xl: '14px',
                '2xl': '16px'
            },
            boxShadow: {
                menu: '0 10px 30px rgba(15,23,42,0.10)'
            },
            backgroundImage: {
                brand: 'linear-gradient(135deg, #059669 0%, #10B981 50%, #34D399 100%)',
                'brand-soft':
                    'linear-gradient(135deg, rgba(5,150,105,0.12) 0%, rgba(16,185,129,0.12) 100%)'
            },
            screens: {
                xs: { max: '599px' }
            }
        }
    },
    plugins: []
}
