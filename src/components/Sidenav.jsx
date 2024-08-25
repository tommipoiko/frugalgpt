import React, { useEffect, useState } from 'react'
import {
    List, ListItem, ListItemText, IconButton, Menu, MenuItem, ListItemSecondaryAction, Typography,
    Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button, TextField
} from '@mui/material'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import ShareIcon from '@mui/icons-material/Share'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import {
    collection, query, orderBy, onSnapshot, where, doc, updateDoc, deleteDoc
} from 'firebase/firestore'
import { db } from '../services/firebase'

function Sidenav({ user, onNavigateChat }) {
    const [chats, setChats] = useState([])
    const [anchorEl, setAnchorEl] = useState(null)
    const [selectedChat, setSelectedChat] = useState(null)
    const [renameChatId, setRenameChatId] = useState(null)
    const [editedName, setEditedName] = useState('')
    const [deleteChatId, setDeleteChatId] = useState(null)
    const [deleteChatName, setDeleteChatName] = useState('')
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
    const [openRenameDialog, setOpenRenameDialog] = useState(false)
    const [openShareDialog, setOpenShareDialog] = useState(false)
    const [shareChatLink, setShareChatLink] = useState('')

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
            const chatList = snapshot.docs.map((document) => ({
                id: document.id,
                ...document.data()
            }))
            setChats(chatList)
        })

        return () => unsubscribe() // eslint-disable-line
    }, [user])

    const handleMenuOpen = (event, chatId) => {
        event.preventDefault()
        setAnchorEl(event.currentTarget)
        setSelectedChat(chatId)
    }

    const handleMenuClose = () => {
        setAnchorEl(null)
        setSelectedChat(null)
    }

    const handleRenameClick = (chatId, currentName) => {
        setRenameChatId(chatId)
        setEditedName(currentName)
        setOpenRenameDialog(true)
        handleMenuClose()
    }

    const handleRenameSubmit = async (event) => {
        event.preventDefault()
        if (editedName.trim() && renameChatId) {
            const chatRef = doc(db, 'chats', renameChatId)
            try {
                await updateDoc(chatRef, { name: editedName.trim() })
            } catch (error) {
                console.error('Error renaming chat: ', error)
            } finally {
                setOpenRenameDialog(false)
                setSelectedChat(null)
                setRenameChatId(null)
                setEditedName('')
            }
        } else {
            setOpenRenameDialog(false)
        }
    }

    const handleRenameCancel = () => {
        setOpenRenameDialog(false)
        setSelectedChat(null)
    }

    const handleDeleteClick = (chatId, chatName) => {
        setDeleteChatId(chatId)
        setDeleteChatName(chatName)
        setOpenDeleteDialog(true)
        handleMenuClose()
    }

    const handleDeleteConfirm = async () => {
        if (deleteChatId) {
            const chatRef = doc(db, 'chats', deleteChatId)
            try {
                await deleteDoc(chatRef)
            } catch (error) {
                console.error('Error deleting chat: ', error)
            } finally {
                setOpenDeleteDialog(false)
                setSelectedChat(null)
                setDeleteChatId(null)
                setDeleteChatName('')
            }
        }
    }

    const handleDeleteCancel = () => {
        setOpenDeleteDialog(false)
        setSelectedChat(null)
    }

    const handleShareClick = (chatId) => {
        const shareLink = `${window.location.origin}/chats/${chatId}`
        setShareChatLink(shareLink)
        setOpenShareDialog(true)
        handleMenuClose()
    }

    const handleShareClose = () => {
        setOpenShareDialog(false)
    }

    return (
        <>
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
            </List>
            <Menu
                anchorEl={anchorEl}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left'
                }}
                keepMounted
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left'
                }}
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
                <MenuItem onClick={() => handleShareClick(selectedChat)}>
                    <ShareIcon fontSize="small" sx={{ marginRight: 1 }} />
                    Share
                </MenuItem>
                {/* eslint-disable-next-line */}
                <MenuItem onClick={() => handleRenameClick(selectedChat, chats.find((chat) => chat.id === selectedChat).name)}>
                    <EditIcon fontSize="small" sx={{ marginRight: 1 }} />
                    Rename
                </MenuItem>
                {/* eslint-disable-next-line */}
                <MenuItem onClick={() => handleDeleteClick(selectedChat, chats.find((chat) => chat.id === selectedChat).name)} sx={{ color: 'red' }}>
                    <DeleteIcon fontSize="small" sx={{ marginRight: 1, color: 'red' }} />
                    Delete
                </MenuItem>
            </Menu>

            <Dialog
                open={openShareDialog}
                onClose={handleShareClose}
                aria-labelledby="share-dialog-title"
                aria-describedby="share-dialog-description"
                PaperProps={{ style: { maxWidth: '90%', minWidth: '400px' } }}
            >
                <DialogTitle id="share-dialog-title">Share chat</DialogTitle>
                <DialogContent>
                    <DialogContentText id="share-dialog-description">
                        Signed in users can read your chat history using the following link:
                    </DialogContentText>
                    <Button
                        fullWidth
                        variant="outlined"
                        sx={{ marginTop: 2 }}
                        onClick={() => {
                            navigator.clipboard.writeText(shareChatLink)
                        }}
                    >
                        {shareChatLink}
                    </Button>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={handleShareClose}
                        color="primary"
                        variant="contained"
                    >
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={openRenameDialog}
                onClose={handleRenameCancel}
                aria-labelledby="rename-dialog-title"
                PaperProps={{
                    component: 'form',
                    onSubmit: handleRenameSubmit,
                    style: { maxWidth: '90%', minWidth: '400px' }
                }}
            >
                <DialogTitle id="rename-dialog-title">Rename chat</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Enter a new name for the chat
                    </DialogContentText>
                    <TextField
                        autoFocus
                        required
                        fullWidth
                        variant="outlined"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={handleRenameCancel}
                        color="primary"
                        variant="contained"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        color="primary"
                        variant="contained"
                    >
                        Rename
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={openDeleteDialog}
                onClose={handleDeleteCancel}
                aria-labelledby="delete-dialog-title"
                aria-describedby="delete-dialog-description"
                PaperProps={{ style: { maxWidth: '90%', minWidth: '400px' } }}
            >
                <DialogTitle id="delete-dialog-title">Delete chat?</DialogTitle>
                <DialogContent>
                    <DialogContentText id="delete-dialog-description">
                        This will delete the chat
                        {' '}
                        <b>{deleteChatName}</b>
                        .
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={handleDeleteCancel}
                        color="primary"
                        variant="contained"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDeleteConfirm}
                        color="error"
                        variant="contained"
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    )
}

export default Sidenav
