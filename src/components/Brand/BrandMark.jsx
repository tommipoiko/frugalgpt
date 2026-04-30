import React from 'react'
import { Box, Typography } from '@mui/material'
import { brandGradient } from '../../theme'

function BrandMark({ size = 28, showWordmark = true, wordmarkVariant = 'h6' }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box
                sx={{
                    width: size,
                    height: size,
                    borderRadius: '12px',
                    backgroundImage: brandGradient,
                    boxShadow: '0 6px 20px -6px rgba(16,185,129,0.55)',
                    position: 'relative',
                    overflow: 'hidden',
                    flexShrink: 0,
                    '::after': {
                        content: '""',
                        position: 'absolute',
                        inset: 0,
                        background: 'radial-gradient(circle at 30% 30%,'
                            + ' rgba(255,255,255,0.45), transparent 55%)'
                    }
                }}
            />
            {showWordmark && (
                <Typography
                    variant={wordmarkVariant}
                    sx={{
                        fontWeight: 700,
                        letterSpacing: '-0.02em',
                        backgroundImage: brandGradient,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                    }}
                >
                    FrugalGPT
                </Typography>
            )}
        </Box>
    )
}

export default BrandMark
