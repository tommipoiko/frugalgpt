import React from 'react'
import { Box, Typography } from '@mui/material'
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import { brandShimmer } from '../../theme'

function ThinkingIndicator({ text }) {
    return (
        <Box
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1.25,
                px: 1.75,
                py: 0.875,
                borderRadius: 999,
                background: (theme) => (theme.palette.mode === 'dark'
                    ? 'rgba(52,211,153,0.10)'
                    : 'rgba(16,185,129,0.08)'),
                border: (theme) => (theme.palette.mode === 'dark'
                    ? '1px solid rgba(52,211,153,0.25)'
                    : '1px solid rgba(16,185,129,0.20)'),
                maxWidth: '100%'
            }}
        >
            <Box
                sx={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    backgroundImage: brandShimmer,
                    backgroundSize: '200% 200%',
                    animation: 'brandShimmer 2.4s linear infinite',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    flexShrink: 0
                }}
            >
                <AutoAwesomeRoundedIcon sx={{ fontSize: 12 }} />
            </Box>
            <Typography
                variant="body2"
                sx={{
                    fontWeight: 500,
                    backgroundImage: brandShimmer,
                    backgroundSize: '200% 200%',
                    animation: 'brandShimmer 3s linear infinite',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                }}
            >
                Thinking
            </Typography>
            {text && (
                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                        fontStyle: 'italic',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: 480
                    }}
                >
                    {text}
                </Typography>
            )}
        </Box>
    )
}

export default ThinkingIndicator
