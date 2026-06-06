import React, {
    useEffect, useRef, useState
} from 'react'
import {
    Route, Routes, useNavigate, useLocation
} from 'react-router-dom'
import {
    Menu as MenuIcon,
    Plus,
    Settings,
    LogOut,
    LogIn,
    PanelLeftClose
} from 'lucide-react'
import clsx from 'clsx'
import { onAuthStateChanged } from 'firebase/auth'
import Signin from './components/Signin'
import User from './components/User'
import Signup from './components/Signup'
import Sidenav from './components/Sidenav'
import Chat from './components/Chat/Chat'
import BrandMark from './components/Brand/BrandMark'
import { auth } from './services/firebase'
import { brandGradient } from './theme'
import useIsMobile from './hooks/useIsMobile'

function App() {
    const [user, setUser] = useState(
        () => JSON.parse(localStorage.getItem('frugalGptUser')) || null
    )
    const [userMenuOpen, setUserMenuOpen] = useState(false)
    const userMenuRef = useRef(null)
    const [open, setOpen] = useState(() => localStorage.getItem('frugalGptSidenav') !== 'false')
    const [mode, setMode] = useState(() => localStorage.getItem('frugalGptTheme') || 'system')
    const [currentChat, setCurrentChat] = useState(null)
    const [prefersDark, setPrefersDark] = useState(false)
    const navigate = useNavigate()
    const location = useLocation()
    const isMobile = useIsMobile()

    useEffect(() => {
        const mq = window.matchMedia('(prefers-color-scheme: dark)')
        const sync = () => setPrefersDark(mq.matches)
        sync()
        mq.addEventListener('change', sync)
        return () => mq.removeEventListener('change', sync)
    }, [])

    const resolvedDark = mode === 'dark' || (mode === 'system' && prefersDark)

    useEffect(() => {
        document.documentElement.classList.toggle('dark', resolvedDark)
    }, [resolvedDark])

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            const redirectPaths = ['chats', 'user']
            if (!currentUser && redirectPaths.includes(location.pathname.split('/')[1])) {
                const intendedPath = location.pathname
                navigate(`/signin?redirect=${encodeURIComponent(intendedPath)}`)
            } else {
                setUser(currentUser)
                localStorage.setItem('frugalGptUser', JSON.stringify(currentUser))
            }
        })

        return () => unsubscribe()
    }, [location, navigate])

    useEffect(() => {
        const closeOnOutside = (e) => {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
                setUserMenuOpen(false)
            }
        }
        document.addEventListener('mousedown', closeOnOutside)
        return () => document.removeEventListener('mousedown', closeOnOutside)
    }, [])

    const handleSignOut = async () => {
        setUserMenuOpen(false)
        auth.signOut()
        setUser(null)
        localStorage.removeItem('frugalGptUser')
        navigate('/signin')
    }

    const toggleDrawer = () => {
        setOpen((prev) => {
            const next = !prev
            localStorage.setItem('frugalGptSidenav', String(next))
            return next
        })
    }

    const closeDrawerOnMobile = () => {
        if (isMobile) {
            setOpen(false)
            localStorage.setItem('frugalGptSidenav', 'false')
        }
    }

    const openUserPage = () => {
        setUserMenuOpen(false)
        closeDrawerOnMobile()
        navigate('/user')
    }

    const handleNewChat = () => {
        setCurrentChat(null)
        navigate('/')
        closeDrawerOnMobile()
    }

    const handleNavigateChat = (id) => {
        if (id === 'new') {
            handleNewChat()
            return
        }
        setCurrentChat(id)
        navigate(`/chats/${id}`)
        closeDrawerOnMobile()
    }

    const userInitial = (user?.email || user?.displayName || '?')
        .trim()
        .charAt(0)
        .toUpperCase()

    const showHeaderDrawerToggle = !open || isMobile
    const desktopDrawerVisible = !isMobile && open

    const drawerInner = (
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <div className="flex shrink-0 items-center justify-end px-4 py-3 min-h-16 border-b border-slate-200/60 dark:border-white/[0.06]">
                <button
                    type="button"
                    onClick={toggleDrawer}
                    className="rounded-lg p-2 text-zinc-600 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/10"
                    aria-label="Hide sidebar"
                >
                    <PanelLeftClose className="h-5 w-5" />
                </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <Sidenav
                    user={user}
                    onNavigateChat={handleNavigateChat}
                    currentChatId={currentChat}
                />
            </div>
        </div>
    )

    return (
        <div className="flex flex-1 flex-col min-h-0 h-full w-full max-w-full overflow-hidden">
            <header
                className={clsx(
                    'shrink-0 z-[1300] box-border pt-[env(safe-area-inset-top)]',
                    'border-b border-slate-900/[0.06] dark:border-white/[0.06]',
                    'bg-[#f7f7f8]/95 dark:bg-[#0b0b0f]/95 backdrop-blur-xl',
                    'xs:bg-[#f7f7f8] xs:backdrop-blur-none dark:xs:bg-[#0b0b0f]'
                )}
            >
                <div
                    className={clsx(
                        'flex items-center gap-2 min-h-14',
                        'pl-[max(32px,env(safe-area-inset-left))] pr-[max(32px,env(safe-area-inset-right))]',
                        'sm:pl-4 sm:pr-6'
                    )}
                >
                    {showHeaderDrawerToggle && (
                        <button
                            type="button"
                            onClick={toggleDrawer}
                            className="rounded-lg p-2 text-inherit hover:bg-black/5 dark:hover:bg-white/10"
                            aria-label="Open sidebar"
                        >
                            <MenuIcon className="h-6 w-6" />
                        </button>
                    )}
                    <div className="flex items-center">
                        <BrandMark size={26} />
                    </div>
                    <div className="flex-1" />
                    <button
                        type="button"
                        onClick={handleNewChat}
                        className="rounded-lg p-2 text-inherit hover:bg-black/5 dark:hover:bg-white/10"
                        aria-label="new chat"
                    >
                        <Plus className="h-6 w-6" />
                    </button>
                    {user ? (
                        <div className="relative ml-1" ref={userMenuRef}>
                            <button
                                type="button"
                                onClick={() => setUserMenuOpen((v) => !v)}
                                aria-expanded={userMenuOpen}
                                aria-haspopup="menu"
                                className="flex h-[30px] w-[30px] items-center justify-center rounded-full text-xs font-semibold text-white"
                                style={{ backgroundImage: brandGradient }}
                            >
                                {userInitial}
                            </button>
                            {userMenuOpen && (
                                <div
                                    role="menu"
                                    className={clsx(
                                        'absolute right-0 top-full z-[1310] mt-1.5 min-w-[180px] rounded-xl py-1',
                                        'border border-slate-200/80 bg-white shadow-menu dark:border-white/10 dark:bg-zinc-900'
                                    )}
                                >
                                    <button
                                        type="button"
                                        role="menuitem"
                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
                                        onClick={openUserPage}
                                    >
                                        <Settings className="h-4 w-4 shrink-0 opacity-70" />
                                        Settings
                                    </button>
                                    <div className="my-1 h-px bg-slate-200 dark:bg-white/10" />
                                    <button
                                        type="button"
                                        role="menuitem"
                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
                                        onClick={handleSignOut}
                                    >
                                        <LogOut className="h-4 w-4 shrink-0 opacity-70" />
                                        Sign out
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={openUserPage}
                            aria-label="Sign in"
                            className={clsx(
                                isMobile
                                    ? 'rounded-lg p-2 text-inherit hover:bg-black/5 dark:hover:bg-white/10'
                                    : [
                                        'ml-2 inline-flex items-center gap-2 rounded-[10px] px-4 py-2',
                                        'text-sm font-semibold text-white shadow-none',
                                        'bg-gradient-to-br from-emerald-700 via-emerald-500 to-emerald-400',
                                        'hover:brightness-105'
                                    ]
                            )}
                        >
                            <LogIn className={isMobile ? 'h-6 w-6' : 'h-4 w-4'} />
                            {!isMobile && 'Sign in'}
                        </button>
                    )}
                </div>
            </header>

            <div className="flex flex-1 min-h-0 w-full max-w-full overflow-hidden relative">
                {!isMobile && desktopDrawerVisible && (
                    <aside
                        className={clsx(
                            'fixed inset-y-0 left-0 z-[1250] flex w-[280px] flex-col overflow-hidden',
                            'border-r border-slate-200/60 bg-[#fafafb] shadow-xl',
                            'dark:border-white/[0.06] dark:bg-[#0e0e13]'
                        )}
                    >
                        {drawerInner}
                    </aside>
                )}

                {isMobile && open && (
                    <button
                        type="button"
                        className="fixed inset-0 z-[1240] bg-black/40"
                        aria-label="Close menu"
                        onClick={() => setOpen(false)}
                    />
                )}

                {isMobile && (
                    <aside
                        className={clsx(
                            'fixed inset-0 z-[1250] flex w-full max-w-full flex-col overflow-x-hidden overflow-y-hidden overscroll-x-none',
                            'border-r border-slate-200/60 bg-[#fafafb] shadow-xl transition-transform duration-200 ease-out',
                            'dark:border-white/[0.06] dark:bg-[#0e0e13]',
                            open ? 'translate-x-0' : '-translate-x-full pointer-events-none'
                        )}
                    >
                        {drawerInner}
                    </aside>
                )}

                <main
                    className={clsx(
                        'flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden',
                        'pl-[max(12px,env(safe-area-inset-left))] pr-[max(12px,env(safe-area-inset-right))]',
                        'xs:pl-8 xs:pr-8'
                    )}
                    style={{
                        marginLeft: desktopDrawerVisible ? '280px' : undefined
                    }}
                >
                    <div className="flex flex-1 flex-col min-h-0 overflow-hidden w-full">
                        <Routes>
                            <Route path="/" element={<Chat currentChat={currentChat} />} />
                            <Route path="/signin" element={<Signin />} />
                            <Route path="/signup" element={<Signup />} />
                            <Route
                                path="/user"
                                element={<User setMode={setMode} />}
                            />
                            <Route
                                path="/chats/:id"
                                element={<Chat currentChat={currentChat} />}
                            />
                        </Routes>
                    </div>
                </main>
            </div>

        </div>
    )
}

export default App
