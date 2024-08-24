import React, { useState } from 'react'
import {
    Box, Button, IconButton, Paper, Typography, List, ListItem
} from '@mui/material'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import SendIcon from '@mui/icons-material/Send'
import TextareaAutosize from '@mui/material/TextareaAutosize'

function Chat() {
    const [messages, setMessages] = useState([])
    const [currentMessage, setCurrentMessage] = useState('')
    const [attachments, setAttachments] = useState([])

    const handleSendMessage = () => {
        if (currentMessage.trim() === '') return

        const newMessage = {
            id: Date.now(),
            text: currentMessage,
            sender: 'user',
            attachments
        }

        setMessages([...messages, newMessage])
        setCurrentMessage('')
        setAttachments([])
    }

    const handleAttachFile = (event) => {
        const file = event.target.files[0]
        if (file) {
            setAttachments([...attachments, file])
        }
    }

    const renderMessage = (message) => (
        <ListItem
            key={message.id}
            sx={{
                justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                overflowWrap: 'break-word',
                wordBreak: 'break-word'
            }}
        >
            <Paper
                elevation={3}
                sx={{
                    padding: 2,
                    backgroundColor: message.sender === 'user' ? '#e0f7fa' : '#f1f1f1',
                    maxWidth: '75%'
                }}
            >
                <Typography variant="body1">{message.text}</Typography>
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
        </ListItem>
    )

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',
                justifyContent: 'space-between'
            }}
        >
            <Box
                sx={{
                    flexGrow: 1,
                    overflowY: 'auto',
                    padding: 2
                }}
            >
                <List>
                    {messages.map((message) => renderMessage(message))}
                </List>
            </Box>

            <Box
                component="form"
                sx={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    padding: 1,
                    position: 'sticky',
                    bottom: 0,
                    backgroundColor: 'white'
                }}
                onSubmit={(e) => {
                    e.preventDefault()
                    handleSendMessage()
                }}
            >
                <IconButton color="primary" component="label">
                    <AttachFileIcon />
                    <input
                        type="file"
                        hidden
                        onChange={handleAttachFile}
                    />
                </IconButton>
                <TextareaAutosize
                    minRows={1}
                    maxRows={14}
                    placeholder="Type your message..."
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    style={{
                        width: '100%',
                        marginLeft: '8px',
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid #ccc',
                        resize: 'none',
                        overflowY: 'auto',
                        fontSize: '16px'
                    }}
                />
                <Button
                    variant="contained"
                    color="primary"
                    type="submit"
                    sx={{ marginLeft: 1, alignSelf: 'flex-end' }}
                    endIcon={<SendIcon />}
                >
                    Send
                </Button>
            </Box>
        </Box>
    )
}

export default Chat
