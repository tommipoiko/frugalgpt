import { createTheme } from '@mui/material/styles'

export const brandGradient = 'linear-gradient(135deg, #059669 0%, #10B981 50%, #34D399 100%)'
export const brandGradientSoft = 'linear-gradient(135deg,'
    + ' rgba(5,150,105,0.12) 0%, rgba(16,185,129,0.12) 100%)'
export const brandShimmer = 'linear-gradient(90deg,'
    + ' #059669 0%, #10B981 25%, #34D399 50%, #10B981 75%, #059669 100%)'

const sharedTypography = {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: 14,
    h1: { fontWeight: 700, letterSpacing: '-0.025em' },
    h2: { fontWeight: 700, letterSpacing: '-0.025em' },
    h3: { fontWeight: 700, letterSpacing: '-0.02em' },
    h4: { fontWeight: 700, letterSpacing: '-0.02em' },
    h5: { fontWeight: 600, letterSpacing: '-0.015em' },
    h6: { fontWeight: 600, letterSpacing: '-0.01em' },
    button: { fontWeight: 600, textTransform: 'none', letterSpacing: '0' },
    body1: { fontSize: '0.95rem', lineHeight: 1.65 },
    body2: { fontSize: '0.875rem', lineHeight: 1.6 }
}

const sharedShape = { borderRadius: 14 }

const lightPalette = {
    mode: 'light',
    primary: {
        main: '#10B981',
        light: '#34D399',
        dark: '#059669',
        contrastText: '#FFFFFF'
    },
    secondary: {
        main: '#22C55E',
        light: '#4ADE80',
        dark: '#16A34A',
        contrastText: '#FFFFFF'
    },
    background: {
        default: '#F7F7F8',
        paper: '#FFFFFF'
    },
    text: {
        primary: '#0F172A',
        secondary: '#64748B'
    },
    divider: 'rgba(15, 23, 42, 0.08)',
    action: {
        hover: 'rgba(16, 185, 129, 0.06)',
        selected: 'rgba(16, 185, 129, 0.10)'
    }
}

const darkPalette = {
    mode: 'dark',
    primary: {
        main: '#34D399',
        light: '#6EE7B7',
        dark: '#10B981',
        contrastText: '#0F172A'
    },
    secondary: {
        main: '#4ADE80',
        light: '#86EFAC',
        dark: '#22C55E',
        contrastText: '#0F172A'
    },
    background: {
        default: '#0B0B0F',
        paper: '#15151B'
    },
    text: {
        primary: '#F4F4F5',
        secondary: '#A1A1AA'
    },
    divider: 'rgba(255, 255, 255, 0.08)',
    action: {
        hover: 'rgba(52, 211, 153, 0.10)',
        selected: 'rgba(52, 211, 153, 0.16)'
    }
}

const buildComponents = (mode) => ({
    MuiCssBaseline: {
        styleOverrides: {
            '*, *::before, *::after': {
                boxSizing: 'border-box'
            },
            body: {
                fontFeatureSettings: '"cv02", "cv03", "cv04", "cv11"',
                WebkitFontSmoothing: 'antialiased'
            },
            '@keyframes brandShimmer': {
                '0%': { backgroundPosition: '0% 50%' },
                '100%': { backgroundPosition: '200% 50%' }
            }
        }
    },
    MuiAppBar: {
        styleOverrides: {
            root: {
                backgroundColor: mode === 'dark'
                    ? 'rgba(11, 11, 15, 0.85)'
                    : 'rgba(247, 247, 248, 0.85)',
                color: mode === 'dark' ? '#F4F4F5' : '#0F172A',
                backdropFilter: 'saturate(180%) blur(12px)',
                WebkitBackdropFilter: 'saturate(180%) blur(12px)',
                boxShadow: 'none',
                borderBottom: mode === 'dark'
                    ? '1px solid rgba(255,255,255,0.06)'
                    : '1px solid rgba(15,23,42,0.06)'
            }
        }
    },
    MuiDrawer: {
        styleOverrides: {
            paper: {
                backgroundColor: mode === 'dark' ? '#0E0E13' : '#FAFAFB',
                borderRight: mode === 'dark'
                    ? '1px solid rgba(255,255,255,0.06)'
                    : '1px solid rgba(15,23,42,0.06)'
            }
        }
    },
    MuiButton: {
        styleOverrides: {
            root: {
                borderRadius: 10,
                fontWeight: 600,
                paddingTop: 8,
                paddingBottom: 8,
                paddingLeft: 16,
                paddingRight: 16,
                boxShadow: 'none',
                ':hover': { boxShadow: 'none' }
            },
            containedPrimary: {
                backgroundImage: brandGradient,
                color: '#FFFFFF',
                ':hover': {
                    backgroundImage: brandGradient,
                    filter: 'brightness(1.05)'
                }
            }
        }
    },
    MuiIconButton: {
        styleOverrides: {
            root: {
                borderRadius: 10
            }
        }
    },
    MuiTextField: {
        defaultProps: { variant: 'outlined' },
        styleOverrides: {
            root: {
                '& .MuiOutlinedInput-root': {
                    borderRadius: 12
                }
            }
        }
    },
    MuiPaper: {
        styleOverrides: {
            rounded: { borderRadius: 14 },
            outlined: {
                borderColor: mode === 'dark'
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(15,23,42,0.08)'
            }
        }
    },
    MuiCard: {
        styleOverrides: {
            root: {
                borderRadius: 16,
                border: mode === 'dark'
                    ? '1px solid rgba(255,255,255,0.06)'
                    : '1px solid rgba(15,23,42,0.06)',
                boxShadow: mode === 'dark'
                    ? '0 1px 2px rgba(0,0,0,0.4)'
                    : '0 1px 2px rgba(15,23,42,0.04)'
            }
        }
    },
    MuiMenu: {
        styleOverrides: {
            paper: {
                borderRadius: 12,
                marginTop: 6,
                boxShadow: mode === 'dark'
                    ? '0 10px 30px rgba(0,0,0,0.6)'
                    : '0 10px 30px rgba(15,23,42,0.10)'
            }
        }
    },
    MuiListItemButton: {
        styleOverrides: {
            root: {
                borderRadius: 10
            }
        }
    },
    MuiTooltip: {
        styleOverrides: {
            tooltip: {
                fontSize: 12,
                borderRadius: 8
            }
        }
    },
    MuiChip: {
        styleOverrides: {
            root: { borderRadius: 8 }
        }
    }
})

export const buildAppTheme = (mode) => createTheme({
    palette: mode === 'dark' ? darkPalette : lightPalette,
    typography: sharedTypography,
    shape: sharedShape,
    components: buildComponents(mode)
})

export default buildAppTheme
