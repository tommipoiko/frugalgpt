import React from 'react'
import { Box, IconButton, Tooltip } from '@mui/material'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import CopyIcon from '@mui/icons-material/ContentCopy'

function CodeBlock({
    inline, className, children, ...props
}) {
    const match = /language-(\w+)/.exec(className || '')

    return !inline && match ? (
        <Box sx={{ position: 'relative' }}>
            <CopyToClipboard text={String(children).trim()}>
                <Tooltip title="Copy to clipboard">
                    <IconButton
                        size="small"
                        sx={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            zIndex: 1,
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            color: '#fff'
                        }}
                    >
                        <CopyIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </CopyToClipboard>
            <SyntaxHighlighter
                style={materialDark}
                language={match[1]}
                PreTag="div"
                customStyle={{
                    margin: 0,
                    paddingRight: '30px',
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
