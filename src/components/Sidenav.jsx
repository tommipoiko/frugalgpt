import React, { useEffect, useState } from 'react'
import {
    List, ListItem, ListItemText, Typography
} from '@mui/material'
import {
    getFirestore, collection, query, orderBy, onSnapshot
} from 'firebase/firestore'

function Sidenav({ onNavigateChat }) {
    const [chats, setChats] = useState([])

    useEffect(() => {
        const db = getFirestore()
        const q = query(collection(db, 'chats'), orderBy('lastUpdated', 'desc'))

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const chatList = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data()
            }))
            setChats(chatList)
        })

        return () => unsubscribe()
    }, [])

    return (
        <List>
            <ListItem button onClick={() => onNavigateChat('new')}>
                <ListItemText primary="New Chat" />
            </ListItem>
            {chats.map((chat) => (
                <ListItem button key={chat.id} onClick={() => onNavigateChat(chat.id)}>
                    <ListItemText
                        primary={chat.name}
                        primaryTypographyProps={{
                            noWrap: true,
                            title: chat.name
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
