import React from 'react'
import {
    Box, Typography
} from '@mui/material'
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import { brandGradient } from '../../theme'

function EmptyState() {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: { xs: 6, sm: 8 },
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

        </Box>
    )
}

export default EmptyState
