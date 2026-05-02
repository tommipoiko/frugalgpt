import React, { useEffect, useState } from 'react'
import {
    Route, Routes, useNavigate, useLocation
} from 'react-router-dom'
import {
    styled, ThemeProvider
} from '@mui/material/styles'
import {
    AppBar as MuiAppBar,
    Box,
    CssBaseline,
    Drawer,
    IconButton,
    Toolbar,
    Menu,
    MenuItem,
    Button,
    Tooltip,
    Avatar,
    Divider
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import MenuOpenIcon from '@mui/icons-material/MenuOpen'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import LoginIcon from '@mui/icons-material/Login'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import useMediaQuery from '@mui/material/useMediaQuery'
import { onAuthStateChanged } from 'firebase/auth'
import Signin from './components/Signin'
import User from './components/User'
import Signup from './components/Signup'
import Sidenav from './components/Sidenav'
import Chat from './components/Chat/Chat'
import BrandMark from './components/Brand/BrandMark'
import { auth } from './services/firebase'
import { buildAppTheme, brandGradient } from './theme'

const drawerWidth = 280

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
    ({ theme, open }) => ({
        flexGrow: 1,
        flexShrink: 1,
        minWidth: 0,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        padding: 0,
        paddingLeft: `max(${theme.spacing(3)}, env(safe-area-inset-left, 0px))`,
        paddingRight: `max(${theme.spacing(3)}, env(safe-area-inset-right, 0px))`,
        boxSizing: 'border-box',
        [theme.breakpoints.down('sm')]: {
            paddingLeft: `max(${theme.spacing(4)}, env(safe-area-inset-left, 0px))`,
            paddingRight: `max(${theme.spacing(4)}, env(safe-area-inset-right, 0px))`
        },
        transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen
        }),
        marginLeft: `-${drawerWidth}px`,
        ...(open && {
            transition: theme.transitions.create('margin', {
                easing: theme.transitions.easing.easeOut,
                duration: theme.transitions.duration.enteringScreen
            }),
            marginLeft: 0
        }),
        [theme.breakpoints.down('sm')]: {
            marginLeft: 0
        }
    })
)

const AppBar = styled(MuiAppBar, {
    shouldForwardProp: (prop) => prop !== 'open'
})(({ theme, open }) => ({
    paddingTop: 'env(safe-area-inset-top, 0px)',
    transition: theme.transitions.create(['margin', 'width'], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen
    }),
    ...(open && {
        width: `calc(100% - ${drawerWidth}px)`,
        marginLeft: `${drawerWidth}px`,
        transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.easeOut,
            duration: theme.transitions.duration.enteringScreen
        })
    })
}))

const TopbarSpacer = styled('div')(({ theme }) => ({
    minHeight: 'calc(56px + env(safe-area-inset-top, 0px))',
    [theme.breakpoints.up('sm')]: {
        minHeight: 'calc(64px + env(safe-area-inset-top, 0px))'
    }
}))

