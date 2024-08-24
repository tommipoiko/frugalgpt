import React, { useState } from 'react'
import {
    Box, Button, IconButton, Paper, Typography, List, ListItem
} from '@mui/material'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import SendIcon from '@mui/icons-material/Send'
import TextareaAutosize from '@mui/material/TextareaAutosize'
import chatApi from '../services/chatApi'

function Chat() {
    const [messages, setMessages] = useState([])
    const [currentMessage, setCurrentMessage] = useState('')
    const [attachments, setAttachments] = useState([])

    const handleSendMessage = async () => {
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

        const responseStream = await chatApi.sendMessage(newMessage)

        if (responseStream) {
            responseStream.on('textCreated', () => {
                setMessages((prevMessages) => [
                    ...prevMessages,
                    { id: Date.now(), text: '', sender: 'system' }
                ])
            })

            responseStream.on('textDelta', (textDelta) => {
                setMessages((prevMessages) => {
                    const lastMessage = prevMessages[prevMessages.length - 1]
                    lastMessage.text += textDelta.value
                    return [...prevMessages]
                })
            })

            responseStream.on('toolCallCreated', (toolCall) => {
                setMessages((prevMessages) => [
                    ...prevMessages,
                    { id: Date.now(), text: `Tool: ${toolCall.type}`, sender: 'system' }
                ])
            })

            // eslint-disable-next-line no-unused-vars
            responseStream.on('toolCallDelta', (toolCallDelta) => {
                // Additional handling of tool calls can be done here
            })
        }
    }

    const handleAttachFile = (event) => {
        const file = event.target.files[0]
        if (file) {
            setAttachments([...attachments, { id: Date.now(), name: file.name }])
        }
    }

    const handleKeyDown = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            handleSendMessage()
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
                    maxWidth: '75%',
                    whiteSpace: 'pre-wrap'
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
                height: 'calc(100vh - 64px)',
                justifyContent: 'space-between',
                marginTop: '64px'
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
                    onKeyDown={handleKeyDown}
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
