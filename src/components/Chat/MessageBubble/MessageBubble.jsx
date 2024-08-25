import React from 'react'
import { Box, Paper, Typography } from '@mui/material'
import ReactMarkdown from 'react-markdown'
import CodeBlock from './CodeBlock'

function MessageBubble({ message, theme }) {
    return (
        <Paper
            elevation={3}
            sx={{
                paddingLeft: 1,
                paddingRight: 1,
                backgroundColor: message.role === 'user'
                    ? theme.palette.primary.light
                    : theme.palette.background.paper,
                color: message.role === 'user'
                    ? theme.palette.primary.contrastText
                    : theme.palette.text.primary,
                maxWidth: message.role === 'user' ? '90%' : '100%'
            }}
        >
            <ReactMarkdown
                components={{
                    code: CodeBlock
                }}
            >
                {message.content}
            </ReactMarkdown>
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

export default MessageBubble
