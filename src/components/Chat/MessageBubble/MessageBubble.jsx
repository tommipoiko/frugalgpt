import React from 'react'
import { Box, Paper, Typography } from '@mui/material'
import ReactMarkdown from 'react-markdown'
import CodeBlock from './CodeBlock'

function MessageBubble({ message, theme }) {
    if (message.role === 'user') {
        return (
            <Paper
                elevation={3}
                sx={{
                    paddingTop: 1.5,
                    paddingBottom: 1.5,
                    paddingLeft: 2,
                    paddingRight: 2,
                    backgroundColor: theme.palette.primary.light,
                    color: theme.palette.primary.contrastText,
                    maxWidth: '90%',
                    whiteSpace: 'pre-wrap'
                }}
            >
                {message.content}
                {message.attachments && message.attachments.length > 0 && (
                    <Box sx={{ marginTop: 1 }}>
                        {message.attachments.map((attachment) => (
                            <Typography key={attachment.id} variant="body2" color="textSecondary">
                                {attachment.name}
                            </Typography>
                        ))}
                    </Box>
                )}
            </Paper>
        )
    }
    return (
        <Paper
            elevation={3}
            sx={{
                paddingLeft: 2,
                paddingRight: 2,
                paddingBottom: 2,
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.text.primary,
                maxWidth: '100%'
            }}
        >
            <ReactMarkdown
                components={{
                    code: CodeBlock
                }}
            >
                {message.content}
            </ReactMarkdown>
        </Paper>
    )
}

export default MessageBubble
