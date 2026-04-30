import React from 'react'
import {
    Box, Typography, Paper, Stack
} from '@mui/material'
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined'
import TravelExploreRoundedIcon from '@mui/icons-material/TravelExploreRounded'
import CodeRoundedIcon from '@mui/icons-material/CodeRounded'
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded'
import { brandGradient } from '../../theme'

const SUGGESTIONS = [
    {
        icon: <TravelExploreRoundedIcon />,
        title: 'Search the web',
        description: 'What is happening in tech today?'
    },
    {
        icon: <LightbulbOutlinedIcon />,
        title: 'Brainstorm ideas',
        description: 'Help me name a side project about productivity'
    },
    {
        icon: <CodeRoundedIcon />,
        title: 'Write code',
        description: 'Show me a clean React hook for debouncing'
    },
    {
        icon: <EditNoteRoundedIcon />,
        title: 'Draft something',
        description: 'Write a friendly out-of-office email'
    }
]

function EmptyState({ onSelectSuggestion }) {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '60vh',
                px: 2,
                gap: 4,
                width: '100%'
            }}
        >
            <Box sx={{ textAlign: 'center' }}>
                <Box
                    sx={{
                        width: 56,
                        height: 56,
                        margin: '0 auto 18px',
                        borderRadius: '18px',
                        backgroundImage: brandGradient,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        boxShadow: '0 18px 40px -16px rgba(16,185,129,0.7)'
                    }}
                >
                    <AutoAwesomeRoundedIcon />
                </Box>
                <Typography
                    variant="h4"
                    sx={{
                        fontWeight: 700,
                        backgroundImage: brandGradient,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        mb: 1
                    }}
                >
                    How can I help today?
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Ask anything. I can search the web for the latest information.
                </Typography>
            </Box>

            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                flexWrap="wrap"
                gap={1.5}
                justifyContent="center"
                sx={{ maxWidth: 760, width: '100%' }}
            >
                {SUGGESTIONS.map((suggestion) => (
                    <Paper
                        key={suggestion.title}
                        variant="outlined"
                        onClick={() => onSelectSuggestion?.(suggestion.description)}
                        sx={{
                            flex: { sm: '1 1 calc(50% - 12px)' },
                            minWidth: { sm: 280 },
                            cursor: 'pointer',
                            p: 2,
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 1.5,
                            transition: 'all 150ms ease',
                            '&:hover': {
                                borderColor: 'primary.main',
                                transform: 'translateY(-1px)',
                                boxShadow: (theme) => (theme.palette.mode === 'dark'
                                    ? '0 8px 24px -12px rgba(0,0,0,0.6)'
                                    : '0 8px 24px -12px rgba(15,23,42,0.15)')
                            }
                        }}
                    >
                        <Box
                            sx={{
                                width: 32,
                                height: 32,
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: (theme) => (theme.palette.mode === 'dark'
                                    ? 'rgba(52,211,153,0.10)'
                                    : 'rgba(16,185,129,0.08)'),
                                color: 'primary.main',
                                flexShrink: 0
                            }}
                        >
                            {suggestion.icon}
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.25 }}>
                                {suggestion.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" noWrap>
                                {suggestion.description}
                            </Typography>
                        </Box>
                    </Paper>
                ))}
            </Stack>
        </Box>
    )
}

export default EmptyState
