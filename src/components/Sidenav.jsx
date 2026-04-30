import React, { useEffect, useMemo, useState } from 'react'
import {
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    IconButton,
    Menu,
    MenuItem,
    Typography,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Button,
    TextField,
    Box,
    Divider
} from '@mui/material'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded'
import {
    collection, query, orderBy, onSnapshot, where, doc, updateDoc, deleteDoc
} from 'firebase/firestore'
import { db } from '../services/firebase'
import { brandGradient } from '../theme'

const groupChatsByRecency = (chats) => {
    const now = Date.now()
    const dayMs = 24 * 60 * 60 * 1000
    const groups = {
        Today: [],
        'Previous 7 days': [],
        'Previous 30 days': [],
        Older: []
    }

    chats.forEach((chat) => {
        const millisFromToMillis = chat.lastUpdated?.toMillis?.()
        const millisFromSeconds = chat.lastUpdated?.seconds
            ? chat.lastUpdated.seconds * 1000
            : 0
        const lastUpdated = millisFromToMillis || millisFromSeconds || 0
        const ageDays = lastUpdated ? (now - lastUpdated) / dayMs : Infinity
        if (ageDays < 1) groups.Today.push(chat)
        else if (ageDays < 7) groups['Previous 7 days'].push(chat)
        else if (ageDays < 30) groups['Previous 30 days'].push(chat)
        else groups.Older.push(chat)
    })

    return Object.entries(groups).filter(([, items]) => items.length > 0)
}

function Sidenav({ user, onNavigateChat, currentChatId }) {
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
            return undefined
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
        return () => unsubscribe()
    }, [user])

    const grouped = useMemo(() => groupChatsByRecency(chats), [chats])

    const handleMenuOpen = (event, chatId) => {
        event.preventDefault()
        event.stopPropagation()
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

    const renderChatRow = (chat) => {
        const isSelected = currentChatId === chat.id
        return (
            <ListItem
                key={chat.id}
                disablePadding
                sx={{ px: 1, mb: 0.25 }}
                secondaryAction={(
                    <IconButton
                        edge="end"
                        size="small"
                        aria-label="options"
                        onClick={(event) => handleMenuOpen(event, chat.id)}
                        sx={{
                            opacity: 0,
                            transition: 'opacity 120ms ease',
                            '.MuiListItem-root:hover &': { opacity: 1 },
                            '&:focus-visible': { opacity: 1 }
                        }}
                    >
                        <MoreVertIcon fontSize="small" />
                    </IconButton>
                )}
            >
                <ListItemButton
                    selected={isSelected}
                    onClick={() => onNavigateChat(chat.id)}
                    sx={{
                        gap: 1,
                        py: 0.75,
                        pr: 4.5,
                        '&.Mui-selected': {
                            backgroundColor: 'action.selected'
                        }
                    }}
                >
                    <ChatBubbleOutlineRoundedIcon
                        sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }}
                    />
                    <ListItemText
                        primary={chat.name || 'Untitled chat'}
                        primaryTypographyProps={{
                            noWrap: true,
                            title: chat.name,
                            fontSize: '0.875rem',
                            fontWeight: isSelected ? 600 : 500
                        }}
                    />
                </ListItemButton>
            </ListItem>
        )
    }

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                minHeight: 0,
                overflow: 'hidden'
            }}
        >
            <Box sx={{ px: 2, pb: 1.5 }}>
                <Button
                    fullWidth
                    variant="contained"
                    startIcon={<AddRoundedIcon />}
                    onClick={() => onNavigateChat('new')}
                    sx={{
                        py: 1.1,
                        backgroundImage: brandGradient,
                        boxShadow: '0 6px 20px -8px rgba(16,185,129,0.5)'
                    }}
                >
                    New chat
                </Button>
            </Box>
            <Divider sx={{ mx: 2 }} />
            <Box sx={{
                flex: 1, minHeight: 0, overflowY: 'auto', pt: 1, pb: 2
            }}
            >
                {chats.length === 0 ? (
                    <Box sx={{ px: 2, py: 4, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                            Your chats will appear here.
                        </Typography>
                    </Box>
                ) : (
                    grouped.map(([label, items]) => (
                        <Box key={label} sx={{ mb: 1 }}>
                            <Typography
                                variant="overline"
                                sx={{
                                    display: 'block',
                                    px: 3,
                                    pt: 1.5,
                                    pb: 0.5,
                                    color: 'text.secondary',
                                    fontWeight: 600,
                                    letterSpacing: '0.06em'
                                }}
                            >
                                {label}
                            </Typography>
                            <List disablePadding>
                                {items.map(renderChatRow)}
                            </List>
                        </Box>
                    ))
                )}
            </Box>

            <Menu
                anchorEl={anchorEl}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                keepMounted
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
            >
                <MenuItem
                    onClick={() => handleShareClick(selectedChat)}
                    sx={{ minWidth: 160, gap: 1.25 }}
                >
                    <ShareOutlinedIcon fontSize="small" />
                    Share
                </MenuItem>
                <MenuItem
                    onClick={() => handleRenameClick(
                        selectedChat,
                        chats.find((chat) => chat.id === selectedChat)?.name || ''
                    )}
                    sx={{ minWidth: 160, gap: 1.25 }}
                >
                    <EditOutlinedIcon fontSize="small" />
                    Rename
                </MenuItem>
                <Divider sx={{ my: 0.5 }} />
                <MenuItem
                    onClick={() => handleDeleteClick(
                        selectedChat,
                        chats.find((chat) => chat.id === selectedChat)?.name || ''
                    )}
                    sx={{ minWidth: 160, gap: 1.25, color: 'error.main' }}
                >
                    <DeleteOutlineIcon fontSize="small" />
                    Delete
                </MenuItem>
            </Menu>

            <Dialog
                open={openShareDialog}
                onClose={handleShareClose}
                aria-labelledby="share-dialog-title"
                PaperProps={{ sx: { maxWidth: '90%', minWidth: 380, borderRadius: 3 } }}
            >
                <DialogTitle id="share-dialog-title">Share chat</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Signed in users can read your chat history with this link:
                    </DialogContentText>
                    <Button
                        fullWidth
                        variant="outlined"
                        sx={{
                            mt: 2,
                            justifyContent: 'flex-start',
                            textTransform: 'none',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}
                        onClick={() => navigator.clipboard.writeText(shareChatLink)}
                    >
                        {shareChatLink}
                    </Button>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleShareClose} variant="contained">
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
                    sx: { maxWidth: '90%', minWidth: 400, borderRadius: 3 }
                }}
            >
                <DialogTitle id="rename-dialog-title">Rename chat</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        Enter a new name for the chat
                    </DialogContentText>
                    <TextField
                        autoFocus
                        required
                        fullWidth
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleRenameCancel}>Cancel</Button>
                    <Button type="submit" variant="contained">
                        Rename
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={openDeleteDialog}
                onClose={handleDeleteCancel}
                aria-labelledby="delete-dialog-title"
                PaperProps={{ sx: { maxWidth: '90%', minWidth: 400, borderRadius: 3 } }}
            >
                <DialogTitle id="delete-dialog-title">Delete chat?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        This will permanently delete
                        {' '}
                        <strong>{deleteChatName || 'this chat'}</strong>
                        .
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDeleteCancel}>Cancel</Button>
                    <Button
                        onClick={handleDeleteConfirm}
                        color="error"
                        variant="contained"
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
}

export default Sidenav
