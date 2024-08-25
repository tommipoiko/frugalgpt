import React, { useEffect, useState } from 'react'
import {
    List, ListItem, ListItemText, IconButton, Menu, MenuItem, ListItemSecondaryAction, Typography
} from '@mui/material'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import ShareIcon from '@mui/icons-material/Share'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import {
    collection, query, orderBy, onSnapshot,
    where
} from 'firebase/firestore'
import { db } from '../services/firebase'

function Sidenav({ user, onNavigateChat }) {
    const [chats, setChats] = useState([])
    const [anchorEl, setAnchorEl] = useState(null)
    const [selectedChat, setSelectedChat] = useState(null)

    useEffect(() => {
        if (!user) {
            setChats([])
            return
        }
        const q = query(
            collection(db, 'chats'),
            where('userId', '==', user.uid),
            orderBy('lastUpdated', 'desc')
        )

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const chatList = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data()
            }))
            setChats(chatList)
        })

        return () => unsubscribe() // eslint-disable-line
    }, [user])

    const handleMenuOpen = (event, chatId) => {
        setAnchorEl(event.currentTarget)
        setSelectedChat(chatId)
    }

    const handleMenuClose = () => {
        setAnchorEl(null)
        console.log(selectedChat)
        setSelectedChat(null)
    }

    const handleRename = () => {
        // Implement rename handler here
        handleMenuClose()
    }

    const handleShare = () => {
        // Implement share handler here
        handleMenuClose()
    }

    const handleDelete = () => {
        // Implement delete handler here
        handleMenuClose()
    }

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
                    <ListItemSecondaryAction>
                        <IconButton
                            edge="end"
                            aria-label="options"
                            onClick={(event) => handleMenuOpen(event, chat.id)}
                        >
                            <MoreVertIcon />
                        </IconButton>
                    </ListItemSecondaryAction>
                </ListItem>
            ))}
            {chats.length === 0 && (
                <ListItem>
                    <Typography variant="body2" color="textSecondary">
                        Previous chats will be listed here.
                    </Typography>
                </ListItem>
            )}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                PaperProps={{
                    style: {
                        padding: '4px 0',
                        borderRadius: '8px',
                        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)'
                    }
                }}
            >
                <MenuItem onClick={handleShare}>
                    <ShareIcon fontSize="small" sx={{ marginRight: 1 }} />
                    Share
                </MenuItem>
                <MenuItem onClick={handleRename}>
                    <EditIcon fontSize="small" sx={{ marginRight: 1 }} />
                    Rename
                </MenuItem>
                <MenuItem onClick={handleDelete} sx={{ color: 'red' }}>
                    <DeleteIcon fontSize="small" sx={{ marginRight: 1, color: 'red' }} />
                    Delete
                </MenuItem>
            </Menu>
        </List>
    )
}

export default Sidenav
