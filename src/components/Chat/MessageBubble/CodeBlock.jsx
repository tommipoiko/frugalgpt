import React, { useState } from 'react'
import {
    Box, IconButton, Tooltip, Typography
} from '@mui/material'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'

function CodeBlock({
    inline, className, children, ...props
}) {
    const [copied, setCopied] = useState(false)
    const match = /language-(\w+)/.exec(className || '')
    const language = match ? match[1] : 'text'
    const code = String(children).replace(/\n$/, '')

    const handleCopied = () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1400)
    }

    if (inline || !match) {
        return (
            <code className={className} {...props}>
                {children}
            </code>
        )
    }

    return (
        <Box
            sx={{
                my: 1.25,
                borderRadius: 2,
                overflow: 'hidden',
                border: (theme) => (theme.palette.mode === 'dark'
                    ? '1px solid rgba(255,255,255,0.08)'
                    : '1px solid rgba(15,23,42,0.10)'),
                backgroundColor: '#1E1E2E'
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 1.5,
                    py: 0.75,
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderBottom: '1px solid rgba(255,255,255,0.06)'
                }}
            >
                <Typography
                    variant="caption"
                    sx={{
                        color: 'rgba(255,255,255,0.7)',
                        fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
                        fontSize: '0.75rem',
                        letterSpacing: '0.04em'
                    }}
                >
                    {language}
                </Typography>
                <CopyToClipboard text={code} onCopy={handleCopied}>
                    <Tooltip title={copied ? 'Copied!' : 'Copy code'}>
                        <IconButton
                            size="small"
                            sx={{
                                color: copied ? '#86efac' : 'rgba(255,255,255,0.75)',
                                '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' }
                            }}
                        >
                            {copied
                                ? <CheckRoundedIcon sx={{ fontSize: 16 }} />
                                : <ContentCopyRoundedIcon sx={{ fontSize: 16 }} />}
                        </IconButton>
                    </Tooltip>
                </CopyToClipboard>
            </Box>
            <SyntaxHighlighter
                style={oneDark}
                language={language}
                PreTag="div"
                customStyle={{
                    margin: 0,
                    padding: '14px 16px',
                    overflowX: 'auto',
                    background: 'transparent',
                    fontSize: '0.82rem',
                    lineHeight: 1.55
                }}
                {...props}
            >
                {code}
            </SyntaxHighlighter>
        </Box>
    )
}

export default CodeBlock
