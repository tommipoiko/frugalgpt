import React from 'react'
import {
    Box, IconButton, Tooltip, Typography
} from '@mui/material'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import CopyIcon from '@mui/icons-material/ContentCopy'

function CodeBlock({
    inline, className, children, ...props
}) {
    const match = /language-(\w+)/.exec(className || '')
    const language = match ? match[1] : 'text'

    return !inline && match ? (
        <Box sx={{ position: 'relative', borderRadius: 1, overflow: 'hidden' }}>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    color: '#fff',
                    padding: '4px 8px',
                    fontSize: '0.875rem'
                }}
            >
                <Typography variant="caption" color="inherit">
                    {language}
                </Typography>
                <CopyToClipboard text={String(children).trim()}>
                    <Tooltip title="Copy code">
                        <IconButton
                            size="small"
                            sx={{
                                color: '#fff',
                                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.2)'
                                }
                            }}
                        >
                            <CopyIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </CopyToClipboard>
            </Box>
            <SyntaxHighlighter
                style={materialDark}
                language={language}
                PreTag="div"
                customStyle={{
                    margin: 0,
                    padding: '12px',
                    overflowX: 'auto'
                }}
                {...props}
            >
                {String(children).trim()}
            </SyntaxHighlighter>
        </Box>
    ) : (
        <code className={className} {...props}>
            {children}
        </code>
    )
}

export default CodeBlock
