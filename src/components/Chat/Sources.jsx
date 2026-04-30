import React from 'react'
import {
    Box, Typography, Stack, Paper
} from '@mui/material'
import LinkRoundedIcon from '@mui/icons-material/LinkRounded'

const getDomain = (url) => {
    try {
        return new URL(url).hostname.replace(/^www\./, '')
    } catch (e) {
        return url
    }
}

const getFaviconUrl = (url) => {
    try {
        const u = new URL(url)
        return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`
    } catch (e) {
        return null
    }
}

function Sources({ sources }) {
    if (!sources || sources.length === 0) return null

    return (
        <Box sx={{ mt: 2 }}>
            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1 }}>
                <LinkRoundedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography
                    variant="caption"
                    sx={{
                        color: 'text.secondary',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em'
                    }}
                >
                    Sources
                </Typography>
            </Stack>
            <Stack direction="row" flexWrap="wrap" gap={1}>
                {sources.map((source, index) => {
                    const domain = getDomain(source.url)
                    const favicon = getFaviconUrl(source.url)
                    return (
                        <Paper
                            // eslint-disable-next-line react/no-array-index-key
                            key={`${source.url}-${index}`}
                            component="a"
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="outlined"
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                px: 1.25,
                                py: 0.75,
                                textDecoration: 'none',
                                color: 'inherit',
                                maxWidth: 320,
                                transition: 'all 120ms ease',
                                '&:hover': {
                                    borderColor: 'primary.main',
                                    transform: 'translateY(-1px)'
                                }
                            }}
                        >
                            <Box
                                sx={{
                                    width: 22,
                                    height: 22,
                                    borderRadius: '6px',
                                    overflow: 'hidden',
                                    background: (theme) => (theme.palette.mode === 'dark'
                                        ? 'rgba(255,255,255,0.06)'
                                        : 'rgba(15,23,42,0.06)'),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}
                            >
                                {favicon ? (
                                    <Box
                                        component="img"
                                        src={favicon}
                                        alt=""
                                        sx={{ width: 16, height: 16 }}
                                    />
                                ) : (
                                    <LinkRoundedIcon sx={{ fontSize: 14 }} />
                                )}
                            </Box>
                            <Box sx={{ minWidth: 0, lineHeight: 1.2 }}>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        display: 'block',
                                        fontWeight: 600,
                                        color: 'text.primary',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}
                                    title={source.title || domain}
                                >
                                    {source.title || domain}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        display: 'block',
                                        color: 'text.secondary',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        fontSize: '0.7rem'
                                    }}
                                >
                                    {domain}
                                </Typography>
                            </Box>
                        </Paper>
                    )
                })}
            </Stack>
        </Box>
    )
}

export default Sources
