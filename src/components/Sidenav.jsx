import React, { useEffect, useMemo, useState } from 'react'
import {
    Plus,
    MessageCircle,
    MoreVertical,
    Share2,
    Pencil,
    Trash2
} from 'lucide-react'
import clsx from 'clsx'
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
    const [selectedChat, setSelectedChat] = useState(null)
    const [menuOpen, setMenuOpen] = useState(false)
    const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
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
        const r = event.currentTarget.getBoundingClientRect()
        setMenuPos({ top: r.bottom + 8, left: r.left })
        setSelectedChat(chatId)
        setMenuOpen(true)
    }

    const handleMenuClose = () => {
        setMenuOpen(false)
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

    const handleChatActivate = (chatId) => {
        onNavigateChat(chatId)
    }

    const renderChatRow = (chat) => {
        const isSelected = currentChatId === chat.id
        return (
            <li key={chat.id} className="group relative mb-0.5 px-2">
                <div className="relative flex items-center">
                    <button
                        type="button"
                        onClick={() => handleChatActivate(chat.id)}
                        onTouchEnd={(event) => {
                            event.preventDefault()
                            handleChatActivate(chat.id)
                        }}
                        className={clsx(
                            'flex flex-1 items-center gap-2 rounded-[10px] py-1.5 pl-2 pr-10 text-left text-sm',
                            isSelected
                                ? 'bg-emerald-500/[0.14] font-semibold dark:bg-emerald-400/[0.14]'
                                : 'font-medium hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                        )}
                    >
                        <MessageCircle className="h-4 w-4 shrink-0 opacity-60" />
                        <span className="truncate" title={chat.name}>
                            {chat.name || 'Untitled chat'}
                        </span>
                    </button>
                    <button
                        type="button"
                        aria-label="options"
                        onClick={(e) => handleMenuOpen(e, chat.id)}
                        className={clsx(
                            'absolute right-1 top-1/2 -translate-y-1/2 rounded-lg p-1 text-zinc-500',
                            'transition-opacity max-xs:opacity-100 max-xs:pointer-events-auto',
                            'opacity-0 pointer-events-none xs:group-hover:opacity-100',
                            'xs:group-hover:pointer-events-auto',
                            'focus-visible:opacity-100 focus-visible:pointer-events-auto'
                        )}
                    >
                        <MoreVertical className="h-4 w-4" />
                    </button>
                </div>
            </li>
        )
    }

    const modalBackdrop = 'fixed inset-0 z-[1400] flex items-center justify-center bg-black/50 p-4'

    return (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="px-4 pb-3">
                <button
                    type="button"
                    onClick={() => onNavigateChat('new')}
                    className={clsx(
                        'flex w-full items-center justify-center gap-2 rounded-[10px] py-2.5',
                        'text-sm font-semibold text-white shadow-[0_6px_20px_-8px_rgba(16,185,129,0.5)]'
                    )}
                    style={{ backgroundImage: brandGradient }}
                >
                    <Plus className="h-5 w-5" />
                    New chat
                </button>
            </div>
            <div className="mx-4 h-px bg-slate-200/80 dark:bg-white/[0.06]" />
            <div className="min-h-0 flex-1 overflow-y-auto pb-4 pt-2">
                {chats.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-zinc-400">
                        Your chats will appear here.
                    </div>
                ) : (
                    grouped.map(([label, items]) => (
                        <div key={label} className="mb-2">
                            <span className="block px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-500">
                                {label}
                            </span>
                            <ul>{items.map(renderChatRow)}</ul>
                        </div>
                    ))
                )}
            </div>

            {menuOpen && (
                <>
                    <button
                        type="button"
                        className="fixed inset-0 z-[1290]"
                        aria-label="Close menu"
                        onClick={handleMenuClose}
                    />
                    <div
                        className="fixed z-[1300] min-w-[160px] rounded-xl border border-slate-200/80 bg-white py-1 shadow-lg dark:border-white/10 dark:bg-zinc-900"
                        style={{
                            top: menuPos.top,
                            left: menuPos.left
                        }}
                    >
                        <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
                            onClick={() => handleShareClick(selectedChat)}
                        >
                            <Share2 className="h-4 w-4 opacity-70" />
                            Share
                        </button>
                        <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
                            onClick={() => handleRenameClick(
                                selectedChat,
                                chats.find((c) => c.id === selectedChat)?.name || ''
                            )}
                        >
                            <Pencil className="h-4 w-4 opacity-70" />
                            Rename
                        </button>
                        <div className="my-1 h-px bg-slate-200 dark:bg-white/10" />
                        <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-500/10 dark:text-red-400"
                            onClick={() => handleDeleteClick(
                                selectedChat,
                                chats.find((c) => c.id === selectedChat)?.name || ''
                            )}
                        >
                            <Trash2 className="h-4 w-4 opacity-70" />
                            Delete
                        </button>
                    </div>
                </>
            )}

            {openShareDialog && (
                <div className={modalBackdrop}>
                    <div
                        role="dialog"
                        aria-labelledby="share-dialog-title"
                        className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-zinc-900"
                    >
                        <h2 id="share-dialog-title" className="text-lg font-semibold">
                            Share chat
                        </h2>
                        <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
                            Signed in users can read your chat history with this link:
                        </p>
                        <button
                            type="button"
                            className="mt-4 flex w-full justify-start overflow-hidden text-ellipsis whitespace-nowrap rounded-xl border border-slate-200 px-3 py-2 text-left text-sm dark:border-white/10"
                            onClick={() => navigator.clipboard.writeText(shareChatLink)}
                        >
                            {shareChatLink}
                        </button>
                        <button
                            type="button"
                            onClick={handleShareClose}
                            className={clsx(
                                'mt-4 w-full rounded-[10px] py-2.5 text-sm font-semibold text-white',
                                'bg-gradient-to-br from-emerald-700 via-emerald-500 to-emerald-400'
                            )}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {openRenameDialog && (
                <div className={modalBackdrop}>
                    <form
                        onSubmit={handleRenameSubmit}
                        className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-zinc-900"
                    >
                        <h2 id="rename-dialog-title" className="text-lg font-semibold">
                            Rename chat
                        </h2>
                        <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
                            Enter a new name for the chat
                        </p>
                        <input
                            required
                            autoFocus
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-800"
                        />
                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={handleRenameCancel}
                                className="rounded-[10px] px-4 py-2 text-sm font-medium text-slate-700 hover:bg-black/5 dark:text-zinc-300"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="rounded-[10px] px-4 py-2 text-sm font-semibold text-white"
                                style={{ backgroundImage: brandGradient }}
                            >
                                Rename
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {openDeleteDialog && (
                <div className={modalBackdrop}>
                    <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-zinc-900">
                        <h2 id="delete-dialog-title" className="text-lg font-semibold">
                            Delete chat?
                        </h2>
                        <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
                            This will permanently delete
                            {' '}
                            <strong>{deleteChatName || 'this chat'}</strong>
                            .
                        </p>
                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={handleDeleteCancel}
                                className="rounded-[10px] px-4 py-2 text-sm font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteConfirm}
                                className="rounded-[10px] bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Sidenav
