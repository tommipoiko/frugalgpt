import React, { useState, useEffect } from 'react'
import {
    List, ListItem, ListItemText, Typography
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../services/firebase'

function Sidenav() {
    const navigate = useNavigate()
    const [chats, setChats] = useState([])

    useEffect(() => {
        const fetchChats = async () => {
            const chatCollection = collection(db, 'chats')
            const chatSnapshot = await getDocs(chatCollection)
            const chatList = chatSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data()
            }))
            setChats(chatList)
        }

        fetchChats()
    }, [])

    const handleNewChat = () => {
        navigate('/chat/new')
    }

    const handleChatClick = (id) => {
        navigate(`/chat/${id}`)
    }

    return (
        <List>
            <ListItem button onClick={handleNewChat}>
                <ListItemText primary="New Chat" />
            </ListItem>
            {chats.map((chat) => (
                <ListItem
                    button
                    key={chat.id}
                    onClick={() => handleChatClick(chat.id)}
                >
                    <ListItemText
                        primary={chat.name}
                        primaryTypographyProps={{
                            noWrap: true,
                            style: {
                                maxWidth: '200px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }
                        }}
                    />
                </ListItem>
            ))}
            {chats.length === 0 && (
                <ListItem>
                    <Typography variant="body2" color="textSecondary">
                        Previous chats will be listed here.
                    </Typography>
                </ListItem>
            )}
        </List>
    )
}

export default Sidenav