function App() {
    const [user, setUser] = useState(
        () => JSON.parse(localStorage.getItem('frugalGptUser')) || null
    )
    const [anchorEl, setAnchorEl] = useState(null)
    const [open, setOpen] = useState(() => localStorage.getItem('frugalGptSidenav') !== 'false')
    const [mode, setMode] = useState(() => localStorage.getItem('frugalGptTheme') || 'system')
    const [currentChat, setCurrentChat] = useState(null)
    const navigate = useNavigate()
    const location = useLocation()
    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)')

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

    const getThemeMode = () => {
        if (mode === 'dark') return 'dark'
        if (mode === 'light') return 'light'
        return prefersDarkMode ? 'dark' : 'light'
    }

    const themeConfig = buildAppTheme(getThemeMode())
    const isMobile = useMediaQuery(themeConfig.breakpoints.down('sm'))

    const handleUserClick = (event) => {
        setAnchorEl(event.currentTarget)
    }

    const handleMenuClose = () => {
        setAnchorEl(null)
    }

    const handleSettings = () => {
        setAnchorEl(null)
        navigate('/user')
    }

    const handleSignOut = async () => {
        setAnchorEl(null)
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

    return (
        <ThemeProvider theme={themeConfig}>
            <CssBaseline enableColorScheme />
            <Box
                sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 0,
                    height: '100%',
                    width: '100%',
                    maxWidth: '100%',
                    overflow: 'hidden'
                }}
            >
                <AppBar position="fixed" open={open && !isMobile}>
                    <Toolbar
                        sx={{
                            gap: 1,
                            pl: {
                                xs: 'max(32px, env(safe-area-inset-left, 0px))',
                                sm: 2
                            },
                            pr: {
                                xs: 'max(32px, env(safe-area-inset-right, 0px))',
                                sm: 3
                            }
                        }}
                    >
                        <Tooltip title={open ? 'Hide sidebar' : 'Show sidebar'}>
                            <IconButton
                                color="inherit"
                                aria-label="toggle drawer"
                                onClick={toggleDrawer}
                                edge="start"
                            >
                                {open ? <MenuOpenIcon /> : <MenuIcon />}
                            </IconButton>
                        </Tooltip>
                        <Box
                            sx={{
                                display: { xs: 'flex', sm: open ? 'none' : 'flex' },
                                alignItems: 'center'
                            }}
                        >
                            <BrandMark size={26} />
                        </Box>
                        <Box sx={{ flexGrow: 1 }} />
                        <Tooltip title="New chat">
                            <IconButton
                                color="inherit"
                                aria-label="new chat"
                                onClick={handleNewChat}
                            >
                                <AddRoundedIcon />
                            </IconButton>
                        </Tooltip>
                        {user ? (
                            <>
                                <IconButton
                                    aria-label="account of current user"
                                    aria-controls="menu-appbar"
                                    aria-haspopup="true"
                                    onClick={handleUserClick}
                                    color="inherit"
                                    sx={{ ml: 0.5 }}
                                >
                                    <Avatar
                                        sx={{
                                            width: 30,
                                            height: 30,
                                            fontSize: '0.85rem',
                                            fontWeight: 600,
                                            color: 'common.white',
                                            backgroundImage: brandGradient
                                        }}
                                    >
                                        {userInitial}
                                    </Avatar>
                                </IconButton>
                                <Menu
                                    id="menu-appbar"
                                    anchorEl={anchorEl}
                                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                    keepMounted
                                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                                    open={Boolean(anchorEl)}
                                    onClose={handleMenuClose}
                                >
                                    <MenuItem
                                        onClick={handleSettings}
                                        sx={{ minWidth: 180, gap: 1.25 }}
                                    >
                                        <SettingsOutlinedIcon fontSize="small" />
                                        Settings
                                    </MenuItem>
                                    <Divider sx={{ my: 0.5 }} />
                                    <MenuItem
                                        onClick={handleSignOut}
                                        sx={{ minWidth: 180, gap: 1.25 }}
                                    >
                                        <LogoutOutlinedIcon fontSize="small" />
                                        Sign out
                                    </MenuItem>
                                </Menu>
                            </>
                        ) : (
                            <Button
                                variant="contained"
                                startIcon={<LoginIcon />}
                                onClick={() => navigate('/signin')}
                            >
                                Sign in
                            </Button>
                        )}
                    </Toolbar>
                </AppBar>
                <Box
                    sx={{
                        display: 'flex',
                        flex: 1,
                        minHeight: 0,
                        width: '100%',
                        maxWidth: '100%',
                        overflow: 'hidden'
                    }}
                >
                    <Drawer
                        sx={{
                            width: drawerWidth,
                            flexShrink: 0,
                            '& .MuiDrawer-paper': {
                                width: drawerWidth,
                                boxSizing: 'border-box',
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden',
                                ...(isMobile && {
                                    width: '100%',
                                    maxWidth: '100%',
                                    height: '100vh',
                                    maxHeight: '100vh'
                                })
                            }
                        }}
                        variant={isMobile ? 'temporary' : 'persistent'}
                        anchor="left"
                        open={open}
                        onClose={() => setOpen(false)}
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                px: 2,
                                py: 1.5,
                                minHeight: 64
                            }}
                        >
                            <BrandMark size={26} />
                            <Tooltip title="Hide sidebar">
                                <IconButton onClick={toggleDrawer} size="small">
                                    <MenuOpenIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </Box>
                        <Sidenav
                            user={user}
                            onNavigateChat={handleNavigateChat}
                            currentChatId={currentChat}
                        />
                    </Drawer>
                    <Main open={open && !isMobile}>
                        <TopbarSpacer />
                        <Box
                            sx={{
                                flex: 1,
                                minHeight: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden',
                                width: '100%'
                            }}
                        >
                            <Routes>
                                <Route path="/" element={<Chat currentChat={currentChat} />} />
                                <Route path="/signin" element={<Signin />} />
                                <Route path="/signup" element={<Signup />} />
                                <Route path="/user" element={<User setMode={setMode} />} />
                                <Route
                                    path="/chats/:id"
                                    element={<Chat currentChat={currentChat} />}
                                />
                            </Routes>
                        </Box>
                    </Main>
                </Box>
            </Box>
        </ThemeProvider>
    )
}

export default App
