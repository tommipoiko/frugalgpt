import React from 'react'
import { Box, Typography } from '@mui/material'
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined'
import ReactMarkdown from 'react-markdown'
import CodeBlock from './CodeBlock'
import Sources from '../Sources'
import { brandGradient } from '../../../theme'

function MessageBubble({ message }) {
    const isUser = message.role === 'user'

    if (isUser) {
        return (
            <Box
                sx={{
                    maxWidth: '85%',
                    px: 2,
                    py: 1.25,
                    borderRadius: '20px 20px 4px 20px',
                    backgroundImage: brandGradient,
                    color: '#FFFFFF',
                    boxShadow: '0 8px 24px -16px rgba(16,185,129,0.6)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                }}
            >
                <Typography variant="body1" sx={{ color: 'inherit' }}>
                    {message.content}
                </Typography>
                {message.attachments && message.attachments.length > 0 && (
                    <Box sx={{
                        mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5
                    }}
                    >
                        {message.attachments.map((attachment) => (
                            <Box
                                key={attachment.id}
                                sx={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 0.75,
                                    fontSize: '0.8rem',
                                    opacity: 0.9
                                }}
                            >
                                <InsertDriveFileOutlinedIcon sx={{ fontSize: 14 }} />
                                {attachment.name}
                            </Box>
                        ))}
                    </Box>
                )}
            </Box>
        )
    }

    return (
        <Box
            sx={{
                display: 'flex',
                gap: 1.5,
                width: '100%',
                alignItems: 'flex-start'
            }}
        >
            <Box
                sx={{
                    width: 30,
                    height: 30,
                    borderRadius: '10px',
                    backgroundImage: brandGradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    flexShrink: 0,
                    boxShadow: '0 6px 16px -10px rgba(16,185,129,0.6)',
                    mt: 0.25
                }}
            >
                <AutoAwesomeRoundedIcon sx={{ fontSize: 16 }} />
            </Box>
            <Box
                sx={{
                    flex: 1,
                    minWidth: 0,
                    color: 'text.primary',
                    '& p': { margin: '0 0 0.75em' },
                    '& p:last-child': { marginBottom: 0 },
                    '& ul, & ol': { paddingLeft: '1.4em', margin: '0 0 0.75em' },
                    '& li': { marginBottom: '0.25em' },
                    '& h1, & h2, & h3, & h4': {
                        fontWeight: 600,
                        margin: '1em 0 0.5em',
                        letterSpacing: '-0.015em'
                    },
                    '& a': {
                        color: 'primary.main',
                        textDecoration: 'none',
                        borderBottom: (theme) => `1px solid ${theme.palette.primary.main}55`,
                        '&:hover': { borderBottomColor: 'primary.main' }
                    },
                    '& blockquote': {
                        borderLeft: (theme) => `3px solid ${theme.palette.divider}`,
                        margin: '0.5em 0',
                        padding: '0 1em',
                        color: 'text.secondary'
                    },
                    '& :not(pre) > code': {
                        background: (theme) => (theme.palette.mode === 'dark'
                            ? 'rgba(255,255,255,0.08)'
                            : 'rgba(15,23,42,0.06)'),
                        padding: '0.15em 0.4em',
                        borderRadius: '6px',
                        fontSize: '0.85em',
                        fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace'
                    }
                }}
            >
                {message.content
                    ? (
                        <ReactMarkdown components={{ code: CodeBlock }}>
                            {message.content}
                        </ReactMarkdown>
                    )
                    : (
                        <Box sx={{ display: 'flex', gap: 0.5, py: 1 }}>
                            {[0, 1, 2].map((dot) => (
                                <Box
                                    key={dot}
                                    sx={{
                                        width: 6,
                                        height: 6,
                                        borderRadius: '50%',
                                        background: 'text.secondary',
                                        backgroundColor: 'text.secondary',
                                        opacity: 0.4,
                                        animation: 'brandShimmer 1.4s linear infinite',
                                        animationDelay: `${dot * 0.18}s`
                                    }}
                                />
                            ))}
                        </Box>
                    )}
                {Array.isArray(message.sources) && message.sources.length > 0 && (
                    <Sources sources={message.sources} />
                )}
            </Box>
        </Box>
    )
}

export default MessageBubble
